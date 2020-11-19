# S H O C K W I Z A R D

[![GitHub last commit](https://img.shields.io/github/last-commit/shocknet/Wizard?style=flat-square)](https://github.com/shocknet/wallet/commits/master)
[![GitHub](https://img.shields.io/github/license/shocknet/Wizard?label=license&style=flat-square)](https://github.com/shocknet/wallet/blob/master/LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com) 
[![Chat](https://img.shields.io/badge/chat-on%20Telegram-blue?style=flat-square)](https://t.me/Shockwallet)
[![Twitter Follow](https://img.shields.io/twitter/follow/ShockBTC?style=flat-square)](https://twitter.com/shockbtc)
[![GitHub all releases](https://img.shields.io/github/downloads/shocknet/Wizard/total)

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

ShockWizard is a Desktop Installer that makes deploying and managing your own Bitcoin+LND node, and configuring as your [ShockWallet](https://github.com/shocknet/wallet) server, as simple as a few clicks. 

There are automatic builds for most operating systems:
- ~~[MacOS](https://github.com/shocknet/Wizard/releases)~~ Mac wanted
- [Windows](https://github.com/shocknet/Wizard/releases)
- [Linux](https://github.com/shocknet/Wizard/releases) (*headless systems should follow the API readme*)

ShockWallet utilizes [ShockAPI](https://github.com/shocknet/api) which comes configured with this package. The wizard supports both Neutrino and Bitcoin Core.



# Install

Browse to [Releases](https://github.com/shocknet/Wizard/releases) and download->run the correct file for your operating system. 

*Full Bitcoin Core installations should budget at least 400GB of disk space*

Windows users should install "as Administrator" 


# Using with ShockWallet
- The end of the wizard will provide you with a scan-able QR code. 
- Scan with ShockWallet to automatically connect
- This method will configure the app to automatically switch between your internal and external* IP addresses when you leave your home network.

**Port `9835` is used by default and may require a Firewall/NAT Forwarding Rule to be set on your router.*

## Packaging from Source

To package apps for the local platform:

```bash
$ yarn package
```


<hr></hr>

**If you find any issues with this project, or would like to suggest an enhancement, please [tell us](https://github.com/shocknet/Wizard/issues).**

[ISC License](https://opensource.org/licenses/ISC)
© 2020 [Shock Network, Inc.](http://shock.network)
