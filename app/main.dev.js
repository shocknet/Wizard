/* eslint global-require: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build-main`, this file is compiled to
 * `./app/main.prod.js` using webpack. This gives us some performance wins.
 *
 * @flow
 */
import { app, BrowserWindow, Tray, ipcMain } from 'electron';
import unhandled from 'electron-unhandled';
import path from 'path';
import MenuBuilder from './menu';
import server from 'sw-server';

unhandled();

let mainWindow = null;
let tray = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
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
  ).catch(console.log);
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

  console.log(__dirname);

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
    // if (setupCompleted) {
    //   mainWindow.hide();
    // } else {
    //   mainWindow.show();
    //   mainWindow.focus();
    // }
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
      console.log(event, data);
      if (!serverInstance) {
        serverInstance = server(data);
      }
    } catch (err) {
      console.error(err);
    }
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  // new AppUpdater();
});
