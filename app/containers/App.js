import * as React from 'react';
import logger from 'electron-log';
import Nav from '../common/Nav';

export default class App extends React.Component {
  state = {
    hasError: false,
  };

  static getDerivedStateFromError(error, errorInfo) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('An error has occurred:', error, errorInfo);
    this.error = error;
    this.errorInfo = errorInfo;
  }

  render() {
    const { children } = this.props;
    const { hasError } = this.state;
    if (hasError) {
      return (
        <>
          <Nav />
          <div className="error-container">
            <i className="error-icon fas fa-exclamation-circle" />
            <p className="error-title">An unknown error occurred</p>
            {this.error && this.errorInfo ? (
              <div className="error-details-container">
                <p className="error-details-title">Error: {this.error}</p>
                <p className="error-details-stacktrace">{this.errorInfo.componentStack}</p>
              </div>
            ) : null}
          </div>
        </>
      );
    }
    return <React.Fragment>{children}</React.Fragment>;
  }
}
