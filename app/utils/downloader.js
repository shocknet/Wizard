import Http from 'axios';
import { remote, ipcRenderer } from 'electron';
import { Buffer } from 'buffer';
import localForage from 'localForage';
import fs from 'fs-extra';
import path from 'path';
import Unzip from 'unzip';
import { getFolderPath } from './os';

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

const setStatus = async (key, value) => {
  await localForage.setItem(key, value);
  ipcRenderer.send('statusUpdate', await getStatuses());
  return value;
};

const downloadRelease = ({ user, repo, version, fileName }) =>
  new Promise(async (resolve, reject) => {
    let loaded = 0;
    const downloadLocation = await getFolderPath();
    const fileLocation = path.resolve(downloadLocation, fileName);
    if (!fs.existsSync(fileLocation) && !fs.existsSync(downloadLocation)) {
      fs.mkdirSync(downloadLocation, { recursive: true });
    }
    const writer = fs.createWriteStream(fileLocation);
    const releaseLink = `https://github.com/${user}/${repo}/releases/download/${version}/${fileName}`;
    console.log('Release Link:', releaseLink);
    const downloadedRelease = await Http.get(releaseLink, {
      responseType: 'stream'
    });
    downloadedRelease.data.pipe(writer);
    downloadedRelease.data.on('data', buffer => {
      const total = downloadedRelease.headers['content-length'];
      loaded += buffer.length;
      ipcRenderer.send(`${repo}Progress`, Math.round((loaded * 100) / total));
    });
    writer.on('finish', async () => {
      console.log(Buffer.isBuffer(writer));
      await extractFile(fileLocation, downloadLocation, repo);
      resolve(true);
    });
    writer.on('error', reject);
  });

const downloadFile = ({ fileName, downloadUrl, extractedFolderName }) =>
  new Promise(async (resolve, reject) => {
    let loaded = 0;
    const downloadLocation = await getFolderPath();
    const downloadedFileExtension = downloadUrl.split('.').slice(-1)[0];
    const downloadedFileName = `${fileName}.${downloadedFileExtension}`;
    const fileLocation = path.resolve(downloadLocation, downloadedFileName);
    if (!fs.existsSync(fileLocation) && !fs.existsSync(downloadLocation)) {
      fs.mkdirSync(downloadLocation, { recursive: true });
    }
    const writer = fs.createWriteStream(fileLocation);
    const releaseLink = downloadUrl;
    console.log('Release Link:', releaseLink);
    const downloadedRelease = await Http.get(releaseLink, {
      responseType: 'stream'
    });
    downloadedRelease.data.pipe(writer);
    downloadedRelease.data.on('data', buffer => {
      const total = downloadedRelease.headers['content-length'];
      loaded += buffer.length;
      ipcRenderer.send(
        `${fileName}Progress`,
        Math.round((loaded * 100) / total)
      );
    });
    writer.on('finish', async () => {
      console.log(Buffer.isBuffer(writer));
      await extractFile(
        fileLocation,
        downloadLocation,
        fileName,
        extractedFolderName
      );
      resolve(true);
    });
    writer.on('error', reject);
  });

const extractFile = (filePath, destination, folderName, extractedFolderName) =>
  new Promise((resolve, reject) => {
    const sourceFolderPath = extractedFolderName
      ? [...filePath.split('\\').slice(0, -1), extractedFolderName].join('/')
      : filePath
          .split('.')
          .slice(0, -1)
          .join('.');
    const readStream = fs.createReadStream(filePath);
    console.log(filePath, sourceFolderPath, destination);
    readStream.pipe(Unzip.Extract({ path: destination }));
    readStream.on('close', async () => {
      const location = await getFolderPath();
      await fs.copy(sourceFolderPath, path.resolve(location, folderName));
      await Promise.all([fs.remove(sourceFolderPath), fs.remove(filePath)]);
      resolve(true);
    });
    readStream.on('error', () => {
      reject(false);
    });
  });

export default {
  downloadRelease,
  downloadFile,
  extractFile
};
