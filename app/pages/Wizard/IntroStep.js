import React, { Component } from 'react';
import styles from './css/index.css';

export default class IntroStep extends Component {
  render() {
    return (
      <div className={styles.container}>
        <div className={styles.wizardStepContainer}>
          <p className={styles.stepDescription}>
            Welcome to the Shock Wallet LND Wizard! Click the "Next" button
            below to proceed with the installation in order to setup all the
            required tools for Shock Wallet to run.
          </p>
        </div>
      </div>
    );
  }
}
