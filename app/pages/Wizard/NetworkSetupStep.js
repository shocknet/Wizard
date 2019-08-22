/* eslint-disable jsx-a11y/label-has-for */
/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { Component } from 'react';
import localForage from 'localforage';
import publicIP from 'public-ip';
import styles from './css/index.css';

export default class LndTypeStep extends Component {
  state = {
    lightningPort: 9735,
    walletPort: 9835,
    externalIP: ''
  };

  componentDidMount = async () => {
    const externalIP = await publicIP.v4();
    this.setOption('externalIP', externalIP);
  };

  componentWillUnmount = () => {
    const { externalIP, walletPort, lightningPort } = this.state;
    this.setOption('externalIP', externalIP);
    this.setOption('walletPort', walletPort);
    this.setOption('lightningPort', lightningPort);
  };

  setOption = async (key, value) => {
    await localForage.setItem(key, value);
    console.log(key, value);
    this.setState({
      [key]: value
    });
  };

  render() {
    const { lightningPort, walletPort, externalIP } = this.state;
    return (
      <div className={styles.container}>
        <div className={styles.wizardStepContainer}>
          <div className={styles.lndTypeContainer} style={{ width: '60%' }}>
            <p className={styles.stepTitle}>NETWORK SETUP</p>
            <label
              htmlFor=""
              style={{
                display: 'block',
                width: '80%',
                padding: '0px 0px',
                margin: 'auto',
                fontWeight: 600
              }}
            >
              Lightning Port
            </label>
            <div
              className={styles.stepInputContainer}
              style={{
                width: '80%',
                padding: '10px 20px',
                marginBottom: 15
              }}
            >
              <input
                type="text"
                className={styles.stepInput}
                style={{ width: '100%' }}
                onChange={e => this.setOption('lightningPort', e.target.value)}
                value={lightningPort}
                placeholder="Lightning Port"
              />
            </div>
            <label
              htmlFor=""
              style={{
                display: 'block',
                width: '80%',
                padding: '0px 0px',
                margin: 'auto',
                fontWeight: 600
              }}
            >
              Wallet Port
            </label>
            <div
              className={styles.stepInputContainer}
              style={{
                width: '80%',
                padding: '10px 20px',
                marginBottom: 15
              }}
            >
              <input
                type="text"
                className={styles.stepInput}
                style={{ width: '100%' }}
                onChange={e => this.setOption('walletPort', e.target.value)}
                value={walletPort}
                placeholder="Wallet Port"
              />
            </div>
            <label
              htmlFor=""
              style={{
                display: 'block',
                width: '80%',
                padding: '0px 0px',
                margin: 'auto',
                fontWeight: 600
              }}
            >
              External IP
            </label>
            <div
              className={styles.stepInputContainer}
              style={{
                width: '80%',
                padding: '10px 20px',
                marginBottom: 5
              }}
            >
              <input
                type="text"
                className={styles.stepInput}
                style={{ width: '100%' }}
                onChange={e => this.setOption('externalIP', e.target.value)}
                value={externalIP}
                placeholder="External IP"
              />
            </div>
            <p className={styles.stepInputDesc}>
              If you are on a residential or cellular connection, your IP likely changes regularly.
              Consider a Dynamic DNS service like no-ip.org if you encounter this issue. If you are
              already using a DNS name, enter it here in place of your external IP.
            </p>
          </div>
        </div>
      </div>
    );
  }
}
