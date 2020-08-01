import React, { Component } from 'react';

import { remote, ipcRenderer } from 'electron';
import localForage from 'localforage';

import AutoLaunch from 'auto-launch';
import logger from 'electron-log';

import { getUserPlatform } from '../../utils/os';

import { TARGET_LND_VERSION } from '../../constants/lnd';
import IntroStep from './IntroStep';
import InstallLocationStep from './InstallLocationStep';
import LndTypeStep from './LndTypeStep';
import NetworkSetupStep from './NetworkSetupStep';
import NetworkStep from './NetworkStep';
import NetworkURLStep from './NetworkURLStep';
import WalletQRStep from './WalletQRStep';
import AutoLaunchStep from './AutoLaunchStep';
import Lnd from '../../utils/lnd';
import Bitcoind from '../../utils/bitcoind';
import styles from './css/index.css';
import shockLogo from '../../img/banner.png';

export default class Home extends Component {
  state = {
    step: 1,
    maxStep: 7,
    lndType: 'neutrino',
    lndProgress: 0,
    downloadType: null,
    bitcoindProgress: 0,
    showNodeInfo: false,
    lndLogLines: [],
    bitcoindProgress: 0,
    lndProgress: 0,
    lndDownloadProgress: 0,
    bitcoindDownloadProgress: 0,
    bitcoindLogLines: [],
    loadingServer: true
  };

  logBox = React.createRef();

  safeParse = data => {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  };

  componentDidMount = async () => {
    ipcRenderer.on('lnd-start', () => {
      logger.info('lnd-start');
      this.runLnd();
    });

    ipcRenderer.on('bitcoind-start', () => {
      logger.info('bitcoind-start');
      this.runBitcoind();
    });

    ipcRenderer.on('lnd-terminate', (event, pid) => {
      logger.info('lnd-terminate', event, pid);
      Lnd.terminate();
    });

    ipcRenderer.on('bitcoind-terminate', (event, pid) => {
      logger.info('bitcoind-terminate', event, pid);
      Bitcoind.terminate();
    });

    ipcRenderer.on('restart-setup', async () => {
      const LNDVersion = await localForage.getItem('lnd-version');
      localForage.setItem('setupCompleted', false);
      await localForage.clear();
      localForage.setItem('lnd-version', LNDVersion);
      ipcRenderer.send('lndPID');
      this.setState({
        showNodeInfo: false,
        loadingServer: false,
        step: 1
      });
    });

    ipcRenderer.on('node-info', () => {
      this.setState({
        showNodeInfo: true,
        step: 7
      });
    });

    ipcRenderer.on('update-available', (event, data) => {
      console.log('update-available react', event, data);
      this.setState({ updatePending: true, updateDetails: this.safeParse(data) });
    });

    ipcRenderer.on('download-progress', (event, progress) => {
      this.setState({ updateProgress: JSON.parse(progress) });
    });

    const LNDData = {
      downloadedBlockHeightsLength: await localForage.getItem('downloadedBlockHeightsLength'),
      downloadedBlocks: await localForage.getItem('downloadedBlocks')
    };
    const bitcoindData = {
      progress: await localForage.getItem('bitcoind_progress')
    };
    this.setProgress('lnd', LNDData);
    this.setProgress('bitcoind', bitcoindData);
    Lnd.onData(async data => {
      console.log('onData triggered', data);
      const LNDData = {
        downloadedBlockHeightsLength: await localForage.getItem('downloadedBlockHeightsLength'),
        downloadedBlocks: await localForage.getItem('downloadedBlocks')
      };
      this.setProgress('lnd', LNDData);
      await this.addLNDLogLine(data);
    });

    Bitcoind.onData(async data => {
      const bitcoindData = {
        progress: await localForage.getItem('bitcoind_progress')
      };
      this.setProgress('bitcoind', bitcoindData);
      await this.addBitcoindLogLine(data);
    });

    const setupCompleted = await localForage.getItem('setupCompleted');
    if (setupCompleted) {
      await this.runBitcoind();
      await this.runLnd();
      this.setState({
        loadingServer: false
      });
    } else {
      remote.BrowserWindow.getAllWindows().map(window => window.show());
    }
  };

  componentWillUnmount = () => {
    ipcRenderer.off('lnd-start', () => {
      logger.info('Unmounted');
    });

    ipcRenderer.off('bitcoind-start', () => {
      logger.info('Unmounted');
    });

    ipcRenderer.off('lnd-terminate', () => {
      logger.info('Unmounted');
    });

    ipcRenderer.off('bitcoind-terminate', () => {
      logger.info('Unmounted');
    });

    ipcRenderer.off('restart-setup', () => {
      logger.info('Unmounted');
    });
    ipcRenderer.off('node-info', () => {
      logger.info('Unmounted');
    });

    ipcRenderer.off('update-available', () => {
      logger.info('Unmounted');
    });

    Lnd.offData();
    Bitcoind.offData();
    Lnd.terminate();
    Bitcoind.terminate();
  };

