import React, { Component } from 'react';
import localForage from 'localforage';
import logger from 'electron-log';
import styles from './css/index.css';

export default class LndTypeStep extends Component {
  state = {
    autoStartup: 'yes',
  };

  componentWillUnmount = () => {
    const { autoStartup } = this.state;
    this.setStatus('autoStartup', autoStartup);
  };

  setStatus = async (key, value) => {
    await localForage.setItem(key, value);
    logger.info(key, value);
    this.setState({
      [key]: value,
    });
  };

  render() {
    return (
      <div className={styles.container}>
        <div className={styles.wizardStepContainer}>
          <div className={styles.lndTypeContainer}>
            <p className={styles.stepTitle}>AUTOMATIC STARTUP</p>
            <p
              className={styles.stepDescription}
              style={{
                textAlign: 'left',
              }}
            >
              Automatically start the node on system boot?
            </p>
            <div className={styles.stepChoices}>
              <label className={styles.stepChoice}>
                <input
                  type="radio"
                  name="lnd-type"
                  value="yes"
                  checked
                  onChange={(e) => this.setStatus('autoStartup', e.target.value)}
                />
                <span className={styles.checkmark} />
                Yes
              </label>
              <label className={styles.stepChoice}>
                <input
                  type="radio"
                  name="lnd-type"
                  value="no"
                  onChange={(e) => this.setStatus('autoStartup', e.target.value)}
                />
                <span className={styles.checkmark} />
                No
              </label>
            <p
              className={styles.stepDescription}
              style={{
                textAlign: 'left',
              }}
            >
              You may still need to configure your operating system to automatically log in as the installing user.
            </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
