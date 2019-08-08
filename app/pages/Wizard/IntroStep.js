import React, { Component } from 'react';
import { shell } from 'electron';
import styles from './css/index.css';

export default class IntroStep extends Component {
  render() {
    return (
      <div className={styles.container}>
        <div className={styles.wizardStepContainer}>
          <span className={styles.warning}>
            Note that this is alpha software and there are likely to be bugs, so
            do not risk more funds than you are willing to lose in testing.
          </span>
          <p className={styles.stepDescription}>
            Welcome to the ShockWallet Wizard.
            <br />
            <br />
            This tool will walk you through the setup of your own Lightning node
            for use with the ShockWallet App, and if desired, a fully-validating
            Bitcoin Core node.
            <br />
            <br />
            Please submit any issues or requests for support at{' '}
            <a
              href="https://github.com/shocknet/Wizard/issues"
              onClick={e => {
                e.preventDefault();
                shell.openExternal('https://github.com/shocknet/Wizard/issues');
              }}
            >
              https://github.com/shocknet/Wizard/issues
            </a>
          </p>
        </div>
      </div>
    );
  }
}
