/* eslint-disable jsx-a11y/label-has-for */
/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { Component, Fragment } from 'react';
import localForage from 'localforage';
import localIP from 'internal-ip';
import { QRCode } from 'react-qrcode-logo';
import logger from 'electron-log';
import Lnd from '../../utils/lnd';
import Bitcoind from '../../utils/bitcoind';
import styles from './css/index.css';

export default class WalletQRStep extends Component {
  state = {
    activeTab: 'info',
    internalIP: '',
    externalIP: '',
    walletPort: '9835',
    lndLogLines: [],
    bitcoindProgress: 0,
    lndProgress: 0,
    bitcoindLogLines: []
  };

  logBox = React.createRef();

  componentDidMount = async () => {
    const externalIP = await localForage.getItem('externalIP');
    const internalIP = await localIP.v4();
    this.setOption('internalIP', internalIP);
    this.setOption('externalIP', externalIP);
    Lnd.onData(data => {
      const { lndLogLines } = this.state;
      this.setState(
        {
          lndLogLines: [...lndLogLines, data]
        },
        () => {
          if (this.logBox.current) {
            this.logBox.current.scrollTo(0, this.logBox.current.scrollHeight);
          }
        }
      );
    });

    Bitcoind.onData(data => {
      const { bitcoindLogLines } = this.state;
      this.setState(
        {
          bitcoindLogLines: [...bitcoindLogLines, data]
        },
        () => {
          if (this.logBox.current) {
            this.logBox.current.scrollTo(0, this.logBox.current.scrollHeight);
          }
        }
      );
    });
  };

  componentWillUnmount = () => {
    const { networkType } = this.state;
    this.setOption('networkType', networkType);
    Lnd.offData();
    Bitcoind.offData();
  };

  setOption = async (key, value) => {
    await localForage.setItem(key, value);
    logger.info(key, value);
    this.setState({
      [key]: value
    });
  };

  setActiveTab = tab => {
    this.setState({
      activeTab: tab
    });
  };

  renderTabs = () => {
    const { showNodeInfo, lndType } = this.props;
    const { activeTab } = this.state;
    if (!showNodeInfo) {
      return null;
    }

    return (
      <div className={styles.stepTabs}>
        <div
          className={styles.stepTab}
          style={activeTab === 'info' ? { backgroundColor: '#d08a15' } : {}}
          onClick={() => this.setActiveTab('info')}
        >
          <p>Information</p>
        </div>
        <div
          className={styles.stepTab}
          style={activeTab === 'lnd' ? { backgroundColor: '#d08a15' } : {}}
          onClick={() => this.setActiveTab('lnd')}
        >
          <p>LND Logs</p>
        </div>
        {lndType === 'bitcoind' ? (
          <div
            className={styles.stepTab}
            style={activeTab === 'bitcoind' ? { backgroundColor: '#d08a15' } : {}}
            onClick={() => this.setActiveTab('bitcoind')}
          >
            <p>Bitcoind Logs</p>
          </div>
        ) : null}
      </div>
    );
  };

  renderQRCode = () => {
    const { internalIP, walletPort, externalIP, activeTab } = this.state;
    const { loadingServer, showNodeInfo, lndProgress, bitcoindProgress, lndType } = this.props;
    return (
      <Fragment>
        <p className={styles.stepDescription} style={{ marginBottom: 20 }}>
          Scan the QR Code with the mobile app to import your IP addresses.
          <br />
          <br />
          Reminder: Your network may require NAT Forwarding/Firewall Rules
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
          <p className={styles.QRCodeDesc}>Scan QR Code with ShockWallet:</p>
          {loadingServer ? (
            <span>
              Please wait while we're downloading LND and/or Bitcoind...
              <br />
              {lndType === 'bitcoind' ? (lndProgress + bitcoindProgress) / 2 : lndProgress}%
            </span>
          ) : (
            <QRCode
              bgColor="#F5A623"
              fgColor="#21355a"
              value={`{ "externalIP": "${externalIP}", "internalIP": "${internalIP}", "walletPort": "${walletPort}" }`}
              ecLevel="M"
            />
          )}
        </div>
      </Fragment>
    );
  };

  renderLNDLogs = () => {
    logger.info('lndLogLines', Lnd);
    const { lndLogLines } = this.state;
    return (
      <div className={styles.lndLogsContainer}>
        <div className={styles.logsBox} ref={this.logBox}>
          {lndLogLines ? lndLogLines.map(line => <p className={styles.logEntry}>{line}</p>) : null}
        </div>
      </div>
    );
  };

  renderBitcoindLogs = () => {
    const { bitcoindLogLines } = this.state;
    logger.info('bitcoindLogLines', bitcoindLogLines);
    return (
      <div className={styles.lndLogsContainer}>
        <div className={styles.logsBox} ref={this.logBox}>
          {bitcoindLogLines
            ? bitcoindLogLines.map(line => <p className={styles.logEntry}>{line}</p>)
            : null}
        </div>
      </div>
    );
  };

  render() {
    const { activeTab } = this.state;
    const { loadingServer, showNodeInfo } = this.props;
    return (
      <div className={styles.container}>
        <div className={styles.wizardStepContainer} style={{ justifyContent: 'flex-start' }}>
          <div
            className={[styles.lndTypeContainer, styles.nodeInfo].join(' ')}
            style={{
              height: !showNodeInfo ? '60%' : '100%',
              justifyContent: !showNodeInfo ? 'center' : 'flex-start'
            }}
          >
            <p className={styles.stepTitle}>
              {showNodeInfo ? 'NODE INFORMATION' : 'NETWORK SETUP'}
            </p>
            {this.renderTabs()}
            {activeTab === 'info'
              ? this.renderQRCode()
              : activeTab === 'lnd'
              ? this.renderLNDLogs()
              : this.renderBitcoindLogs()}
          </div>
        </div>
      </div>
    );
  }
}
