/* eslint-disable jsx-a11y/label-has-for */
/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { Component, Fragment } from 'react';
import localForage from 'localforage';
import localIP from 'internal-ip';
import { QRCode } from 'react-qrcode-logo';
import Lnd from '../../utils/lnd';
import styles from './css/index.css';

export default class WalletQRStep extends Component {
  state = {
    activeTab: 'info',
    internalIP: '',
    externalIP: '',
    walletPort: '9835',
    logLines: []
  };

  logBox = React.createRef();

  componentDidMount = async () => {
    const externalIP = await localForage.getItem('externalIP');
    const internalIP = await localIP.v4();
    this.setOption('internalIP', internalIP);
    this.setOption('externalIP', externalIP);
    Lnd.onData(data => {
      const { logLines } = this.state;
      this.setState(
        {
          logLines: [...logLines, data]
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
  };

  setOption = async (key, value) => {
    await localForage.setItem(key, value);
    console.log(key, value);
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
    const { showNodeInfo } = this.props;
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
          style={activeTab === 'logs' ? { backgroundColor: '#d08a15' } : {}}
          onClick={() => this.setActiveTab('logs')}
        >
          <p>LND Logs</p>
        </div>
      </div>
    );
  };

  renderQRCode = () => {
    const { internalIP, walletPort, externalIP, activeTab } = this.state;
    const { loadingServer, showNodeInfo } = this.props;
    return (
      <Fragment>
        <p className={styles.stepDescription} style={{ marginBottom: 20 }}>
          Instructions for user to connect wallet to wizard api instance (Work in Progress)
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
            "Please wait while we're downloading the LND and/or Bitcoind clients..."
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
    console.log('logLines', Lnd);
    const { logLines } = this.state;
    return (
      <div className={styles.lndLogsContainer}>
        <div className={styles.logsBox} ref={this.logBox}>
          {logLines ? logLines.map(line => <p className={styles.logEntry}>{line}</p>) : null}
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
            {activeTab === 'info' ? this.renderQRCode() : this.renderLNDLogs()}
          </div>
        </div>
      </div>
    );
  }
}
