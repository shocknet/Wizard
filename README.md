<div align="center" style="display: flex; width: 100%; align-items: center; justify-content: center; flex-direction: column">
  <img src="./app/img/D7B5290A.png" width="80px" style="margin-bottom: 5px" />
  <span style="font-size: 24px;font-weight: bold;">S H O C K W I Z A R D</span>
  <div style="margin-top: 10px;">
    <a href="https://ci.appveyor.com/project/Emad-salah/wizard-q98nu">
      <img src="https://ci.appveyor.com/api/projects/status/xede0f6xagl1bjf6?svg=true" />
    </a>
  </div>
</div>

# Introduction

<span style="color: #f5a623;">**NOTE: This project is still beta work and is not intended for use on Mainnet as of yet!**</span>

ShockWizard is a project that aims to simplify the process of deploying a Private Bitcoin Node and exposing its API for use in a server (The source code for that lives in a separate repo: [ShockAPI](https://github.com/jhizzle84/api)). This is all done simply by answering a few questions about how you want your Bitcoin Node to work like and that's it!

## Versioning System

We are using the [SemVer](https://semver.org/) versioning system and the [GitFlow](https://nvie.com/posts/a-successful-git-branching-model/) branching model. So we'll always have both the `master` and `develop` branches but new features and hotfixes will be in a separate branch that should be named in the following format respectively: `feature/<feature-name>` and `hotfix/<feature-name>`. So version bumps will occur for the Beta releases every time the develop branch is merged with master.

## Continuous Integration and Deployment

We're using AppVeyor for CI/CD. You can view the build history and the current build's progress [here](https://ci.appveyor.com/project/Emad-salah/wizard-q98nu). Builds will occur automatically only once the version has been bumped and pushed to the master branch.

Also after every commit, in order to ensure code consistency and to avoid having build failures, there are pre-commit hooks that run to first check whether there are any ESLint warnings/errors and if there aren't any, it will also format the code using [Prettier](https://github.com/prettier/prettier).

# Contributing to ShockWizard

## Install

- **If you have installation or compilation issues with this project, please see [our debugging guide](https://github.com/electron-react-boilerplate/electron-react-boilerplate/issues/400)**

First, clone the repo via git:

```bash
git clone --depth 1 --single-branch --branch master https://github.com/electron-react-boilerplate/electron-react-boilerplate.git your-project-name
```

And then install the dependencies with yarn.

```bash
$ cd your-project-name
$ yarn
```

## Run

Start the app in the `dev` environment. This starts the renderer process in [**hot-module-replacement**](https://webpack.js.org/guides/hmr-react/) mode and starts a webpack dev server that sends hot updates to the renderer process:

```bash
$ yarn dev
```

If you don't need autofocus when your files was changed, then run `dev` with env `START_MINIMIZED=true`:

```bash
$ START_MINIMIZED=true yarn dev
```

## Packaging

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

To package apps with options:

```bash
$ yarn package --[option]
```

To run End-to-End Test

```bash
$ yarn build-e2e
$ yarn test-e2e

# Running e2e tests in a minimized window
$ START_MINIMIZED=true yarn build-e2e
$ yarn test-e2e
```

:bulb: You can debug your production build with devtools by simply setting the `DEBUG_PROD` env variable:

```bash
DEBUG_PROD=true yarn package
```

## CSS Modules

This boilerplate is configured to use [css-modules](https://github.com/css-modules/css-modules) out of the box.

All `.css` file extensions will use css-modules unless it has `.global.css`.

If you need global styles, stylesheets with `.global.css` will not go through the
css-modules loader. e.g. `app.global.css`

If you want to import global css libraries (like `bootstrap`), you can just write the following code in `.global.css`:

```css
@import '~bootstrap/dist/css/bootstrap.css';
```

## Static Type Checking

This project comes with Flow support out of the box! You can annotate your code with types, [get Flow errors as ESLint errors](https://github.com/amilajack/eslint-plugin-flowtype-errors), and get [type errors during runtime](https://github.com/codemix/flow-runtime) during development. Types are completely optional.

## Dispatching redux actions from main process

See [#118](https://github.com/electron-react-boilerplate/electron-react-boilerplate/issues/118) and [#108](https://github.com/electron-react-boilerplate/electron-react-boilerplate/issues/108)