  addLNDLogLine = data =>
    new Promise((resolve, reject) => {
      const { lndLogLines } = this.state;
      this.setState(
        {
          lndLogLines: [...lndLogLines, data]
        },
        () => {
          if (this.logBox.current) {
            this.logBox.current.scrollTo(0, this.logBox.current.scrollHeight);
          }
          resolve(true);
        }
      );
    });

  addBitcoindLogLine = data =>
    new Promise((resolve, reject) => {
      const { bitcoindLogLines } = this.state;
      this.setState(
        {
          bitcoindLogLines: [...bitcoindLogLines, data]
        },
        () => {
          if (this.logBox.current) {
            this.logBox.current.scrollTo(0, this.logBox.current.scrollHeight);
          }
          resolve(true);
        }
      );
    });

  setProgress = (type, data) => {
    logger.info('setProgress:', type, data);
    if (
      data.downloadedBlocks !== data.downloadedBlockHeightsLength &&
      data.downloadedBlockHeightsLength !== 0
    ) {
      const downloadProgress = Math.trunc(
        (data.downloadedBlocks / data.downloadedBlockHeightsLength) * 100
      );
      return this.setState({
        [type + 'DownloadProgress']: downloadProgress
      });
    }

    if (data.downloadedBlockHeightsLength !== 0 && data.downloadedBlockHeightsLength) {
      return this.setState({
        [type + 'DownloadProgress']: 100
      });
    }

    if (data.progress >= 0) {
      return this.setState({
        [type + 'DownloadProgress']: data.progress
      });
    }
  };

  runLnd = async () => {
    try {
      const setupCompleted = await localForage.getItem('setupCompleted');
      const autoStartup = await localForage.getItem('autoStartup');
      const externalIP = await localForage.getItem('externalIP');

      ipcRenderer.send('externalIP', externalIP);

      if (setupCompleted) {
        await Lnd.download(
          {
            version: TARGET_LND_VERSION,
            os: getUserPlatform()
          },
          ({ app, progress, type }) => {
            const appProgress = this.state[app + 'Progress'];
            if (appProgress < progress) {
              this.setState({
                [app + 'Progress']: progress,
                downloadType: type
              });
            }
          }
        );
        await Lnd.start();

        // this.setState({
        //   step: 1
        // });

        if (autoStartup) {
          const startup = new AutoLaunch({
            name: 'LNDServer'
          });
          const startupEnabled = await startup.isEnabled();
          logger.info('Startup Enabled:', startupEnabled);
          if (!startupEnabled) {
            await startup.enable();
            logger.info('Startup Enabled');
          }
        }
      }
      return true;
    } catch (err) {
      logger.error(err);
    }
  };

  runBitcoind = async () => {
    const setupCompleted = await localForage.getItem('setupCompleted');
    const lndType = await localForage.getItem('lndType');
    logger.info('lndType', lndType);
    if (setupCompleted && lndType === 'bitcoind') {
      await Bitcoind.download(
        {
          version: '0.18.1',
          os: getUserPlatform(),
          osArchitecture: getUserPlatform(true)
        },
        ({ app, progress }) => {
          const appProgress = this.state[app + 'Progress'];
          if (appProgress < progress) {
            this.setState({
              [app + 'Progress']: progress
            });
          }
        }
      );
      await Bitcoind.start();
      this.setState({
        lndType: 'bitcoind'
      });
    }
    return true;
  };

  nextStep = async () => {
    const { step, maxStep } = this.state;
    logger.info('nextStep', step, step === 3);

    if (step === 6) {
      // eslint-disable-next-line no-new
      logger.info('Step 6');
      await localForage.setItem('setupCompleted', true);
      this.setState({
        loadingServer: true,
        step: step + 1
      });
      logger.info('Running LND...');
      await this.runLnd();
      logger.info('Running Bitcoind...');
      await this.runBitcoind();
      logger.info('Server is no longer loading!');
      this.setState({
        loadingServer: false
      });
    } else if (step === 3) {
      logger.info(step);
      const lndType = await localForage.getItem('lndType');
      logger.info('Lnd Type', lndType);
      this.setState({
        lndType,
        step: step + 1
      });
    } else if (step === maxStep) {
      logger.info('Step 7');
      remote.BrowserWindow.getFocusedWindow().hide();
      new Notification('LND Server Setup', {
        body:
          'The setup will now run in the background and download all the required files and notify you once everything is done!'
      });
    } else {
      this.setState({
        step: step + 1
      });
    }
  };

  prevStep = () => {
    const { step } = this.state;
    this.setState({
      step: step - 1
    });
  };

