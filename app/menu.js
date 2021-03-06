import { app, Menu, shell, BrowserWindow, ipcMain, Notification } from 'electron';
import internalIP from 'internal-ip';
import publicIP from 'public-ip';
import logger from 'electron-log';
import { isIPAddress } from './utils/os';

export default class MenuBuilder {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.contextMenu = [];
    this.progress = null;
    this.status = null;
    this.getUserIP();
    ipcMain.on('lndPID', (event, pid = null) => {
      logger.info('LND PID:', pid);
      this.lndPID = pid;
    });
    ipcMain.on('externalIP', (event, ip) => {
      if (!isIPAddress(ip)) {
        this.externalIP = ip;
      }
    });
  }

  async getUserIP() {
    this.externalIP = await publicIP.v4();
    this.internalIP = await internalIP.v4();
  }

  buildContextMenu({
    progress = this.progress,
    status = this.status,
    bitcoindStatus = this.bitcoindStatus,
  } = {}) {
    if (progress) {
      this.progress = progress;
    } else if (progress === 100) {
      this.progress = null;
    }
    this.status = status;
    this.bitcoindStatus = bitcoindStatus;
    return Menu.buildFromTemplate(
      [
        this.internalIP
          ? {
              label: `Internal IP: ${this.internalIP}`,
              enabled: false,
            }
          : null,
        this.externalIP
          ? {
              label: `External IP: ${this.externalIP}`,
              enabled: false,
            }
          : null,
        status
          ? {
              label: status,
              enabled: false,
            }
          : null,
        bitcoindStatus
          ? {
              label: bitcoindStatus,
              enabled: false,
            }
          : null,
        progress !== null
          ? {
              label: `Downloading LND: ${progress}%`,
              enabled: false,
            }
          : null,
        {
          label: 'Re-run LND Setup',
          click: async () => {
            await this.mainWindow.webContents.send('lnd-terminate', this.lndPID);
            await this.mainWindow.webContents.send('bitcoind-terminate');
            await this.mainWindow.webContents.send('restart-setup');
            this.mainWindow.show();
            this.mainWindow.focus();
          },
        },
        this.lndPID
          ? {
              label: 'Node Information',
              click: async () => {
                await this.mainWindow.webContents.send('node-info');
                this.mainWindow.show();
                this.mainWindow.focus();
              },
            }
          : null,
        this.lndPID
          ? {
              label: 'Restart Services',
              click: async () => {
                await this.mainWindow.webContents.send('lnd-terminate', this.lndPID);
                this.lndPID = null;
                await this.mainWindow.webContents.send('lnd-start');
                logger.info({
                  title: 'Services Restarted',
                  body: 'LND has been restarted successfully!',
                });
                // eslint-disable-next-line no-new
                new Notification({
                  title: 'Services Restarted',
                  body: 'LND has been restarted successfully!',
                });
              },
            }
          : null,
        {
          label: 'Quit',
          click: () => {
            app.quit();
          },
        },
      ].filter((item) => !!item)
    );
  }

  buildMenu() {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
      this.setupDevelopmentEnvironment();
    }

    const template =
      process.platform === 'darwin' ? this.buildDarwinTemplate() : this.buildDefaultTemplate();

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    return menu;
  }

  setupDevelopmentEnvironment() {
    this.mainWindow.openDevTools();
    this.mainWindow.webContents.on('context-menu', (e, props) => {
      const { x, y } = props;

      Menu.buildFromTemplate([
        {
          label: 'Inspect element',
          click: () => {
            this.mainWindow.inspectElement(x, y);
          },
        },
      ]).popup(this.mainWindow);
    });
  }

  buildDarwinTemplate() {
    const subMenuAbout = {
      label: 'Electron',
      submenu: [
        {
          label: 'About ElectronReact',
          selector: 'orderFrontStandardAboutPanel:',
        },
        { type: 'separator' },
        { label: 'Services', submenu: [] },
        { type: 'separator' },
        {
          label: 'Hide ElectronReact',
          accelerator: 'Command+H',
          selector: 'hide:',
        },
        {
          label: 'Hide Others',
          accelerator: 'Command+Shift+H',
          selector: 'hideOtherApplications:',
        },
        { label: 'Show All', selector: 'unhideAllApplications:' },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    };
    const subMenuEdit = {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'Command+Z', selector: 'undo:' },
        { label: 'Redo', accelerator: 'Shift+Command+Z', selector: 'redo:' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'Command+X', selector: 'cut:' },
        { label: 'Copy', accelerator: 'Command+C', selector: 'copy:' },
        { label: 'Paste', accelerator: 'Command+V', selector: 'paste:' },
        {
          label: 'Select All',
          accelerator: 'Command+A',
          selector: 'selectAll:',
        },
      ],
    };
    const subMenuViewDev = {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'Command+R',
          click: () => {
            this.mainWindow.webContents.reload();
          },
        },
        {
          label: 'Toggle Full Screen',
          accelerator: 'Ctrl+Command+F',
          click: () => {
            this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
          },
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'Alt+Command+I',
          click: () => {
            this.mainWindow.toggleDevTools();
          },
        },
      ],
    };
    const subMenuViewProd = {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Full Screen',
          accelerator: 'Ctrl+Command+F',
          click: () => {
            this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
          },
        },
      ],
    };
    const subMenuWindow = {
      label: 'Window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'Command+M',
          selector: 'performMiniaturize:',
        },
        { label: 'Close', accelerator: 'Command+W', selector: 'performClose:' },
        { type: 'separator' },
        { label: 'Bring All to Front', selector: 'arrangeInFront:' },
      ],
    };
    const subMenuHelp = {
      label: 'Help',
      submenu: [
        {
          label: 'Learn More',
          click() {
            shell.openExternal('http://electron.atom.io');
          },
        },
        {
          label: 'Documentation',
          click() {
            shell.openExternal('https://github.com/atom/electron/tree/master/docs#readme');
          },
        },
        {
          label: 'Community Discussions',
          click() {
            shell.openExternal('https://discuss.atom.io/c/electron');
          },
        },
        {
          label: 'Search Issues',
          click() {
            shell.openExternal('https://github.com/atom/electron/issues');
          },
        },
      ],
    };

    const subMenuView = process.env.NODE_ENV === 'development' ? subMenuViewDev : subMenuViewProd;

    return [subMenuAbout, subMenuEdit, subMenuView, subMenuWindow, subMenuHelp];
  }

  buildDefaultTemplate() {
    const templateDefault = [
      {
        label: '&File',
        submenu: [
          {
            label: '&Open',
            accelerator: 'Ctrl+O',
          },
          {
            label: '&Close',
            accelerator: 'Ctrl+W',
            click: () => {
              this.mainWindow.close();
            },
          },
        ],
      },
      {
        label: '&View',
        submenu:
          process.env.NODE_ENV === 'development'
            ? [
                {
                  label: '&Reload',
                  accelerator: 'Ctrl+R',
                  click: () => {
                    this.mainWindow.webContents.reload();
                  },
                },
                {
                  label: 'Toggle &Full Screen',
                  accelerator: 'F11',
                  click: () => {
                    this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
                  },
                },
                {
                  label: 'Toggle &Developer Tools',
                  accelerator: 'Alt+Ctrl+I',
                  click: () => {
                    this.mainWindow.toggleDevTools();
                  },
                },
              ]
            : [
                {
                  label: 'Toggle &Full Screen',
                  accelerator: 'F11',
                  click: () => {
                    this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
                  },
                },
              ],
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'Learn More',
            click() {
              shell.openExternal('http://electron.atom.io');
            },
          },
          {
            label: 'Documentation',
            click() {
              shell.openExternal('https://github.com/atom/electron/tree/master/docs#readme');
            },
          },
          {
            label: 'Community Discussions',
            click() {
              shell.openExternal('https://discuss.atom.io/c/electron');
            },
          },
          {
            label: 'Search Issues',
            click() {
              shell.openExternal('https://github.com/atom/electron/issues');
            },
          },
        ],
      },
    ];

    return templateDefault;
  }
}
