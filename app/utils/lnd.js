import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import localForage from 'localforage';
import { ipcRenderer, remote } from 'electron';
import Downloader from './downloader';

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
      downloadedBlocks !== downloadedBlockHeightsLength ||
      downloadedBlocks === 0
  },
  syncedBlocks: {
    phrases: ['Fully caught up with cfheaders at height'],
    key: 'downloadedBlocks',
    value: async () => {
      return await localForage.getItem('downloadedBlockHeightsLength');
    }
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

const download = async ({ version, os }) => {
  const fileName = `lnd-${os}-amd64-${version}.zip`;
  if (
    !fs.existsSync(
      path.resolve(
        remote.process.execPath
          .split('/')
          .slice(0, -1)
          .join('/'),
        'executables',
        'lnd'
      )
    )
  ) {
    await Downloader.downloadRelease({
      version,
      user: 'lightningnetwork',
      repo: 'lnd',
      fileName
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
    localForage.setItem('downloadedBlockHeightsLength', 0),
    localForage.setItem('downloadedBlocks', 0),
    localForage.setItem('syncedBlocks', 0),
    localForage.setItem('walletUnlocked', null)
  ]);
  return true;
};

const setStatus = async (key, value) => {
  await localForage.setItem(key, value);
  ipcRenderer.send('statusUpdate', await getStatuses());
  return value;
};

const incrementStatus = async (key, value) => {
  const status = await localForage.getItem(key);
  await setStatus(key, parseFloat(status) + parseFloat(value));
};

const processLine = async line => {
  const matches = await Promise.all(
    Object.entries(regexExpressions).map(async ([key, conditions]) => {
      const downloadedBlockHeightsLength = await localForage.getItem(
        'downloadedBlockHeightsLength'
      );
      if (conditions.phrases) {
        const unmatchedPhrases = conditions.phrases.filter(
          phrase => !line.includes(phrase)
        )[0];
        if (unmatchedPhrases) {
          return false;
        }
      }

      if (conditions.condition) {
        if (key === 'currentHeight') {
          const downloadedBlocks = await localForage.getItem(
            'downloadedBlocks'
          );
          const matched = conditions.condition(
            downloadedBlocks,
            downloadedBlockHeightsLength
          );
          console.log(`${downloadedBlocks}/${downloadedBlockHeightsLength}`);
          if (!matched) {
            return false;
          }
        }
      }

      if (conditions.regex) {
        const matchedRegex = line.match(conditions.regex);

        if (matchedRegex && matchedRegex.length > 0) {
          const value = conditions.replace.reduce(
            (value, replaceValue) => value.replace(replaceValue, ''),
            matchedRegex[0]
          );
          await setStatus(conditions.key, parseInt(value));
          if (
            key === 'currentHeight' &&
            downloadedBlockHeightsLength === value
          ) {
            const walletUnlocked = await localForage.getItem('walletUnlocked');
            new Notification('LND is synced up!', {
              body:
                'The LND instance is fully synced up with the bitcoin network!' +
                (walletUnlocked
                  ? ''
                  : ' Please unlock your wallet to interact with it')
            });
          }
          return { key: conditions.key, value };
        } else {
          return false;
        }
      } else if (conditions.value) {
        const value = await conditions.value();
        await setStatus(conditions.key, value);
        if (key === 'syncedBlocks') {
          console.log('syncedBlocks!!');
          const walletUnlocked = await localForage.getItem('walletUnlocked');
          new Notification('LND is synced up!', {
            body:
              'The LND instance is fully synced up with the bitcoin network!' +
              (walletUnlocked
                ? ''
                : ' Please unlock your wallet to interact with it')
          });
        } else if (key === 'walletUnlocked') {
          const downloadedBlocks = await localForage.getItem(
            'downloadedBlocks'
          );
          new Notification('Wallet is successfully unlocked!', {
            body:
              'The LND instance is now unlocked!' +
              (downloadedBlocks >= downloadedBlockHeightsLength
                ? ''
                : ' Please wait until the LND instance fully syncs up')
          });
        }
        return { key: conditions.key, value };
      }
    })
  );

  console.log(matches.filter(value => value !== false), line);
};

const start = async () => {
  const lndExe = path.resolve(
    remote.process.execPath
      .split('/')
      .slice(0, -1)
      .join('/'),
    'executables',
    'lnd',
    'lnd.exe'
  );
  const networkType = await localForage.getItem('networkType');
  const child = spawn(lndExe, [
    '--bitcoin.active',
    `--bitcoin.${networkType ? networkType : 'testnet'}`,
    '--debuglevel=info',
    '--bitcoin.node=neutrino',
    '--neutrino.connect=faucet.lightning.community'
  ]);
  child.stdout.on('data', data => {
    const line = data.toString();
    processLine(line);
  });
  child.stderr.on('data', data => {
    console.error(data.toString());
    const error = data.toString().split(':');
    new Notification('LND Error', {
      body: error.slice(1, error.length).join(':')
    });
  });
};

export default {
  download,
  start
};
