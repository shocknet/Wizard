import React, { Component } from 'react';
import localForage from 'localforage';
import logger from 'electron-log';
import styles from './css/index.css';

export default class LndTypeStep extends Component {
  state = {
    networkType: '',
  };

  componentDidMount = async () => {
    this.setOption('networkType', 'mainnet');
  };

  componentWillUnmount = () => {
    const { networkType } = this.state;
    this.setOption('networkType', networkType);
  };

  setOption = async (key, value) => {
    await localForage.setItem(key, value);
    logger.info(key, value);
    this.setState({
      [key]: value,
    });
  };

  render() {
    const { networkType } = this.state;
    return (
      <div className={styles.container}>
        <div className={styles.wizardStepContainer}>
          <div className={styles.lndTypeContainer}>
            <p className={styles.stepTitle}>BITCOIN NETWORK TYPE</p>
            <p
              className={styles.stepDescription}
              style={{
                textAlign: 'left',
              }}
            >
              Please choose a Network type for your LND Node (Only Mainnet is supported for now)
            </p>
            <div className={styles.stepChoices}>
              {/* <label className={styles.stepChoice}>
                <input
                  type="radio"
                  name="lnd-type"
                  value="testnet"
                  checked={networkType === 'testnet'}
                  onChange={e => this.setOption('networkType', e.target.value)}
                />
                <span className={styles.checkmark} />
                Testnet (default)
              </label> */}
              <label className={styles.stepChoice}>
                <input
                  type="radio"
                  name="lnd-type"
                  value="mainnet"
                  checked={networkType === 'mainnet'}
                  onChange={(e) => this.setOption('networkType', e.target.value)}
                />
                <span className={styles.checkmark} />
                Mainnet
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