  renderStep = () => {
    const {
      step,
      lndType,
      loadingServer,
      showNodeInfo,
      lndLogLines,
      bitcoindProgress,
      lndProgress,
      lndDownloadProgress,
      bitcoindDownloadProgress,
      bitcoindLogLines,
      downloadType
    } = this.state;

    if (step === 1) {
      return <IntroStep />;
    }

    if (step === 2) {
      return <NetworkStep />;
    }

    if (step === 3) {
      return <LndTypeStep />;
    }

    if (step === 4 && lndType === 'neutrino') {
      return <NetworkURLStep />;
    }

    if (step === 4 && lndType === 'bitcoind') {
      return <InstallLocationStep />;
    }

    if (step === 5) {
      return <AutoLaunchStep />;
    }

    if (step === 6) {
      return <NetworkSetupStep />;
    }

    if (step === 7) {
      logger.info('loadingServer', loadingServer, lndType);
      return (
        <WalletQRStep
          lndType={lndType}
          loadingServer={loadingServer}
          showNodeInfo={showNodeInfo}
          lndProgress={lndProgress}
          bitcoindProgress={bitcoindProgress}
          lndLogLines={lndLogLines}
          logBox={this.logBox}
          lndDownloadProgress={lndDownloadProgress}
          bitcoindDownloadProgress={bitcoindDownloadProgress}
          downloadType={downloadType}
          bitcoindLogLines={bitcoindLogLines}
        />
      );
    }

    return <AutoLaunchStep />;
  };

  renderNavButtons = () => {
    const { step, maxStep, showNodeInfo, loadingServer, downloadCompleted } = this.state;

    if (showNodeInfo || loadingServer) {
      return null;
    }

    if (step < maxStep) {
      return (
        <div
          className={[styles.controlsBtn, styles.next].join(' ')}
          onClick={this.nextStep}
          role="button"
          tabIndex={0}
        >
          Next
          <i
            className="icon ion-ios-arrow-forward"
            style={{
              marginLeft: 10
            }}
          />
        </div>
      );
    }

    if (step === maxStep) {
      return (
        <div
          className={[styles.controlsBtn, styles.next].join(' ')}
          onClick={this.nextStep}
          role="button"
          tabIndex={0}
        >
          Done
          <i
            className="icon ion-ios-arrow-forward"
            style={{
              marginLeft: 10
            }}
          />
        </div>
      );
    }
  };

  downloadUpdate = () => {
    ipcRenderer.send('download-update');
    this.setState({
      updateProgress: {
        progress: 24
      }
    });
  };

  cancelUpdate = () => {
    ipcRenderer.send('cancel-update');
    this.setState({ updateDismissed: true, updateProgress: null, updatePending: false });
  };

  getUpdateBody = downloading => {
    const { updateProgress } = this.state;
    if (!downloading) {
      return (
        <div className={styles.updateDialogBody}>
          <p className={styles.updateDialogText}>
            A new update has been found for Shock services and/or LND, would you like to update?
          </p>
        </div>
      );
    }

    return (
      <div className={styles.updateDialogBody}>
        <p className={styles.updateDialogText}>Update is now downloading...</p>
        <div className={styles.updateDialogProgressContainer}>
          <div className={styles.updateDialogProgress}>
            <div
              className={styles.updateDialogProgressHighlight}
              style={{ width: (updateProgress?.percent ?? 0) + '%' }}
            />
          </div>
          <div className={styles.updateDialogProgressCancel} onClick={this.cancelUpdate}>
            <i class="fas fa-times" />
          </div>
        </div>
      </div>
    );
  };

  renderUpdatePopup = () => {
    const { updatePending, updateDismissed, updateDetails, updateProgress } = this.state;
    const updateHidden = !updatePending || updateDismissed;
    console.log(styles);
    return (
      <div className={[styles.updateDialog, updateHidden ? styles.dialogHidden : ''].join(' ')}>
        <div className={styles.updateDialogHeader}>
          <p className={styles.updateDialogHeaderTitle}>
            Update Available (v{updateDetails?.version})
          </p>
        </div>
        {this.getUpdateBody(updateProgress)}
        {!updateProgress ? (
          <div className={styles.updateDialogFooter}>
            <div
              className={[styles.updateDialogFooterBtn, styles.primaryFooterBtn].join(' ')}
              onClick={this.downloadUpdate}
            >
              <div className={styles.updateDialogFooterBtnText}>Update</div>
            </div>
            <div
              className={[styles.updateDialogFooterBtn, styles.secondaryFooterBtn].join('  ')}
              onClick={() => this.setState({ updateDismissed: true })}
            >
              <div className={styles.updateDialogFooterBtnText}>Remind me later</div>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  render() {
    const { step, showNodeInfo } = this.state;

    return (
      <div className={styles.container}>
        <div className={styles.shockLogo}>
          <img src={shockLogo} className={styles.logo} alt="ShockWizard Logo" />
        </div>
        {this.renderStep()}
        <div className={styles.stepControlsBar}>
          {!showNodeInfo ? (
            step > 1 ? (
              <div
                className={[styles.controlsBtn, styles.prev].join(' ')}
                onClick={this.prevStep}
                role="button"
                tabIndex={0}
              >
                <i
                  className="icon ion-ios-arrow-back"
                  style={{
                    marginRight: 10
                  }}
                />
                Previous
              </div>
            ) : (
              <div />
            )
          ) : null}
          {this.renderNavButtons()}
          {this.renderUpdatePopup()}
        </div>
      </div>
    );
  }
}
