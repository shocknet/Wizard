/* eslint-disable jsx-a11y/label-has-for */
/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { Component } from 'react';
import localForage from 'localforage';
import styles from './css/index.css';

export default class NodeAPIStep extends Component {
  state = {
    nodeAPI: true
  };

  componentWillUnmount = () => {
    const { nodeAPI } = this.state;
    this.setStatus('nodeAPI', nodeAPI);
  };

  setStatus = (status, value) => {
    localForage.setItem(status, value === 'yes');
    this.setState({
      [status]: value === 'yes'
    });
  };

  render() {
    return (
      <div className={styles.container}>
        <div className={styles.wizardStepContainer}>
          <div className={styles.lndTypeContainer}>
            <p className={styles.stepTitle}>SHOCKAPI</p>
            <p
              className={styles.stepDescription}
              style={{
                textAlign: 'left'
              }}
            >
              Do you want to expose your LND Server over the ShockAPI? (Running
              at port 9835)
            </p>
            <div className={styles.stepChoices}>
              <label className={styles.stepChoice}>
                <input
                  type="radio"
                  name="nodeAPI"
                  value="yes"
                  checked
                  onChange={e => this.setStatus('nodeAPI', e.target.value)}
                />
                <span className={styles.checkmark} />
                Yes
              </label>
              <label className={styles.stepChoice}>
                <input
                  type="radio"
                  name="nodeAPI"
                  value="no"
                  onChange={e => this.setStatus('nodeAPI', e.target.value)}
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
