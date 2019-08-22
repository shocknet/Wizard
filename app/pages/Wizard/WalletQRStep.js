/* eslint-disable jsx-a11y/label-has-for */
/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { Component } from 'react';
import localForage from 'localforage';
import localIP from 'internal-ip';
import { QRCode } from 'react-qrcode-logo';
import styles from './css/index.css';

export default class LndTypeStep extends Component {
  state = {
    internalIP: '',
    externalIP: '',
    walletPort: ''
  };

  componentDidMount = async () => {
    const externalIP = await localForage.getItem('externalIP');
    const internalIP = await localIP.v4();
    this.setOption('internalIP', internalIP);
    this.setOption('externalIP', externalIP);
  };

  componentWillUnmount = () => {
    const { networkType } = this.state;
    this.setOption('networkType', networkType);
  };

  setOption = async (key, value) => {
    await localForage.setItem(key, value);
    console.log(key, value);
    this.setState({
      [key]: value
    });
  };

  render() {
    const { internalIP, walletPort, externalIP } = this.state;
    return (
      <div className={styles.container}>
        <div className={styles.wizardStepContainer}>
          <div className={styles.lndTypeContainer} style={{ width: '60%' }}>
            <p className={styles.stepTitle}>NETWORK SETUP</p>
            <p
              className={styles.stepDescription}
              style={{ width: '80%', marginBottom: 20 }}
            >
              Instructions for user to connect wallet to wizard api instance
              (Work in Progress)
            </p>
            <div className={styles.walletInfo}>
              <label
                htmlFor=""
                style={{
                  display: 'block',
                  padding: '0px 0px',
                  margin: 'auto',
                  fontWeight: 600
                }}
              >
                Internal IP: {internalIP}
              </label>
              <label
                htmlFor=""
                style={{
                  display: 'block',
                  padding: '0px 0px',
                  margin: 'auto',
                  fontWeight: 600
                }}
              >
                External IP: {externalIP}
              </label>
            </div>
            <div className={styles.walletQRCode}>
              <p className={styles.QRCodeDesc}>
                Scan QR Code with ShockWallet:
              </p>
              <QRCode
                bgColor="#F5A623"
                fgColor="#21355a"
                value={`shockwallet://scan_wallet_code/${internalIP}/${externalIP}/${walletPort}`}
                ecLevel="M"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}
