import React, { Component } from 'react';
import localForage from 'localforage';
import logger from 'electron-log';
import styles from './css/index.css';

export default class RPCStep extends Component {
  state = {
    rpcUser: '',
    rpcPass: '',
  };

  componentWillUnmount = () => {
    const { rpcUser, rpcPass } = this.state;
    this.setOption('rpcUser', rpcUser);
    this.setOption('rpcPass', rpcPass);
  };

  setOption = async (key, value) => {
    await localForage.setItem(key, value);
    logger.info(key, value);
    this.setState({
      [key]: value,
    });
  };

  render() {
    const { rpcUser, rpcPass } = this.state;
    return (
      <div className={styles.container}>
        <div className={styles.wizardStepContainer}>
          <div className={styles.lndTypeContainer}>
            <p className={styles.stepTitle}>BITCOIN CORE RPC SETUP</p>
            <p
              className={styles.stepDescription}
              style={{
                textAlign: 'left',
              }}
            >
              Please input the credentials for your Bitcoin Core RPC
            </p>
            <div className={styles.stepChoices} style={{ width: '100%' }}>
              <div className={styles.stepInputContainer} style={{ width: '100%' }}>
                <input
                  type="text"
                  style={{ width: '100%' }}
                  className={styles.stepInput}
                  placeholder="RPC Username"
                  onChange={(e) => this.setOption('rpcUser', e.target.value)}
                  value={rpcUser}
                />
              </div>
              <div className={styles.stepInputContainer} style={{ width: '100%' }}>
                <input
                  type="password"
                  style={{ width: '100%' }}
                  className={styles.stepInput}
                  placeholder="RPC Password"
                  onChange={(e) => this.setOption('rpcPass', e.target.value)}
                  value={rpcPass}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
