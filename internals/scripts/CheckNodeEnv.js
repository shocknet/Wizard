// @flow
import chalk from 'chalk';
import logger from 'electron-log';

export default function CheckNodeEnv(expectedEnv: string) {
  if (!expectedEnv) {
    throw new Error('"expectedEnv" not set');
  }

  if (process.env.NODE_ENV !== expectedEnv) {
    logger.info(
      chalk.whiteBright.bgRed.bold(
        `"process.env.NODE_ENV" must be "${expectedEnv}" to use this webpack config`
      )
    );
    process.exit(2);
  }
}
