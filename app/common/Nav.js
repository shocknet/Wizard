// @flow
import React, { Component } from 'react';
import { remote } from 'electron';
import { Link } from 'react-router-dom';
import styles from './css/Nav.css';

type Props = {};

export default class Nav extends Component<Props> {
  props: Props;

  render() {
    return (
      <div className={styles.navContainer}>
        <p className={styles.navTitle}>LND Server Setup</p>
        <div
          className={styles.navControls}
          onClick={() => {
            remote.getCurrentWindow().minimize();
          }}
        >
          <div className={[styles.navControl, styles.navMinimize].join(' ')}>
            <i className="icon ion-md-remove" />
          </div>
          <div
            className={[styles.navControl]}
            onClick={() => {
              remote.app.quit();
            }}
          >
            <i className={['icon ion-md-close', styles.navClose].join(' ')} />
          </div>
        </div>
      </div>
    );
  }
}
