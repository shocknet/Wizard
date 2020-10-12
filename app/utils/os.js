import os from 'os';
import path from 'path';
import fs from 'fs';
import { ipcRenderer } from 'electron';
import logger from 'electron-log';
import localForage from 'localforage';

export const getUserPlatform = (shortNames = false) => {
  const platform = os.platform();
  if (platform === 'win32' && !shortNames) {
    return 'windows';
  }

  if (platform === 'win32' && shortNames) {
    return 'win64';
  }

  if (platform === 'linux' && shortNames) {
    return 'x86_64-linux-gnu';
  }

  return platform;
};

export const getFolderPath = async () => {
  const [folderPath, userData] = await Promise.all([
    localForage.getItem('installLocation'),
    ipcRenderer.invoke('getUserData'),
  ]);
  const defaultPath = path.resolve(userData, './executables');
  logger.info('Folder Path:', folderPath, defaultPath, userData);

  return folderPath || defaultPath;
};

export const getDataDir = async () => {
  const lndType = await localForage.getItem('lndType');
  const folderPath = await getFolderPath();
  if (lndType === 'bitcoind') {
    const dataDir = path.resolve(folderPath, 'bitcoind', 'data');
    return dataDir;
  }

  const dataDir = path.resolve(folderPath, 'lnd', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
};

export const isIPAddress = (address) => {
  const IPMatches = (address ? address : '').match(
    /\b(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g
  );
  return IPMatches ? !!IPMatches[0] : false;
};
