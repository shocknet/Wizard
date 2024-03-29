/* eslint global-require: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build-main`, this file is compiled to
 * `./app/main.prod.js` using webpack. This gives us some performance wins.
 *
 */
import { app, BrowserWindow, Tray, ipcMain, dialog } from 'electron';
import logger from 'electron-log';
import unhandled from 'electron-unhandled';
import path from 'path';
import { autoUpdater, CancellationToken } from 'electron-updater';
import server from 'shockapi';
import MenuBuilder from './menu';
import { version } from './package.json';

autoUpdater.logger = logger;
autoUpdater.logger.transports.file.level = 'info';
logger.transports.file.format = '{h}:{i}:{s}:{ms} {text}';
logger.transports.file.maxSize = 5 * 1024 * 1024;
logger.transports.file.level = 'info';

logger.info('Initializing ShockWizard v' + version);

unhandled({
  showDialog: false,
});

let mainWindow = null;
let tray = null;
let updateTimer = null;
let downloadingUpdate = false;

app.allowRendererProcessReuse = true;

if (process.env.NODE_ENV === 'production' || process.env.DEBUG_PROD === 'true') {
  try {
    const sourceMapSupport = require('source-map-support');
    sourceMapSupport.install();

    autoUpdater.allowPrerelease = true;
    autoUpdater.autoDownload = false;
    autoUpdater.allowDowngrade = false;
    autoUpdater.setFeedURL({
      provider: 'github',
      repo: 'Wizard',
      owner: 'shocknet',
      artifactName: 'ShockWizard-Setup-${version}.${ext}',
    });
    autoUpdater.checkForUpdates().catch((err) => {});
  } catch {}
}

if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
  // require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];

  return Promise.all(
    extensions.map((name) => installer.default(installer[name], forceDownload))
  ).catch(logger.info);
};

const getLndStatus = (data) => {
  if (
    data.downloadedBlocks !== data.downloadedBlockHeightsLength &&
    data.downloadedBlockHeightsLength !== 0 &&
    !data.walletUnlocked
  ) {
    const downloadProgress = Math.trunc(
      (data.downloadedBlocks / data.downloadedBlockHeightsLength) * 100
    );
    return `LND: ${downloadProgress}% Blocks Processed`;
  }
  if (!data.walletUnlocked) {
    return 'LND wallet locked, please unlock it with `lncli unlock`';
  }

  return 'LND wallet is unlocked and fully synced up with the network!';
};

const getBitcoindStatus = (data) => {
  if (data.bitcoind_progress > 0) {
    return `Bitcoind: ${data.bitcoind_progress}% Blocks Synced`;
  }
};

app.setAppUserModelId(process.execPath);

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  mainWindow.webContents.send('lnd-terminate');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('ready', async () => {
  const updateCancelToken = new CancellationToken();
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
    // await installExtensions();
  }

  logger.info(__dirname);

  tray = new Tray(path.join(__dirname, 'img/app.png'));

  mainWindow = new BrowserWindow({
    show: false,
    frame: false,
    minHeight: 800,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      worldSafeExecuteJavaScript: true,
    },
  });

  mainWindow.loadURL(`file://${__dirname}/app.html`);

  mainWindow.webContents.on('ready-to-show', async () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    ipcMain.on('setupStatus', (event, data) => {
      if (data === 'complete') {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    });
    mainWindow.webContents.send('getSetupStatus', 'setupStatus');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  let serverInstance = false;

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  tray.setContextMenu(menuBuilder.buildContextMenu());

  ipcMain.on('statusUpdate', async (event, data) => {
    tray.setContextMenu(menuBuilder.buildContextMenu({ status: getLndStatus(data) }));
  });

  ipcMain.on('bitcoindStatusUpdate', async (event, data) => {
    tray.setContextMenu(menuBuilder.buildContextMenu({ bitcoindStatus: getBitcoindStatus(data) }));
  });

  ipcMain.on('lndProgress', (event, data) => {
    tray.setContextMenu(menuBuilder.buildContextMenu({ progress: data }));
  });

  ipcMain.handle('startServer', (event, data) => {
    try {
      console.log(data);
      if (!serverInstance) {
        server(data);
        serverInstance = true;
      }
    } catch (err) {
      logger.error(err);
      serverInstance = false;
    }
  });

  ipcMain.on('download-update', () => {
    downloadingUpdate = true;
    autoUpdater.downloadUpdate(updateCancelToken);
  });

  ipcMain.on('cancel-update', () => {
    try {
      updateCancelToken.cancel();
    } catch {
      logger.warn('Update Cancelled');
    }
  });

  ipcMain.handle('getUserData', async () => {
    const userData = app.getPath('userData');
    return userData;
  });

  ipcMain.handle('showOpenDialog', async (event, options = {}) => {
    const result = await dialog.showOpenDialog({
      properties: options.properties,
    });

    return result;
  });

  ipcMain.handle('downloadRelease', async () => {});

  ipcMain.handle('hideFocusedWindow', async () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();

    if (focusedWindow) {
      focusedWindow.hide();
      return true;
    }

    return false;
  });

  ipcMain.handle('showWindows', async () => {
    const shownWindows = BrowserWindow.getAllWindows();
    shownWindows.map((window) => window.show());

    return true;
  });

  ipcMain.handle('quitApp', async () => {
    mainWindow.webContents.send('lnd-terminate');
    app.quit();

    return true;
  });

  ipcMain.handle('minimize', async () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();

    if (focusedWindow) {
      focusedWindow.minimize();
      return true;
    }

    return false;
  });
});

