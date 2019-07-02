import os from 'os';

export const getUserPlatform = () => {
  const platform = os.platform();
  if (platform === 'win32') {
    return 'windows';
  } else {
    return platform;
  }
};
