/* eslint-disable jsx-a11y/label-has-for */
/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { Component } from 'react';
import { remote } from 'electron';
import localForage from 'localforage';
import styles from './css/index.css';

export default class NetworkURLStep extends Component {
  state = {
    networkUrl: 'neutrino.shock.network'
  };

  componentDidMount = () => {
    const { networkUrl } = this.state;
    this.setOption('networkUrl', networkUrl);
  };

  setOption = (key, value) => {
    this.setState({
      [key]: value
    });
    return localForage.setItem(key, value);
  };

  componentWillUnmount = () => {
    this.setOption('networkUrl', this.state.networkUrl);
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
                textAlign: 'left'
              }}
            >
              Please specify the network url you wish to run the lnd wizard on:
            </p>
            <div className={styles.stepInputContainer}>
              <input
                type="text"
                className={styles.stepInput}
                onChange={e => this.setOption('networkUrl', e.target.value)}
                value={networkUrl}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}
