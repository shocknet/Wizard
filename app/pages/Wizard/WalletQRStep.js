import React, { Component, Fragment } from 'react';
import localForage from 'localforage';
import localIP from 'internal-ip';
import { QRCode } from 'react-qrcode-logo';
import logger from 'electron-log';
import Http from 'axios';
import styles from './css/index.css';

const SERVER_STATUS_PING_MS = 1000;

export default class WalletQRStep extends Component {
  state = {
    activeTab: 'info',
    internalIP: '',
    externalIP: '',
    walletPort: '9835',
    useTunnel: 'yes',
    tunnelUrl:''
  };

  componentDidMount = async () => {
    const externalIP = await localForage.getItem('externalIP');
    const useTunnel = await localForage.getItem('useTunnel');
    const internalIP = await localIP.v4();
    this.setOption('internalIP', internalIP);
    this.setOption('externalIP', externalIP);
    this.setOption('useTunnel', useTunnel);

    if (!this.props.loadingServer) {
      this.startServerStatusPing();
    }
  };

  componentDidUpdate(oldProps) {
    const serverStatusUpdate = oldProps.loadingServer !== this.props.loadingServer;

    if (serverStatusUpdate && !this.props.loadingServer && !this.pingTimer) {
      this.startServerStatusPing();
    }

    if (serverStatusUpdate && this.props.loadingServer) {
      this.stopServerStatusPing();
    }
  }

  componentWillUnmount = () => {
    const { networkType } = this.state;
    this.stopServerStatusPing();
    this.setOption('networkType', networkType);
  };

  pingTimer = null;

  startServerStatusPing = async () => {
    try {
      const { internalIP, walletPort, useTunnel } = this.state;
      const { data } = await Http.get(`http://${internalIP}:${walletPort}/healthz`);
      if(useTunnel === 'yes'){
        const { data } = await Http.get(`http://${internalIP}:${walletPort}/tunnel/status`);
        this.setOption('tunnelUrl',data.uri)
      }
      const lndStatusType =
        !data.LNDStatus.message.synced_to_graph ||
        !data.LNDStatus.message.synced_to_chain ||
        data.LNDStatus.walletStatus === 'locked'
          ? 'warning'
          : 'success';
      const apiStatusType = data.APIStatus.success ? 'success' : 'error';
      const lndStatus = !data.LNDStatus.message.synced_to_graph
        ? 'Syncing to graph...'
        : data.LNDStatus.message.synced_to_chain
        ? 'Syncing to chain...'
        : data.LNDStatus.walletStatus === 'locked'
        ? 'Wallet Locked'
        : data.LNDStatus.walletStatus === 'unlocked'
        ? 'Wallet Unlocked'
        : 'Active';
      const apiStatus = data.APIStatus.success ? 'Active' : 'An error has occurred';

      this.setState({
        apiStatusType,
        lndStatusType,
        apiStatus,
        lndStatus
      });
    } catch (err) {
      this.setState({
        apiStatusType: 'error',
        lndStatusType: 'error',
        apiStatus: 'Unreachable',
        lndStatus: 'Unreachable'
      });
    } finally {
      this.pingTimer = setTimeout(() => {
        this.startServerStatusPing();
      }, SERVER_STATUS_PING_MS);
    }
  };

  stopServerStatusPing = () => {
    clearInterval(this.pingTimer);
  };

  setOption = async (key, value) => {
    await localForage.setItem(key, value);
    logger.info(key, value);
    this.setState({ [key]: value });
  };

  setActiveTab = (tab) => {
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
          style={activeTab === 'info' ? { backgroundColor: '#3e7fb1' } : {}}
          onClick={() => this.setActiveTab('info')}
        >
          <p>Information</p>
        </div>
        <div
          className={styles.stepTab}
          style={activeTab === 'lnd' ? { backgroundColor: '#3e7fb1' } : {}}
          onClick={() => this.setActiveTab('lnd')}
        >
          <p>LND Logs</p>
        </div>
        {lndType === 'bitcoind' ? (
          <div
            className={styles.stepTab}
            style={activeTab === 'bitcoind' ? { backgroundColor: '#3e7fb1' } : {}}
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
    const { externalIP, internalIP, walletPort, tunnelUrl } = this.state;
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
        value={`{ "externalIP": "${tunnelUrl || externalIP}", "internalIP": "${tunnelUrl || internalIP}", "walletPort": "${tunnelUrl ? 443 : walletPort}" }`}
        ecLevel="M"
      />
    );
  };

  renderQRCode = () => {
    const { internalIP, walletPort, externalIP, activeTab, apiStatus, lndStatus,tunnelUrl } = this.state;
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
      <>
        <div className={styles.reminderContainer}>
          <i className={[styles.reminderIcon, ' fas fa-info-circle'].join(' ')} />
          <p className={styles.reminderText}>
            Reminder: Your network may require NAT Forwarding/Firewall Rules
          </p>
        </div>
        <p className={styles.stepDescription}>
          Scan the QR Code with the mobile app to import your IP addresses.
        </p>
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
              bgColor="#4285b9"
              fgColor="#001220"
              value={`{ "externalIP": "${tunnelUrl || externalIP}", "internalIP": "${tunnelUrl || internalIP}", "walletPort": "${tunnelUrl ? 443 : walletPort}" }`}
              ecLevel="M"
            />
          )}
        </div>
        {!loadingServer && lndDownloadProgress === 100 ? (
          <div className={styles.wizardStatusContainer}>
            <div className={styles.wizardStatusHeader}>
              <p>Status</p>
            </div>
            <div className={styles.wizardStatusSections}>
              <div className={styles.wizardStatusSection}>
                <p className={styles.wizardStatusSectionHead}>Networking</p>
                <label htmlFor="" className={styles.wizardStatusText}>
                  Internal IP: {internalIP}
                </label>
                <label htmlFor="" className={styles.wizardStatusText}>
                  External IP: {externalIP}
                </label>
                {tunnelUrl && <label htmlFor="" className={styles.wizardStatusText}>
                  External IP: {tunnelUrl}
                </label>}
              </div>
              <div className={styles.wizardStatusSectionDivider}></div>
              <div className={styles.wizardStatusSection}>
                <p className={styles.wizardStatusSectionHead}>ShockAPI</p>
                <label htmlFor="" className={styles.wizardStatusText}>
                  API Status: {apiStatus ?? 'N/A'}
                </label>
                <label htmlFor="" className={styles.wizardStatusText}>
                  LND Status: {lndStatus ?? 'N/A'}
                </label>
              </div>
            </div>
          </div>
        ) : null}
      </>
    );
  };

  renderLNDLogs = () => {
    const { lndLogLines, showNodeInfo } = this.props;
    return (
      <div
        className={styles.lndLogsContainer}
        style={{ height: `calc(${showNodeInfo ? '100vh - 215px' : '100vh - 295px'})` }}
      >
        <div className={styles.logsBox} ref={this.props.logBox}>
          {lndLogLines
            ? lndLogLines.map((line) => <p className={styles.logEntry}>{line}</p>)
            : null}
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
            ? bitcoindLogLines.map((line) => <p className={styles.logEntry}>{line}</p>)
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
              height: showNodeInfo ? '100%' : 'calc(100% - 80px)',
              justifyContent: 'flex-start',
              overflow: 'auto'
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
