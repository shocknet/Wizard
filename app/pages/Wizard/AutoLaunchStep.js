/* eslint-disable jsx-a11y/label-has-for */
/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { Component } from 'react';
import localForage from 'localforage';
import styles from './css/index.css';

export default class LndTypeStep extends Component {
  state = {
    autoStartup: 'yes'
  };

  setStatus = (status, value) => {
    localForage.setItem(status, value === 'yes');
    this.setState({
      [status]: value === 'yes'
    });
  };

  componentWillUnmount = () => {
    this.setStatus('autoStartup', this.state.autoStartup);
  };

  render() {
    return (
      <div className={styles.container}>
        <div className={styles.wizardStepContainer}>
          <div className={styles.lndTypeContainer}>
            <p className={styles.stepTitle}>AUTO-STARTUP</p>
            <p
              className={styles.stepDescription}
              style={{
                textAlign: 'left'
              }}
            >
              Do you wish to have the LND Server automatically start up on boot?
            </p>
            <div className={styles.stepChoices}>
              <label className={styles.stepChoice}>
                <input
                  type="radio"
                  name="lnd-type"
                  value="yes"
                  checked
                  onChange={e => this.setStatus('autoStartup', e.target.value)}
                />
                <span className={styles.checkmark} />
                Yes
              </label>
              <label className={styles.stepChoice}>
                <input
                  type="radio"
                  name="lnd-type"
                  value="no"
                  onChange={e => this.setStatus('autoStartup', e.target.value)}
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
