import React, { Component } from 'react';
import localForage from 'localforage';
import logger from 'electron-log';
import styles from './css/index.css';

export default class NetworkURLStep extends Component {
  state = {
    networkUrl: '',
  };

  componentDidMount = async () => {
    const networkType = await localForage.getItem('networkType');
    if (networkType === 'testnet') {
      this.setOption('networkUrl', 'faucet.lightning.community');
    } else {
      this.setOption('networkUrl', 'neutrino.shock.network');
    }
  };

  componentWillUnmount = () => {
    const { networkUrl } = this.state;
    this.setOption('networkUrl', networkUrl);
  };

  setOption = async (key, value) => {
    await localForage.setItem(key, value);
    logger.info(key, value);
    this.setState({
      [key]: value,
    });
  };

  render() {
    const { networkUrl } = this.state;
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
              Please specify the neutrino peer you wish to synch the blockchain from:
            </p>
            <div
              className={styles.stepInputContainer}
              style={{
                width: '80%',
                padding: '10px 20px',
              }}
            >
              <input
                type="text"
                className={styles.stepInput}
                style={{ width: '100%' }}
                onChange={(e) => this.setOption('networkUrl', e.target.value)}
                value={networkUrl}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}
