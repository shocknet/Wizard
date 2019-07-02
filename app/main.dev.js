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
import { app, BrowserWindow, Tray, Menu, ipcMain } from 'electron';
import localForage from 'localforage';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import path from 'path';

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow = null;
let tray = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
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
    return `${Math.trunc(
      (data.downloadedBlockHeightsLength / data.downloadedBlocks) * 100
    )}% Blocks Processed`;
  } else if (!data.walletUnlocked) {
    return 'LND wallet locked, please unlock it with `lncli unlock`';
  } else {
    return 'LND wallet is unlocked and fully synced up with the network!';
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
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }

  tray = new Tray(path.join(__dirname, 'img/app.png'));

  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Re-run LND Setup',
        click: () => {
          mainWindow.show();
          mainWindow.focus();
        }
      },
      {
        label: 'Quit',
        click: () => {
          app.quit();
        }
      }
    ])
  );

  ipcMain.on('statusUpdate', async (event, data) => {
    tray.setContextMenu(
      Menu.buildFromTemplate([
        {
          label: getLndStatus(data),
          enabled: false
        },
        {
          label: 'Re-run LND Setup',
          click: () => {
            mainWindow.show();
            mainWindow.focus();
          }
        },
        {
          label: 'Quit',
          click: () => {
            app.quit();
          }
        }
      ])
    );
  });

  ipcMain.on('lndProgress', (event, data) => {
    tray.setContextMenu(
      Menu.buildFromTemplate([
        {
          label: `Downloading LND: ${data}%`,
          enabled: false
        },
        {
          label: 'Re-run LND Setup',
          click: () => {
            mainWindow.show();
            mainWindow.focus();
          }
        },
        {
          label: 'Quit',
          click: () => {
            app.quit();
          }
        }
      ])
    );
  });

  mainWindow = new BrowserWindow({
    show: false,
    width: 800,
    height: 600,
    frame: false
  });

  mainWindow.loadURL(`file://${__dirname}/app.html`);

  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on('did-finish-load', async () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    const setupCompleted = await localForage.getItem('setupCompleted');
    if (setupCompleted) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  // new AppUpdater();
});
