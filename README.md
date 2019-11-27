<div align="center" style="display: flex; width: 100%; align-items: center; justify-content: center; flex-direction: column">
  <img src="https://github.com/shocknet/Wizard/blob/master/app/img/D7B5290A.png" width="80px" style="margin-bottom: 5px" /><br>
  <span style="font-size: 24px;font-weight: bold;">S H O C K W I Z A R D</span>
  <div style="margin-top: 10px;">
    <a href="https://ci.appveyor.com/project/Emad-salah/wizard-q98nu">
      <img src="https://ci.appveyor.com/api/projects/status/xede0f6xagl1bjf6?svg=true" />
    </a>
  </div>
</div>

# Introduction

<span style="color: #f5a623;">**NOTE: This project is in alpha, and is not intended for use on Mainnet**</span>

ShockWizard is a Desktop Installer that makes deploying and managing your own Bitcoin+LND node, and configuring as your [ShockWallet](https://github.com/shocknet/wallet) server, as simple as a few clicks. 

There are automatic builds for most operating systems:
- [MacOS](https://github.com/shocknet/Wizard/releases)
- [Windows](https://github.com/shocknet/Wizard/releases)
- [Linux](https://github.com/shocknet/Wizard/releases) (*headless systems should follow the API readme*)

ShockWallet utilizes [ShockAPI](https://github.com/shocknet/api) which comes configured with this package. The wizard supports both Neutrino and Bitcoin Core.



# Install

Browse to [Releases](https://github.com/shocknet/Wizard/releases) and download->run the correct file for your operating system. 

*Full Bitcoin Core installations should budget at least 400GB of disk space*


# Using with ShockWallet
The end of the wizard will provide you with a scan-able QR code. Scan with ShockWallet to automatically connect, this method will configure the app to automatically switch between your internal and external* IP addresses when you leave your home network.

**Port `9835` is used by default and may require a Firewall/NAT Forwarding Rule to be set on your router.*

## Packaging from Source

To package apps for the local platform:

```bash
$ yarn package
```

To package apps for all platforms:

First, refer to the [Multi Platform Build docs](https://www.electron.build/multi-platform-build) for dependencies.

Then,

```bash
$ yarn package-all
```

<hr></hr>

**If you find any issues with this project, or would like to suggest an enhancement, please [tell us](https://github.com/shocknet/Wizard/issues).**

[ISC License](https://opensource.org/licenses/ISC)
© 2019 [Shock Network, Inc.](http://shock.network)
