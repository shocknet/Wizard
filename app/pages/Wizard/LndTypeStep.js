/* eslint-disable jsx-a11y/label-has-for */
/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { Component } from 'react';
import localForage from 'localforage';
import styles from './css/index.css';

export default class LndTypeStep extends Component {
  state = {
    lndType: 'neutrino'
  };

  setOption = (key, value) => {
    return localForage.setItem(key, value);
  };

  componentWillUnmount = () => {
    this.setOption('lndType', this.state.lndType);
  };

  render() {
    return (
      <div className={styles.container}>
        <div className={styles.wizardStepContainer}>
          <div className={styles.lndTypeContainer}>
            <p className={styles.stepTitle}>LND SYNC MODE</p>
            <p
              className={styles.stepDescription}
              style={{
                textAlign: 'left'
              }}
            >
              Choose which type of LND you wish to have installed, choosing
              Neutrino will sync up your LND instance to the latest block
              without downloading all of the past blocks' data. choosing Bitcoin
              Core will download all of the block data for Bitcoin which
              requires ~300GB of free space but results in a faster LND
              installation.
            </p>
            <div className={styles.stepChoices}>
              <label className={styles.stepChoice}>
                <input type="radio" name="lnd-type" value="neutrino" checked />
                <span className={styles.checkmark} />
                Neutrino
              </label>
              <label className={styles.stepChoice}>
                <input type="radio" name="lnd-type" value="bitcoinCore" />
                <span className={styles.checkmark} />
                Bitcoin Core
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