autoUpdater.on('update-available', (event, releaseNotes, releaseName) => {
  if (!downloadingUpdate) {
    logger.info('update-available', event, releaseNotes, releaseName);
    mainWindow.webContents.send('update-available', JSON.stringify(event));
  }
});

autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
  mainWindow.webContents.send('update-downloaded');
  const dialogOpts = {
    type: 'info',
    buttons: ['Restart', 'Later'],
    title: 'Application Update',
    message: process.platform === 'win32' ? releaseNotes : releaseName,
    detail:
      'A new version of ShockWizard has been downloaded. Restart the application to apply the update.',
  };

  dialog
    .showMessageBox(dialogOpts)
    .then((returnValue) => {
      if (returnValue.response === 0) return autoUpdater.quitAndInstall();
      return;
    })
    .catch((err) => console.log(err));
});

autoUpdater.on('download-progress', (ev, progressObj) => {
  mainWindow.webContents.send('update-progress', JSON.stringify(ev));
});

autoUpdater.on('error', (message) => {
  logger.error('There was a problem updating the application');
  logger.error(message);
});

let diffDown = {
  percent: 0,
  bytesPerSecond: 0,
  total: 0,
  transferred: 0,
};
let diffDownHelper = {
  startTime: 0,
  lastTime: 0,
  lastSize: 0,
};

logger.hooks.push((msg, transport) => {
  if (transport !== logger.transports.console) {
    return msg;
  }

  let match = /Full: ([\d\,\.]+) ([GMKB]+), To download: ([\d\,\.]+) ([GMKB]+)/.exec(msg.data[0]);
  if (match) {
    let multiplier = 1;
    if (match[4] == 'KB') multiplier *= 1024;
    if (match[4] == 'MB') multiplier *= 1024 * 1024;
    if (match[4] == 'GB') multiplier *= 1024 * 1024 * 1024;

    diffDown = {
      percent: 0,
      bytesPerSecond: 0,
      total: Number(match[3].split(',').join('')) * multiplier,
      transferred: 0,
    };
    diffDownHelper = {
      startTime: Date.now(),
      lastTime: Date.now(),
      lastSize: 0,
    };
    return msg;
  }

  match = /download range: bytes=(\d+)-(\d+)/.exec(msg.data[0]);
  if (match) {
    const currentSize = Number(match[2]) - Number(match[1]);
    const currentTime = Date.now();
    const deltaTime = currentTime - diffDownHelper.startTime;

    diffDown.transferred += diffDownHelper.lastSize;
    diffDown.bytesPerSecond = Math.floor((diffDown.transferred * 1000) / deltaTime);
    diffDown.percent = (diffDown.transferred * 100) / diffDown.total;

    diffDownHelper.lastSize = currentSize;
    diffDownHelper.lastTime = currentTime;
    logger.info('Update Progress:', diffDown);
    mainWindow.webContents.send('update-progress', JSON.stringify(diffDown));
    return msg;
  }
  return msg;
});

process.on('unhandledRejection', function (err) {
  logger.info('Unhandled Rejection:', err);
});

process.on('uncaughtException', function (err) {
  logger.info('Uncaught Exception:', err);
});
