import React from 'react';
import { Switch, Route } from 'react-router';
import routes from './constants/routes';
import Nav from './common/Nav';
import App from './containers/App';
import WizardPage from './containers/WizardPage';

export default () => (
  <App>
    <Nav />
    <Switch>
      <Route path={routes.WIZARD} component={WizardPage} />
    </Switch>
  </App>
);
