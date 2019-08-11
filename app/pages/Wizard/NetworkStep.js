/* eslint-disable jsx-a11y/label-has-for */
/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { Component } from 'react';
import localForage from 'localforage';
import styles from './css/index.css';

export default class LndTypeStep extends Component {
  state = {
    networkType: ''
  };

  componentDidMount = async () => {
    this.setOption('networkType', 'testnet');
  };

  componentWillUnmount = () => {
    this.setOption('networkType', this.state.networkType);
  };

  setOption = async (key, value) => {
    await localForage.setItem(key, value);
    console.log(key, value);
    this.setState({
      [key]: value
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
                textAlign: 'left'
              }}
            >
              Would you like to experiment on Testnet, or are you #Reckless?
            </p>
            <div className={styles.stepChoices}>
              <label className={styles.stepChoice}>
                <input
                  type="radio"
                  name="lnd-type"
                  value="testnet"
                  checked={networkType === 'testnet'}
                  onChange={e => this.setOption('networkType', e.target.value)}
                />
                <span className={styles.checkmark} />
                Testnet (default)
              </label>
              <label className={styles.stepChoice}>
                <input
                  type="radio"
                  name="lnd-type"
                  value="mainnet"
                  checked={networkType === 'mainnet'}
                  onChange={e => this.setOption('networkType', e.target.value)}
                />
                <span className={styles.checkmark} />
                Mainnet (#Reckless)
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
