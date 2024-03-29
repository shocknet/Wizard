import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import localForage from 'localforage';
import { ipcRenderer } from 'electron';
import logger from 'electron-log';
import Http from 'axios';
import Downloader from './downloader';
import { getFolderPath, getDataDir, getUserPlatform, getUserArchitecture } from './os';

const regexExpressions = {
  blockHeightLength: {
    regex: /(?:Syncing to block height)\s([0-9])+/g,
    phrases: ['Syncing to block height'],
    replace: ['Syncing to block height '],
    key: 'downloadedBlockHeightsLength',
  },
  currentHeight: {
    regex: /(?:\(height\s)([0-9])+/g,
    phrases: ['Verified', 'filter headers in the last'],
    replace: ['(height '],
    key: 'downloadedBlocks',
    condition: (downloadedBlocks, downloadedBlockHeightsLength) =>
      downloadedBlocks !== downloadedBlockHeightsLength || downloadedBlocks === 0,
  },
  syncedBlocks: {
    phrases: ['Fully caught up with cfheaders at height'],
    key: 'downloadedBlocks',
    value: async () => localForage.getItem('downloadedBlockHeightsLength'),
  },
  walletLocked: {
    phrases: ['Waiting for wallet encryption password'],
    key: 'walletUnlocked',
    value: () => false,
  },
  walletUnlocked: {
    phrases: ['Opened wallet'],
    key: 'walletUnlocked',
    value: () => true,
  },
};

let child = null;
let dataListener = null;

const getLndDirectory = () => {
  const platform = os.platform();
  const homeDir = os.homedir();
  if (platform.toLowerCase() === 'darwin') {
    return `${homeDir}/Library/Application Support/Lnd`;
  }

  if (platform.toLowerCase() === 'linux') {
    return `${homeDir}/.lnd`;
  }

  return path.resolve(process.env.APPDATA, '../Local/Lnd');
};

const lndDirectory = getLndDirectory();

const getLatestRelease = async ({ user, repo, os: operatingSystem }) => {
  try {
    const arch = await getUserArchitecture();
    const { data } = await Http.get(`https://api.github.com/repos/${user}/${repo}/releases/latest`);
    const [currentBuild] = data.assets.filter((asset) =>
      asset.name.includes(`${operatingSystem}-${arch}`)
    );

    return {
      tag: data.tag_name,
      currentBuild: currentBuild.browser_download_url,
      fileName: currentBuild.name,
    };
  } catch (err) {
    logger.error(err);
    return localForage.getItem('lnd-version');
  }
};

const getLNDVersion = () =>
  new Promise((resolve, reject) => {
    const lndExe = path.resolve(folderPath, 'lnd', `lnd${os.platform() === 'win32' ? '.exe' : ''}`);
    child = spawn(lndExe, ['--version']);
    ipcRenderer.send('lndPID', child.pid);
    child.stdout.on('data', (data) => {
      resolve(data.split('commit=')[1]);
    });
    child.stderr.on('error', (error) => {
      reject('An error occurred');
    });
    setTimeout(() => {
      resolve(null);
      child?.kill();
    }, 5000);
  });

const getLNDOutdated = async (currentVersion) => {
  try {
    const LNDVersion = await localForage.getItem('lnd-version');
    const parsedVersion = LNDVersion ?? '0.0.0';
    logger.log('LND Version:', LNDVersion);
    logger.log('Target LND Version:', currentVersion);

    return !parsedVersion.includes(currentVersion);
  } catch (err) {
    return true;
  }
};

const download = async ({ version, os: operatingSystem }, progressCallback) => {
  logger.info('Downloading LND...');
  const repo = 'lnd';
  const user = 'shocknet';
  const folderPath = await getFolderPath();
  const LNDExists = operatingSystem.startsWith('win')
    ? fs.existsSync(path.resolve(folderPath, 'lnd', 'lnd.exe'))
    : fs.existsSync(path.resolve(folderPath, 'lnd', 'lnd'));
  const LNDRelease = await getLatestRelease({ user, repo, os: operatingSystem });

  const LNDOutdated = await (LNDExists ? getLNDOutdated(LNDRelease.tag) : null);
  if (LNDOutdated || !LNDExists) {
    logger.info(!LNDExists ? "LND doesn't exist" : 'LND is outdated, updating...');
    await localForage.setItem('lnd-version', LNDRelease.tag);
    logger.info('Saved LND Version updated:', 'lnd-version', LNDRelease.tag);
    await Downloader.downloadRelease(
      { url: LNDRelease.currentBuild, fileName: LNDRelease.fileName, repo, update: LNDOutdated },
      progressCallback
    );
    return true;
  }
  logger.info('LND already exists');
  progressCallback({
    app: 'lnd',
    progress: 100,
  });
};

const getStatuses = async () => {
  const keys = await localForage.keys();
  const statuses = await Promise.all(
    keys.map(async (key) => ({
      [key]: await localForage.getItem(key),
    }))
  );
  return statuses.reduce(
    (collectedStatuses, status) => ({
      ...collectedStatuses,
      ...status,
    }),
    {}
  );
};

const setStatus = async (key, value) => {
  await localForage.setItem(key, value);
  ipcRenderer.send('statusUpdate', await getStatuses());
  return value;
};

const getChild = () => {
  return child;
};

const processLine = async (line) => {
  await Promise.all(
    Object.entries(regexExpressions).map(async ([key, conditions]) => {
      const downloadedBlockHeightsLength = await localForage.getItem(
        'downloadedBlockHeightsLength'
      );
      if (conditions.phrases) {
        const unmatchedPhrases = conditions.phrases.filter((phrase) => !line.includes(phrase))[0];
        if (unmatchedPhrases) {
          return false;
        }
      }

      if (conditions.condition) {
        if (key === 'currentHeight') {
          const downloadedBlocks = await localForage.getItem('downloadedBlocks');
          const matched = conditions.condition(downloadedBlocks, downloadedBlockHeightsLength);
          if (!matched) {
            return false;
          }
        }
      }

      if (conditions.regex) {
        const matchedRegex = line.match(conditions.regex);

        if (matchedRegex && matchedRegex.length > 0) {
          const value = conditions.replace.reduce(
            (conditionValue, replaceValue) => conditionValue.replace(replaceValue, ''),
            matchedRegex[0]
          );
          await setStatus(conditions.key, parseInt(value, 10));
          if (key === 'currentHeight' && downloadedBlockHeightsLength === value) {
            const walletUnlocked = await localForage.getItem('walletUnlocked');
            // eslint-disable-next-line no-new
            new Notification('Network sync is complete!', {
              body: `Node has completed initial sync with the Bitcoin network! ${
                walletUnlocked ? '' : 'Connect with My.Lightning.Page to interact with it'
              }`,
            });
          }
          return { key: conditions.key, value };
        }
        return false;
      }

      if (conditions.value) {
        const value = await conditions.value();
        await setStatus(conditions.key, value);
        if (key === 'syncedBlocks') {
          const [walletUnlocked, networkType, dataDir, useTunnel] = await Promise.all([
            localForage.getItem('walletUnlocked'),
            localForage.getItem('networkType'),
            getDataDir(),
            localForage.getItem('useTunnel'),
          ]);

          // eslint-disable-next-line no-new
          new Notification('Network sync is complete!', {
            body: `Node has completed initial sync with the Bitcoin network! ${
              walletUnlocked ? '' : 'Connect with My.Lightning.Page to interact with it'
            }`,
          });

          const serverConfig = {
            serverhost: '0.0.0.0',
            lndCertPath: `${lndDirectory}/tls.cert`,
            macaroonPath: `${dataDir}/chain/bitcoin/mainnet/admin.macaroon`,
            mainnet: true,
            rootPath: await ipcRenderer.invoke('getUserData'),
          };
          if (useTunnel === 'yes') {
            serverConfig.tunnel = true;
          }

          logger.info('ShockAPI Settings:', serverConfig);

          ipcRenderer.invoke('startServer', serverConfig);
        } else if (key === 'walletUnlocked') {
          const downloadedBlocks = await localForage.getItem('downloadedBlocks');
          // eslint-disable-next-line no-new
          new Notification('Wallet is successfully unlocked!', {
            body: `The LND instance is now unlocked! ${
              downloadedBlocks >= downloadedBlockHeightsLength
                ? ''
                : 'Please wait while the node syncs with the Bitcoin network'
            }`,
          });
          if (downloadedBlocks >= downloadedBlockHeightsLength) {
            const [networkType, dataDir] = await Promise.all([
              localForage.getItem('networkType'),
              getDataDir(),
            ]);
            const serverConfig = {
              serverhost: '0.0.0.0',
              lndCertPath: `${lndDirectory}/tls.cert`,
              macaroonPath: `${dataDir}/chain/bitcoin/${
                networkType ? networkType : 'testnet'
              }/admin.macaroon`,
            };
            // ipcRenderer.send('startServer', serverConfig);
          }
        }
        return { key: conditions.key, value };
      }
    })
  );
  if (dataListener) {
    dataListener(line);
  }
};

const start = async () => {
  const folderPath = await getFolderPath();
  const os = getUserPlatform();
  const lndExe = path.resolve(folderPath, 'lnd', `lnd${os === 'windows' ? '.exe' : ''}`);
  const networkType = await localForage.getItem('networkType');
  const networkUrl = await localForage.getItem('networkUrl');
  const lndType = (await localForage.getItem('lndType')) || 'neutrino';
  const dataDir = await getDataDir();
  child = spawn(lndExe, [
    '--bitcoin.active',
    '--accept-keysend',
    '--routing.assumechanvalid',
    '--allow-circular-route',
    `--bitcoin.${networkType || 'mainnet'}`,
    '--debuglevel=info',
    `--bitcoin.node=${lndType}`,
    `--datadir=${dataDir}`,
    ...(lndType === 'bitcoind'
      ? [
          `--bitcoind.dir=${dataDir}`,
          '--bitcoind.zmqpubrawtx=tcp://127.0.0.1:28333',
          '--bitcoind.zmqpubrawblock=tcp://127.0.0.1:28332',
          '--bitcoind.rpcuser=test',
          '--bitcoind.rpcpass=test',
          '--bitcoind.rpchost=localhost',
        ]
      : [`--neutrino.connect=${networkUrl}`]),
    '--feeurl=https://nodes.lightning.computer/fees/v1/btc-fee-estimates.json',
  ]);
  ipcRenderer.send('lndPID', child.pid);
  child.stdout.on('data', (data) => {
    const line = data.toString();
    processLine(line);
  });
  child.stderr.on('data', (data) => {
    logger.error(data.toString());
    const error = data.toString().split(':');
    // eslint-disable-next-line no-new
    new Notification('LND Error', {
      body: error.length > 1 ? error.slice(1, error.length).join(':') : error[0],
    });
  });
};

const terminate = () => {
  if (child) {
    child.kill('SIGTERM');
  }
};

const onData = (callback) => {
  dataListener = callback;
};

const offData = () => {
  dataListener = null;
};

export default {
  download,
  start,
  getChild,
  terminate,
  onData,
  offData,
};
