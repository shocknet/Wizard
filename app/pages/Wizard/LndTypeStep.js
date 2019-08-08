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
    this.setState({
      [key]: value
    });
    console.log(key, value);
    return localForage.setItem(key, value);
  };

  componentWillUnmount = () => {
    this.setOption('lndType', this.state.lndType);
  };

  render() {
    const { lndType } = this.state;
    return (
      <div className={styles.container}>
        <div className={styles.wizardStepContainer}>
          <div className={styles.lndTypeContainer}>
            <p className={styles.stepTitle}>LND SYNC MODE</p>
            <div className={styles.stepChoices}>
              <label className={styles.stepChoice}>
                <input
                  type="radio"
                  name="lnd-type"
                  value="neutrino"
                  onChange={e => this.setOption('lndType', e.target.value)}
                  checked={lndType === 'neutrino'}
                />
                <span className={styles.checkmark} />
                <div className={styles.choiceInfoContainer}>
                  <b>Neutrino</b>
                  <p className={styles.radioDesc}>
                    A privacy preserving protocol for reading the blockchain
                    data through trusted servers. Shock Network provides
                    Neutrino servers for public use on Mainnet or Testnet.
                    Alternatively, you can specify different servers. (default)
                  </p>
                </div>
              </label>
              <label className={styles.stepChoice}>
                <input
                  type="radio"
                  name="lnd-type"
                  value="bitcoind"
                  onChange={e => this.setOption('lndType', e.target.value)}
                  checked={lndType === 'bitcoind'}
                />
                <span className={styles.checkmark} />
                <div className={styles.choiceInfoContainer}>
                  <b>Bitcoin Core</b>
                  <p className={styles.radioDesc}>
                    Discerning users that require a fully-validating, trustless
                    node, should opt to install Bitcoin Core. This currently
                    requires at minimum 300GB of disk space, and may require
                    from 8-24 hours to fully synchronize.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
