# Quirkbot for Chrome

## Updating reset firmware
To update the reset firmware to the latest one from the cloud compiler run:
```
cd reset-firmware; node update.js
```
You can modify the compiler url directly in ``reset-firmware/update.js``.

## Packing for webstore
To generate the zip to upload to the Chrome webstore, run:
```
sh pack-for-webstore.sh
```
