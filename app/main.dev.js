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
import { app, BrowserWindow, Tray, ipcMain } from 'electron';
import logger from 'electron-log';
import unhandled from 'electron-unhandled';
import path from 'path';
import { autoUpdater } from 'electron-updater';
import server from 'sw-server';
import MenuBuilder from './menu';

unhandled();

let mainWindow = null;
let tray = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();

  autoUpdater.allowPrerelease = true;
  autoUpdater.autoDownload = true;
  autoUpdater.allowDowngrade = false;
  autoUpdater.setFeedURL({
    provider: 'github',
    repo: 'Wizard',
    owner: 'shocknet'
  });
  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 60000); // Check for updates every minute
}

if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];

  return Promise.all(
    extensions.map(name => installer.default(installer[name], forceDownload))
  ).catch(logger.info);
};

const getLndStatus = data => {
  if (
    data.downloadedBlocks !== data.downloadedBlockHeightsLength &&
    data.downloadedBlockHeightsLength !== 0
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

const getBitcoindStatus = data => {
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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('ready', async () => {
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
    await installExtensions();
  }

  logger.info(__dirname);

  tray = new Tray(path.join(__dirname, 'img/app.png'));

  mainWindow = new BrowserWindow({
    show: false,
    frame: false,
    webPreferences: {
      nodeIntegration: true
    }
  });

  mainWindow.loadURL(`file://${__dirname}/app.html`);

  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on('did-finish-load', async () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    ipcMain.on('setupStatus', (event, data) => {
      logger.info('setupCompleted', event, data);
      if (data) {
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

  let serverInstance = null;

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

  ipcMain.on('startServer', (event, data) => {
    try {
      if (!serverInstance) {
        server(data);
        serverInstance = true;
      }
    } catch (err) {
      logger.error(err);
    }
  });
});

autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
  const dialogOpts = {
    type: 'info',
    buttons: ['Restart', 'Later'],
    title: 'Application Update',
    message: process.platform === 'win32' ? releaseNotes : releaseName,
    detail:
      'A new version of ShockWizard has been downloaded. Restart the application to apply the update.'
  };

  dialog.showMessageBox(dialogOpts).then(returnValue => {
    if (returnValue.response === 0) autoUpdater.quitAndInstall();
  });
});

autoUpdater.on('error', message => {
  logger.error('There was a problem updating the application');
  logger.error(message);
});
