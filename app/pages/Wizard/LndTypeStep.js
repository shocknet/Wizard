import React, { Component } from 'react';
import localForage from 'localforage';
import logger from 'electron-log';
import styles from './css/index.css';

export default class LndTypeStep extends Component {
  state = {
    lndType: 'neutrino',
  };

  componentDidMount = () => {
    this.setOption('lndType', 'neutrino');
  };

  componentWillUnmount = () => {
    const { lndType } = this.state;
    this.setOption('lndType', lndType);
  };

  setOption = async (key, value) => {
    await localForage.setItem(key, value);
    logger.info(key, value);
    this.setState({
      [key]: value,
    });
  };

  render() {
    const { lndType } = this.state;
    return (
      <div className={styles.container}>
        <div className={styles.wizardStepContainer}>
          <div className={styles.lndTypeContainer}>
            <p className={styles.stepTitle}>CHAIN SYNC METHOD</p>
            <div className={styles.stepChoices}>
              <label className={styles.stepChoice}>
                <input
                  type="radio"
                  name="lnd-type"
                  value="neutrino"
                  onChange={(e) => this.setOption('lndType', e.target.value)}
                  checked={lndType === 'neutrino'}
                />
                <span className={styles.checkmark} />
                <div className={styles.choiceInfoContainer}>
                  <b>Neutrino</b>
                  <p className={styles.radioDesc}>
                    A privacy preserving protocol for reading compressed blockchain data instantly. Shock
                    Network provides public Neutrino servers by default. Alternatively, you can specify different servers.
                  </p>
                </div>
              </label>
              <label className={styles.stepChoice}>
                <input
                  type="radio"
                  name="lnd-type"
                  value="bitcoind"
                  onChange={(e) => this.setOption('lndType', e.target.value)}
                  checked={lndType === 'bitcoind'}
                />
                <span className={styles.checkmark} />
                <div className={styles.choiceInfoContainer}>
                  <b>Bitcoin Core</b>
                  <p className={styles.radioDesc}>
                    Discerning users that require a fully-validating node may opt to
                    install Bitcoin Core. This currently requires at minimum 400GB of disk space,
                    and may take day or more to fully synchronize.
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
