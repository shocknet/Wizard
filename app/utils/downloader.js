import Http from 'axios';
import { ipcRenderer } from 'electron';
import { Buffer } from 'buffer';
import fs from 'fs-extra';
import path from 'path';
import Unzip from 'unzipper';
import Tar from 'tar';
import logger from 'electron-log';
import rimraf from 'rimraf';
import { getFolderPath, getUserPlatform } from './os';

const deleteRelease = (folderPath) =>
  new Promise((resolve, reject) => {
    rimraf(folderPath, (err) => {
      if (err) {
        logger.error(err);
        reject(err);
        return;
      }
      resolve(true);
    });
  });

const downloadRelease = ({ repo, fileName, url, update = false }, progressCallback) =>
  new Promise(async (resolve, reject) => {
    let loaded = 0;
    const downloadLocation = await getFolderPath();
    const fileLocation = path.resolve(downloadLocation, fileName);
    logger.info('File Location:', fileLocation);
    logger.info('Downloaded File Name:', fileName);
    if (update) {
      await deleteRelease(path.resolve(downloadLocation, repo, '*.exe'));
    }
    if (!fs.existsSync(fileLocation) && !fs.existsSync(downloadLocation)) {
      logger.info('Creating new folders:', downloadLocation);
      fs.mkdirSync(downloadLocation, { recursive: true });
    }
    const writer = fs.createWriteStream(fileLocation);
    const releaseLink = url;
    logger.info('Release Link:', releaseLink);
    const adapter = require('axios/lib/adapters/http');
    const downloadedRelease = await Http.get(releaseLink, {
      responseType: 'stream',
      adapter,
    });
    downloadedRelease.data.pipe(writer);
    downloadedRelease.data.on('data', (buffer) => {
      const total = downloadedRelease.headers['content-length'];
      loaded += buffer.length;
      ipcRenderer.send(`${repo}Progress`, Math.round((loaded * 100) / total));
      if (progressCallback) {
        progressCallback({
          app: repo,
          type: update ? 'update' : 'download',
          progress: Math.round((loaded * 100) / total),
        });
      }
    });
    writer.on('finish', async () => {
      logger.info(Buffer.isBuffer(writer));
      await extractFile(fileLocation, downloadLocation, repo, null, update);
      resolve(true);
    });
    writer.on('error', reject);
  });

const downloadFile = ({ fileName, downloadUrl, extractedFolderName }, progressCallback) =>
  new Promise(async (resolve, reject) => {
    let loaded = 0;
    const userPlatform = getUserPlatform();
    const downloadLocation = await getFolderPath();
    const downloadedFileExtension = downloadUrl
      .split('.')
      .slice(userPlatform === 'linux' ? -2 : -1)
      .join('.');
    const downloadedFileName = `${fileName}.${downloadedFileExtension}`;
    const fileLocation = path.resolve(downloadLocation, downloadedFileName);
    logger.info('File Location:', fileLocation);
    logger.info('Downloaded File Name:', downloadedFileName);
    if (!fs.existsSync(fileLocation) && !fs.existsSync(downloadLocation)) {
      logger.info('Creating new folders:', downloadLocation);
      fs.mkdirSync(downloadLocation, { recursive: true });
    }
    const writer = fs.createWriteStream(fileLocation);
    const releaseLink = downloadUrl;
    logger.info('Release Link:', releaseLink);
    const downloadedRelease = await Http.get(releaseLink, {
      responseType: 'stream',
    });
    downloadedRelease.data.pipe(writer);
    downloadedRelease.data.on('data', (buffer) => {
      const total = downloadedRelease.headers['content-length'];
      loaded += buffer.length;
      ipcRenderer.send(`${fileName}Progress`, Math.round((loaded * 100) / total));
      if (progressCallback) {
        progressCallback({
          app: fileName,
          progress: Math.round((loaded * 100) / total),
        });
      }
    });
    writer.on('finish', async () => {
      logger.info(Buffer.isBuffer(writer));
      await extractFile(fileLocation, downloadLocation, fileName, extractedFolderName);
      resolve(true);
    });
    writer.on('error', (error) => {
      logger.error(error);
      reject(error);
    });
  });

const extractFile = (filePath, destination, folderName, extractedFolderName, update) =>
  new Promise((resolve, reject) => {
    const os = getUserPlatform();
    const archiveFormatIndex = os === 'linux' ? -2 : -1;
    const directoryIdentifier = os === 'windows' ? '\\' : '/';
    const sourceFolderPath = extractedFolderName
      ? [...filePath.split(directoryIdentifier).slice(0, -1), extractedFolderName].join('/')
      : filePath.split('.').slice(0, archiveFormatIndex).join('.');
    const readStream = fs.createReadStream(filePath);
    logger.info(filePath, sourceFolderPath, destination);
    if (os === 'windows') {
      readStream.pipe(Unzip.Extract({ path: destination }));
    } else {
      readStream.pipe(Tar.x({ cwd: destination }));
    }
    readStream.on('close', async () => {
      const location = await getFolderPath();
      await fs.copy(sourceFolderPath, path.resolve(location, folderName));
      await Promise.all([fs.remove(sourceFolderPath), fs.remove(filePath)]);
      resolve(true);
    });
    readStream.on('error', (err) => {
      reject(err);
    });
  });

export default {
  downloadRelease,
  downloadFile,
  extractFile,
};
