import React, { Component } from 'react';
import { remote } from 'electron';
import localForage from 'localforage';
import { Link } from 'react-router-dom';
import AutoLaunch from 'auto-launch';

import { getUserPlatform } from '../../utils/os';
import routes from '../../constants/routes';
import { TARGET_LND_VERSION } from '../../constants/lnd';
import IntroStep from './IntroStep';
import LndTypeStep from './LndTypeStep';
import NetworkStep from './NetworkStep';
import AutoLaunchStep from './AutoLaunchStep';
import Lnd from '../../utils/lnd';
import styles from './css/index.css';

export default class Home extends Component {
  state = {
    step: 1,
    maxStep: 4
  };

  componentDidMount = async () => {
    const setupCompleted = await localForage.getItem('setupCompleted');
    if (setupCompleted) {
      await this.runLnd();
    } else {
      remote.BrowserWindow.getAllWindows().map(window => window.show());
    }
  };

  runLnd = async () => {
    const setupCompleted = await localForage.getItem('setupCompleted');
    const autoStartup = await localForage.getItem('autoStartup');
    if (setupCompleted) {
      await Lnd.download({
        version: TARGET_LND_VERSION,
        os: getUserPlatform()
      });
      await Lnd.start();
      this.setState({
        step: 1
      });
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

  nextStep = async () => {
    const { step, maxStep } = this.state;
    if (step === maxStep) {
      remote.BrowserWindow.getFocusedWindow().hide();
      new Notification('LND Server Setup', {
        body:
          'The setup will now run in the background and download all the required files and notify you once everything is done!'
      });
      await localForage.setItem('setupCompleted', true);
      await this.runLnd();
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
    const { step, maxStep } = this.state;
    return (
      <div className={styles.container}>
        <p className={styles.shockLogo}>
          SHOCK<span className={styles.bold}>WALLET</span>
        </p>
        {step === 1 ? (
          <IntroStep />
        ) : step === 2 ? (
          <LndTypeStep />
        ) : step === 3 ? (
          <NetworkStep />
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
            <div className={styles.controlsBtn} onClick={this.nextStep}>
              Next
              <i
                className="icon ion-ios-arrow-forward"
                style={{
                  marginLeft: 10
                }}
              />
            </div>
          ) : step === maxStep ? (
            <div className={styles.controlsBtn} onClick={this.nextStep}>
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
