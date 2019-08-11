import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import localForage from 'localforage';
import { ipcRenderer } from 'electron';
import Downloader from './downloader';
import { getFolderPath } from './os';

const regexExpressions = {
  progress: {
    regex: /(?:progress=)([0-9.])+/g,
    phrases: ['UpdateTip'],
    replace: ['progress='],
    key: 'progress',
    default: 0
  }
};

let child = null;

const download = async ({ version, os }) => {
  const folderPath = await getFolderPath();
  const fileName = `bitcoin-${version}-${os}.zip`;
  if (!fs.existsSync(path.resolve(folderPath, 'bitcoind'))) {
    await Downloader.downloadFile({
      downloadUrl: `https://bitcoincore.org/bin/bitcoin-core-${version}/${fileName}`,
      fileName: 'bitcoind',
      extractedFolderName: `bitcoin-${version}`
    });
    return true;
  }
};

const getStatuses = async () => {
  const keys = await localForage.keys();
  const statuses = await Promise.all(
    keys.map(async key => ({
      [key]: await localForage.getItem(key)
    }))
  );
  return statuses.reduce(
    (keys, status) => ({
      ...keys,
      ...status
    }),
    {}
  );
};

const resetStatus = async () => {
  await Promise.all([
    localForage.setItem('bitcoind_downloadedBlockHeightsLength', 0),
    localForage.setItem('bitcoind_downloadedBlocks', 0),
    localForage.setItem('bitcoind_syncedBlocks', 0),
    localForage.setItem('bitcoind_walletUnlocked', null)
  ]);
  return true;
};

const setStatus = async (key, value) => {
  await localForage.setItem(`bitcoind_${key}`, value);
  ipcRenderer.send('bitcoindStatusUpdate', await getStatuses());
  return value;
};

const incrementStatus = async (key, value) => {
  const status = await localForage.getItem(`bitcoind_${key}`);
  await setStatus(`bitcoind_${key}`, parseFloat(status) + parseFloat(value));
};

const processLine = async line => {
  const matches = await Promise.all(
    Object.entries(regexExpressions).map(async ([key, conditions]) => {
      const downloadedBlockHeightsLength = await localForage.getItem(
        'bitcoind_downloadedBlockHeightsLength'
      );
      if (conditions.phrases) {
        const unmatchedPhrases = conditions.phrases.filter(
          phrase => !line.includes(phrase)
        )[0];
        if (unmatchedPhrases) {
          return false;
        }
      }

      if (conditions.regex) {
        const matchedRegex = line.match(conditions.regex);

        if (matchedRegex && matchedRegex.length > 0) {
          const value = conditions.replace.reduce(
            (value, replaceValue) => value.replace(replaceValue, ''),
            matchedRegex[0]
          );
          await setStatus(conditions.key, parseFloat(value, 10));
          return { key: conditions.key, value };
        }
        return false;
      }

      if (conditions.value) {
        const value = await conditions.value();
        await setStatus(conditions.key, value);
        if (key === 'syncedBlocks') {
          const walletUnlocked = await localForage.getItem(
            'bitcoind_walletUnlocked'
          );
          // eslint-disable-next-line no-new
          new Notification('LND is synced up!', {
            body: `The LND instance is fully synced up with the bitcoin network! ${
              walletUnlocked
                ? ''
                : 'Please unlock your wallet to interact with it'
            }`
          });
        } else if (key === 'walletUnlocked') {
          const downloadedBlocks = await localForage.getItem(
            'bitcoind_downloadedBlocks'
          );
          // eslint-disable-next-line no-new
          new Notification('Wallet is successfully unlocked!', {
            body: `The LND instance is now unlocked! ${
              downloadedBlocks >= downloadedBlockHeightsLength
                ? ''
                : 'Please wait until the LND instance fully syncs up'
            }`
          });
        }
        return { key: conditions.key, value };
      }
    })
  );
};

const start = async () => {
  const folderPath = await getFolderPath();
  const bitcoindExe = path.resolve(
    folderPath,
    'bitcoind',
    'bin',
    'bitcoind.exe'
  );
  const dataDir = path.resolve(folderPath, 'bitcoind', 'data');
  const networkType = await localForage.getItem('networkType');
  const lndType = await localForage.getItem('lndType');
  if (lndType !== 'bitcoind') {
    return;
  }
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  child = spawn(bitcoindExe, [
    `--testnet=${networkType === 'mainnet' ? 0 : 1}`,
    `--datadir=${dataDir}`
  ]);
  ipcRenderer.send('bitcoindPID', child.pid);
  child.stdout.on('data', data => {
    const line = data.toString();
    processLine(line);
  });
  child.stderr.on('data', data => {
    console.error(data.toString());
    const error = data.toString().split(':');
    // eslint-disable-next-line no-new
    new Notification('Bitcoind Error', {
      body: error.length > 1 ? error.slice(1, error.length).join(':') : error[0]
    });
  });
};

const terminate = () => {
  if (child) {
    child.kill('SIGINT');
  }
};

export default {
  download,
  start,
  terminate
};
