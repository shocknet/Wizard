import React, { Component } from 'react';

import { remote, ipcRenderer } from 'electron';
import localForage from 'localforage';

import AutoLaunch from 'auto-launch';

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
import shockLogo from '../../img/logo.svg';

export default class Home extends Component {
  state = {
    step: 1,
    maxStep: 7,
    lndType: 'neutrino'
  };

  componentDidMount = async () => {
    ipcRenderer.on('lnd-start', () => {
      console.log('lnd-start');
      this.runLnd();
    });

    ipcRenderer.on('bitcoind-start', () => {
      console.log('bitcoind-start');
      this.runBitcoind();
    });

    ipcRenderer.on('lnd-terminate', (event, pid) => {
      console.log('lnd-terminate', event, pid);
      Lnd.terminate();
    });

    ipcRenderer.on('bitcoind-terminate', (event, pid) => {
      console.log('bitcoind-terminate', event, pid);
      Bitcoind.terminate();
    });

    ipcRenderer.on('restart-setup', async () => {
      localForage.setItem('setupCompleted', false);
      this.setState({
        step: 1
      });
    });

    const setupCompleted = await localForage.getItem('setupCompleted');
    if (setupCompleted) {
      await this.runLnd();
      await this.runBitcoind();
    } else {
      remote.BrowserWindow.getAllWindows().map(window => window.show());
    }
  };

  componentWillUnmount = () => {
    ipcRenderer.off('lnd-start', () => {
      console.log('Unmounted');
    });

    ipcRenderer.off('bitcoind-start', () => {
      console.log('Unmounted');
    });

    ipcRenderer.off('lnd-terminate', () => {
      console.log('Unmounted');
    });

    ipcRenderer.off('bitcoind-terminate', () => {
      console.log('Unmounted');
    });

    Lnd.terminate();
    Bitcoind.terminate();
  };

  runLnd = async () => {
    const setupCompleted = await localForage.getItem('setupCompleted');
    const autoStartup = await localForage.getItem('autoStartup');
    const externalIP = await localForage.getItem('externalIP');

    ipcRenderer.send('externalIP', externalIP);

    if (setupCompleted) {
      await Lnd.download({
        version: TARGET_LND_VERSION,
        os: getUserPlatform()
      });
      await Lnd.start();

      // this.setState({
      //   step: 1
      // });

      if (autoStartup) {
        const startup = new AutoLaunch({
          name: 'LNDServer'
        });
        const startupEnabled = await startup.isEnabled();
        console.log('Startup Enabled:', startupEnabled);
        if (!startupEnabled) {
          await startup.enable();
          console.log('Startup Enabled');
        }
      }
    }
    return true;
  };

  runBitcoind = async () => {
    const setupCompleted = await localForage.getItem('setupCompleted');
    const lndType = await localForage.getItem('lndType');
    if (setupCompleted && lndType === 'bitcoind') {
      await Bitcoind.download({
        version: '0.18.0',
        os: getUserPlatform(true)
      });
      await Bitcoind.start();
      this.setState({
        step: 1
      });
    }
    return true;
  };

  nextStep = async () => {
    const { step, maxStep } = this.state;
    console.log('nextStep', step, step === 3);

    if (step === maxStep) {
      remote.BrowserWindow.getFocusedWindow().hide();

      // eslint-disable-next-line no-new
      new Notification('LND Server Setup', {
        body:
          'The setup will now run in the background and download all the required files and notify you once everything is done!'
      });
      await localForage.setItem('setupCompleted', true);
      await this.runLnd();
      await this.runBitcoind();
    } else if (step === 3) {
      console.log(step);
      const lndType = await localForage.getItem('lndType');
      console.log('Lnd Type', lndType);
      this.setState({
        lndType,
        step: step + 1
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
    const { step, lndType } = this.state;

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
      return <WalletQRStep />;
    }

    return <AutoLaunchStep />;
  };

  renderNavButtons = () => {
    const { step, maxStep } = this.state;
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

  render() {
    const { step } = this.state;

    return (
      <div className={styles.container}>
        <div className={styles.shockLogo}>
          <img src={shockLogo} className={styles.logo} alt="ShockWizard Logo" />
        </div>
        {this.renderStep()}
        <div className={styles.stepControlsBar}>
          {step > 1 ? (
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
          )}
          {this.renderNavButtons()}
        </div>
      </div>
    );
  }
}
