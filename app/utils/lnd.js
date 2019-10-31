import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import localForage from 'localforage';
import { ipcRenderer } from 'electron';
import server from 'sw-server';
import Downloader from './downloader';
import { getFolderPath, getDataDir, getUserPlatform } from './os';

const regexExpressions = {
  blockHeightLength: {
    regex: /(?:Syncing to block height)\s([0-9])+/g,
    phrases: ['Syncing to block height'],
    replace: ['Syncing to block height '],
    key: 'downloadedBlockHeightsLength'
  },
  currentHeight: {
    regex: /(?:\(height\s)([0-9])+/g,
    phrases: ['Verified', 'filter headers in the last'],
    replace: ['(height '],
    key: 'downloadedBlocks',
    condition: (downloadedBlocks, downloadedBlockHeightsLength) =>
      downloadedBlocks !== downloadedBlockHeightsLength || downloadedBlocks === 0
  },
  syncedBlocks: {
    phrases: ['Fully caught up with cfheaders at height'],
    key: 'downloadedBlocks',
    value: async () => localForage.getItem('downloadedBlockHeightsLength')
  },
  walletLocked: {
    phrases: ['Waiting for wallet encryption password'],
    key: 'walletUnlocked',
    value: () => false
  },
  walletUnlocked: {
    phrases: ['Opened wallet'],
    key: 'walletUnlocked',
    value: () => true
  }
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

  return path.resolve(process.env.APPDATA, '../Local/Lnd'); // Windows not implemented yet
};

const lndDirectory = getLndDirectory();

const download = async ({ version, os: operatingSystem }, progressCallback) => {
  const folderPath = await getFolderPath();
  const fileName = `lnd-${operatingSystem}-amd64-${version}.${
    operatingSystem === 'linux' ? 'tar.gz' : 'zip'
  }`;
  if (!fs.existsSync(path.resolve(folderPath, 'lnd'))) {
    await Downloader.downloadRelease(
      {
        version,
        user: 'lightningnetwork',
        repo: 'lnd',
        fileName
      },
      progressCallback
    );
    return true;
  }
  progressCallback({
    app: 'lnd',
    progress: 100
  });
};

const getStatuses = async () => {
  const keys = await localForage.keys();
  const statuses = await Promise.all(
    keys.map(async key => ({
      [key]: await localForage.getItem(key)
    }))
  );
  return statuses.reduce(
    (collectedStatuses, status) => ({
      ...collectedStatuses,
      ...status
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

const processLine = async line => {
  if (dataListener) {
    dataListener(line);
  }
  await Promise.all(
    Object.entries(regexExpressions).map(async ([key, conditions]) => {
      const downloadedBlockHeightsLength = await localForage.getItem(
        'downloadedBlockHeightsLength'
      );
      if (conditions.phrases) {
        const unmatchedPhrases = conditions.phrases.filter(phrase => !line.includes(phrase))[0];
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
            new Notification('LND is synced up!', {
              body: `The LND instance is fully synced up with the bitcoin network! ${
                walletUnlocked ? '' : 'Please unlock your wallet to interact with it'
              }`
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
          const walletUnlocked = await localForage.getItem('walletUnlocked');
          const networkType = await localForage.getItem('networkType');
          const dataDir = await getDataDir();
          // eslint-disable-next-line no-new
          new Notification('LND is synced up!', {
            body: `The LND instance is fully synced up with the bitcoin network! ${
              walletUnlocked ? '' : 'Please unlock your wallet to interact with it'
            }`
          });
          // ipcRenderer.send('startServer', {
          //   serverhost: '0.0.0.0',
          //   lndCertPath: `${lndDirectory}/tls.cert`,
          //   macaroonPath: `${dataDir}/chain/bitcoin/${networkType}/admin.macaroon`
          // });
          // await server({
          //   serverhost: '0.0.0.0',
          //   lndCertPath: `${lndDirectory}/tls.cert`,
          //   macaroonPath: `${dataDir}/chain/bitcoin/${networkType}/admin.macaroon`
          // });
          console.log(
            'ShockAPI Macaroon Path:',
            `${dataDir}/chain/bitcoin/${networkType}/admin.macaroon`
          );
        } else if (key === 'walletUnlocked') {
          const downloadedBlocks = await localForage.getItem('downloadedBlocks');
          // eslint-disable-next-line no-new
          new Notification('Wallet is successfully unlocked!', {
            body: `The LND instance is now unlocked! ${
              downloadedBlocks >= downloadedBlockHeightsLength
                ? ''
                : 'Please wait until the LND instance fully syncs up'
            }`
          });
          // if (downloadedBlocks >= downloadedBlockHeightsLength) {
          //   server({
          //     serverhost: '0.0.0.0',
          //     lndCertPath: lndDirectory + '/tls.cert'
          //   });
          // }
        }
        return { key: conditions.key, value };
      }
    })
  );
};

const start = async () => {
  const folderPath = await getFolderPath();
  const os = getUserPlatform();
  const lndExe = path.resolve(folderPath, 'lnd', `lnd${os !== 'linux' ? '.exe' : ''}`);
  const networkType = await localForage.getItem('networkType');
  const networkUrl = await localForage.getItem('networkUrl');
  const lndType = (await localForage.getItem('lndType')) || 'neutrino';
  const dataDir = await getDataDir();
  child = spawn(lndExe, [
    '--bitcoin.active',
    `--bitcoin.${networkType || 'testnet'}`,
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
          '--bitcoind.rpchost=localhost'
        ]
      : [`--neutrino.connect=${networkUrl}`])
  ]);
  ipcRenderer.send('lndPID', child.pid);
  ipcRenderer.send('startServer', {
    serverhost: '0.0.0.0',
    lndCertPath: `${lndDirectory}/tls.cert`,
    macaroonPath: `${dataDir}/chain/bitcoin/${networkType}/admin.macaroon`
  });
  child.stdout.on('data', data => {
    const line = data.toString();
    processLine(line);
  });
  child.stderr.on('data', data => {
    console.error(data.toString());
    const error = data.toString().split(':');
    // eslint-disable-next-line no-new
    new Notification('LND Error', {
      body: error.length > 1 ? error.slice(1, error.length).join(':') : error[0]
    });
  });
};

const terminate = () => {
  if (child) {
    child.kill('SIGINT');
  }
};

const onData = callback => {
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
  offData
};
