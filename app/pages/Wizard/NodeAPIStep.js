import React, { Component } from 'react';
import localForage from 'localforage';
import logger from 'electron-log';
import styles from './css/index.css';

export default class NodeAPIStep extends Component {
  state = {
    nodeAPI: true,
  };

  componentWillUnmount = () => {
    const { nodeAPI } = this.state;
    this.setStatus('nodeAPI', nodeAPI);
  };

  setStatus = async (status, value) => {
    await localForage.setItem(status, value);
    logger.info(status, value);
    this.setState({
      [status]: value,
    });
  };

  render() {
    return (
      <div className={styles.container}>
        <div className={styles.wizardStepContainer}>
          <div className={styles.lndTypeContainer}>
            <p className={styles.stepTitle}>SHOCKAPI</p>
            <p
              className={styles.stepDescription}
              style={{
                textAlign: 'left',
              }}
            >
              Do you want to expose your LND Server over the ShockAPI? (Running at port 9835)
            </p>
            <div className={styles.stepChoices}>
              <label className={styles.stepChoice}>
                <input
                  type="radio"
                  name="nodeAPI"
                  value="yes"
                  checked
                  onChange={(e) => this.setStatus('nodeAPI', e.target.value)}
                />
                <span className={styles.checkmark} />
                Yes
              </label>
              <label className={styles.stepChoice}>
                <input
                  type="radio"
                  name="nodeAPI"
                  value="no"
                  onChange={(e) => this.setStatus('nodeAPI', e.target.value)}
                />
                <span className={styles.checkmark} />
                No
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
