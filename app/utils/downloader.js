import Http from 'axios';
import { remote, ipcRenderer } from 'electron';
import { Buffer } from 'buffer';
import fs from 'fs-extra';
import path from 'path';
import Unzip from 'unzip';

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
    const downloadLocation = path.resolve(
      remote.process.execPath
        .split('/')
        .slice(0, -1)
        .join('/'),
      'executables'
    );
    const fileLocation = path.resolve(downloadLocation, fileName);
    if (!fs.existsSync(fileLocation)) {
      fs.mkdirSync(downloadLocation, { recursive: true });
    }
    const writer = fs.createWriteStream(fileLocation);
    const releaseLink = `https://github.com/${user}/${repo}/releases/download/${version}/${fileName}`;
    console.log('Release Link:', releaseLink);
    const downloadedRelease = await Http.get(releaseLink, {
      onDownloadProgress: ({ loaded, total }) => {
        console.log(`Downloaded: ${Math.round((loaded * 100) / total)}%`);
      },
      responseType: 'stream'
    });
    console.log('Release downloaded');
    downloadedRelease.data.pipe(writer);
    downloadedRelease.data.on('data', buffer => {
      const total = downloadedRelease.headers['content-length'];
      loaded += buffer.length;
      ipcRenderer.send('lndProgress', Math.round((loaded * 100) / total));
    });
    writer.on('finish', async () => {
      console.log(Buffer.isBuffer(writer));
      await extractFile(fileLocation, downloadLocation);
      resolve(true);
    });
    writer.on('error', reject);
  });

const extractFile = (filePath, destination) =>
  new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(Unzip.Extract({ path: destination }));
    readStream.on('close', () => {
      fs.copy(
        filePath.replace('.zip', ''),
        path.resolve(
          remote.process.execPath
            .split('/')
            .slice(0, -1)
            .join('/'),
          'executables',
          'lnd'
        )
      );
      resolve(true);
    });
    readStream.on('error', () => {
      reject(false);
    });
  });

export default {
  downloadRelease,
  extractFile
};
