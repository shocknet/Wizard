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
  state = { activeTab: 'info', internalIP: '', externalIP: '', walletPort: '9835' };

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
    logger.info(key, value);
    this.setState({ [key]: value });
  };

  setActiveTab = tab => {
    this.setState({ activeTab: tab });
  };

  renderTabs = () => {
    const { showNodeInfo, lndType, loadingServer, downloadCompleted } = this.props;
    const { activeTab } = this.state;
    if (!showNodeInfo && !(!loadingServer && !downloadCompleted)) {
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

  getProgressRate = ({
    type,
    lndProgress = 0,
    bitcoindProgress = 0,
    lndDownloadProgress = 0,
    bitcoindDownloadProgress = 0
  }) => {
    if (type === 'bitcoind') {
      return {
        totalProgress: (lndProgress + bitcoindProgress) / 2,
        downloadCompleted: bitcoindDownloadProgress === 100,
        syncProgress: bitcoindDownloadProgress
      };
    }

    return {
      totalProgress: lndProgress,
      downloadCompleted: lndDownloadProgress === 100,
      syncProgress: lndDownloadProgress
    };
  };

  getDownloadProgress = () => {
    const {
      loadingServer,
      lndProgress,
      bitcoindProgress,
      lndDownloadProgress,
      bitcoindDownloadProgress,
      lndType,
      downloadType
    } = this.props;
    const { totalProgress, downloadCompleted, syncProgress } = this.getProgressRate({
      type: lndType,
      lndProgress,
      bitcoindProgress,
      lndDownloadProgress,
      bitcoindDownloadProgress
    });
    if (loadingServer) {
      if (downloadType === 'download') {
        return (
          <span>
            Please wait while we're downloading LND and/or Bitcoind...
            <br />
            {totalProgress}%
          </span>
        );
      }

      if (downloadType === 'update') {
        return (
          <span>
            Upgrading LND to the latest version...
            <br />
            {totalProgress}%
          </span>
        );
      }
    }

    if (!downloadCompleted) {
      <span>
        Please wait while LND/Bitcoind is syncing blocks...
        <br />
        {syncProgress}%
      </span>;
    }

    return (
      <QRCode
        bgColor="#F5A623"
        fgColor="#21355a"
        value={`{ "externalIP": "${externalIP}", "internalIP": "${internalIP}", "walletPort": "${walletPort}" }`}
        ecLevel="M"
      />
    );
  };

  renderQRCode = () => {
    const { internalIP, walletPort, externalIP, activeTab } = this.state;
    const {
      loadingServer,
      showNodeInfo,
      lndProgress,
      bitcoindProgress,
      lndDownloadProgress,
      bitcoindDownloadProgress,
      lndType,
      downloadType
    } = this.props;
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
            style={{ display: 'block', padding: '0px 0px', margin: 'auto', fontWeight: 600 }}
          >
            Internal IP: {internalIP}
          </label>
          <label
            htmlFor=""
            style={{ display: 'block', padding: '0px 0px', margin: 'auto', fontWeight: 600 }}
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
          ) : lndDownloadProgress !== 100 ||
            (lndType === 'bitcoind' && bitcoindDownloadProgress !== 100) ? (
            <span>
              Please wait while LND/Bitcoind is syncing blocks...
              <br />
              {lndType === 'bitcoind' ? bitcoindDownloadProgress : lndDownloadProgress}%
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
    const { lndLogLines, showNodeInfo } = this.props;
    return (
      <div
        className={styles.lndLogsContainer}
        style={{ height: `calc(${showNodeInfo ? '100vh - 209px' : '100vh - 289px'})` }}
      >
        <div className={styles.logsBox} ref={this.props.logBox}>
          {lndLogLines ? lndLogLines.map(line => <p className={styles.logEntry}>{line}</p>) : null}
        </div>
      </div>
    );
  };

  renderBitcoindLogs = () => {
    const { bitcoindLogLines, showNodeInfo } = this.props;
    return (
      <div
        className={styles.lndLogsContainer}
        style={{ height: `calc(${showNodeInfo ? '100vh - 209px' : '100vh - 289px'})` }}
      >
        <div className={styles.logsBox} ref={this.props.logBox}>
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
              height: '60%',
              justifyContent: 'flex-start'
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
