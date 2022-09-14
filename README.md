# IRMA Gmail webextension

A browser extension to encrypt your emails using IRMA. Currently only Chromium and Chrome are supported, but support for other browsers will come soon

## Build

1. Clone the repository.
2. Install Node.js v16 or greater.
   NOTE: if you're using Ubuntu, the `nodejs` package in the apt repositories is too old, you will need to install `node` from snap.
3. Run `yarn install`.
4. Run `yarn build`

## Install the extension on Chrome/Chromium

1. Access `chrome://extensions/`
2. Check `Developer mode`
3. Click on `Load unpacked extension`
4. Select the `build` folder.


## Structure

All the extension's code is placed in the `src` directory, including the extension manifest.
The `utils` directory contains some configuration files.
The `tests` directory contains tests to check that the extension is working properly.