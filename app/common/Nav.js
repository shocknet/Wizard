// @flow
import React, { Component } from 'react';
import { remote } from 'electron';
import styles from './css/Nav.css';

export default class Nav extends Component {
  render() {
    return (
      <div className={styles.navContainer}>
        <p className={styles.navTitle}>LND Server Setup</p>
        <div
          className={styles.navControls}
          onClick={() => {
            remote.getCurrentWindow().minimize();
          }}
          role="button"
          tabIndex={0}
        >
          <div className={[styles.navControl, styles.navMinimize].join(' ')}>
            <i className="icon ion-md-remove" />
          </div>
          <div
            className={[styles.navControl]}
            onClick={() => {
              remote.app.quit();
            }}
            role="button"
            tabIndex={0}
          >
            <i className={['icon ion-md-close', styles.navClose].join(' ')} />
          </div>
        </div>
      </div>
    );
  }
}
