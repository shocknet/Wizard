/* eslint-disable jsx-a11y/label-has-for */
/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { Component } from 'react';
import { remote } from 'electron';
import localForage from 'localforage';
import path from 'path';
import styles from './css/index.css';

export default class InstallLocationStep extends Component {
  state = {
    installLocation: ''
  };

  componentDidMount = async () => {
    const installLocation = await localForage.getItem('installLocation');
    this.setOption('installLocation', installLocation);
  };

  componentWillUnmount = () => {
    const { installLocation } = this.state;
    this.setOption('installLocation', installLocation);
  };

  setOption = (key, value) => {
    this.setState({
      [key]: value
    });
    return localForage.setItem(key, value);
  };

  chooseFolder = () => {
    const folder = remote.dialog.showOpenDialog({
      properties: ['openDirectory']
    })[0];

    console.log(folder);
    this.setOption('installLocation', folder);
  };

  render() {
    const { installLocation } = this.state;
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
                onChange={e =>
                  this.setOption('installLocation', e.target.value)
                }
                value={installLocation}
              />
              <div
                className={styles.chooseFolderBtn}
                onClick={this.chooseFolder}
              >
                Choose Folder
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
