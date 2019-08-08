import React, { Component } from 'react';

import { remote, ipcRenderer } from 'electron';
import localForage from 'localforage';

import { Link } from 'react-router-dom';
import AutoLaunch from 'auto-launch';

import { getUserPlatform } from '../../utils/os';
import routes from '../../constants/routes';

import { TARGET_LND_VERSION } from '../../constants/lnd';
import IntroStep from './IntroStep';
import InstallLocationStep from './InstallLocationStep';
import LndTypeStep from './LndTypeStep';
import NetworkSetupStep from './NetworkSetupStep';
import NetworkStep from './NetworkStep';
import NetworkURLStep from './NetworkURLStep';
import RPCStep from './RPCStep';
import NodeAPIStep from './NodeAPIStep';
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

    ipcRenderer.off('lnd-terminate', (event, pid) => {
      console.log('Unmounted');
    });

    ipcRenderer.off('bitcoind-terminate', (event, pid) => {
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
    const autoStartup = await localForage.getItem('autoStartup');
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
      console.log('Lnd Type');

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

  render() {
    const { step, maxStep, lndType } = this.state;

    return (
      <div className={styles.container}>
        <div className={styles.shockLogo}>
          <img src={shockLogo} className={styles.logo} />
        </div>
        {step === 1 ? (
          <IntroStep />
        ) : step === 2 ? (
          <NetworkStep />
        ) : step === 3 ? (
          <LndTypeStep />
        ) : step === 4 && lndType === 'neutrino' ? (
          <NetworkURLStep />
        ) : step === 4 && lndType === 'bitcoind' ? (
          // <RPCStep />
          <InstallLocationStep />
        ) : step === 5 ? (
          <AutoLaunchStep />
        ) : step === 6 ? (
          <NetworkSetupStep />
        ) : step === 7 ? (
          <WalletQRStep />
        ) : (
          <AutoLaunchStep />
        )}
        <div className={styles.stepControlsBar}>
          {step > 1 ? (
            <div
              className={[styles.controlsBtn, styles.prev].join(' ')}
              onClick={this.prevStep}
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
          {step < maxStep ? (
            <div
              className={[styles.controlsBtn, styles.next].join(' ')}
              onClick={this.nextStep}
            >
              Next
              <i
                className="icon ion-ios-arrow-forward"
                style={{
                  marginLeft: 10
                }}
              />
            </div>
          ) : step === maxStep ? (
            <div
              className={[styles.controlsBtn, styles.next].join(' ')}
              onClick={this.nextStep}
            >
              Done
              <i
                className="icon ion-ios-arrow-forward"
                style={{
                  marginLeft: 10
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    );
  }
}
