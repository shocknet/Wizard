import React from 'react';
import { render } from 'react-dom';
import { AppContainer } from 'react-hot-loader';
import localForage from 'localforage';
import { ipcRenderer } from 'electron';
import Root from './containers/Root';
import { configureStore, history } from './store/configureStore';
import './app.global.css';

const store = configureStore();

render(
  <AppContainer>
    <Root store={store} history={history} />
  </AppContainer>,
  document.getElementById('root')
);

if (module.hot) {
  module.hot.accept('./containers/Root', () => {
    // eslint-disable-next-line global-require
    const NextRoot = require('./containers/Root').default;
    render(
      <AppContainer>
        <NextRoot store={store} history={history} />
      </AppContainer>,
      document.getElementById('root')
    );
  });
}

ipcRenderer.on('getSetupStatus', async () => {
  const setupCompleted = await localForage.getItem('setupCompleted');
  console.log('getSetupStatus');
  ipcRenderer.send('setupStatus', setupCompleted);
});
