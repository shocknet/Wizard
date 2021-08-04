# Lightning.Page Wizard

[![GitHub last commit](https://img.shields.io/github/last-commit/shocknet/Wizard?style=flat-square)](https://github.com/shocknet/wallet/commits/master)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com) 
[![Chat](https://img.shields.io/badge/chat-on%20Telegram-blue?style=flat-square)](https://t.me/Shockwallet)
[![Twitter Follow](https://img.shields.io/twitter/follow/ShockBTC?style=flat-square)](https://twitter.com/shockbtc)
![GitHub all releases](https://img.shields.io/github/downloads/shocknet/Wizard/total)

<div align="center" style="display: flex; width: 100%; align-items: center; justify-content: center; flex-direction: column">
  <img src="https://raw.githubusercontent.com/shocknet/Wizard/master/wizardSS_900.png" style="margin-bottom: 5px" /><br>
  <span style="font-size: 22px;font-weight: bold;">Run your own node and wallet server in a few clicks.</span>
  <div style="margin-top: 10px;">
    <a href="https://ci.appveyor.com/project/Emad-salah/wizard-q98nu">
      <img src="https://ci.appveyor.com/api/projects/status/xede0f6xagl1bjf6?svg=true" />
    </a>
  </div>
</div>

# Introduction

This wizard is a Desktop Installer that makes deploying and managing your own Bitcoin+LND node, and configuring as your [Lightning.Page](https://My.Lightning.Page) server, as simple as a few clicks. 

There are automatic builds for most operating systems:
- ~~[MacOS](https://github.com/shocknet/Wizard/releases)~~ Mac wanted
- [Windows](https://github.com/shocknet/Wizard/releases)
- [Linux](https://github.com/shocknet/Wizard/releases) (*headless systems should follow the API readme*)

Lightning.Page utilizes [ShockAPI](https://github.com/shocknet/api) which comes configured with this package. The wizard supports both Neutrino and Bitcoin Core.



# Install

Browse to [Releases](https://github.com/shocknet/Wizard/releases) and download->run the correct file for your operating system. 

*Full Bitcoin Core installations should budget at least 400GB of disk space*

Windows users should install "as Administrator" 


# Using with Lightning.Page
- The end of the wizard will provide you with a scan-able QR code. 
- Scan with My.Lightning.Page to automatically connect
- The built-in tunnel service will keep your device connected to your node across networks

## Packaging from Source

To package apps for the local platform:

```bash
$ yarn package
```


<hr></hr>

**If you find any issues with this project, or would like to suggest an enhancement, please [tell us](https://github.com/shocknet/Wizard/issues).**

[ISC License](https://opensource.org/licenses/ISC)
© 2021 [Shock Network, Inc.](https://shock.network)
