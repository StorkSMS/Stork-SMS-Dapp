# Android App (TWA) Setup Guide for Stork SMS

This guide explains how to generate an Android APK for the Solana dApp Store using Trusted Web Activity (TWA).

## Prerequisites

- Node.js 14.15.0 or higher
- The web app must be deployed (https://dapp.stork-sms.net)
- Android SDK (will be installed by Bubblewrap if needed)

## Step 1: Install Bubblewrap CLI

```bash
npm i -g @bubblewrap/cli
```

## Step 2: Initialize the TWA Project

Create a new directory for the Android project:

```bash
mkdir stork-sms-android
cd stork-sms-android
```

Initialize with your manifest:

```bash
bubblewrap init --manifest https://dapp.stork-sms.net/manifest.json
```

### Configuration Options

When prompted, use these settings:

- **Domain**: dapp.stork-sms.net
- **Application ID**: net.stork_sms.dapp
- **Display mode**: standalone
- **Status bar color**: #3388FF (your theme color)
- **Navigation bar color**: #ffffff
- **Splash screen color**: #3388FF
- **Keystore location**: Save securely! (e.g., `./android.keystore`)
- **Key alias**: stork-sms-key

⚠️ **IMPORTANT**: Save your keystore file and password securely. You'll need them for all future updates.

## Step 3: Configure Supported Languages

Edit the generated `build.gradle` file and add your supported languages:

```gradle
android {
    defaultConfig {
        ...
        resConfigs "en" // Add other languages as needed
    }
}
```

## Step 4: Build the APK

```bash
bubblewrap build
```

This generates `app-release-signed.apk` ready for submission.

## Step 5: Update Digital Asset Links

1. Get the SHA256 fingerprint:

```bash
keytool -list -v -keystore android.keystore
```

2. Add the fingerprint:

```bash
bubblewrap fingerprint add <SHA256_FINGERPRINT_HERE>
```

3. Generate the assetlinks file:

```bash
bubblewrap fingerprint generateAssetLinks
```

4. Update the file at `public/.well-known/assetlinks.json` with the generated content

## Step 6: Test the APK

Install on an emulator or device:

```bash
bubblewrap install app-release-signed.apk
```

Or use Android Studio emulator:

```bash
adb install app-release-signed.apk
```

## Push Notifications

Push notifications are already implemented in the web app and will work automatically in the TWA:

1. Users will be prompted to allow notifications when they first open the app
2. Notifications will show with the Stork app icon
3. Clicking notifications will open the app

## Updating the App

To release updates:

1. Make changes to the web app (no Android changes needed for content updates)
2. For manifest changes (icon, name, etc.):
   - Edit `twa-manifest.json`
   - Run `bubblewrap update`
   - Run `bubblewrap build`

## Submitting to Solana dApp Store

Follow the [official dApp publishing guide](https://docs.solanamobile.com/dapp-publishing/overview) with your signed APK.

## Troubleshooting

### Browser UI showing in app
- Ensure assetlinks.json is deployed at https://dapp.stork-sms.net/.well-known/assetlinks.json
- Verify the SHA256 fingerprint matches your keystore

### Push notifications not working
- Check browser notification permissions
- Ensure service worker is registered
- Test in Chrome DevTools first

### App not installing
- Enable "Install from unknown sources" in Android settings
- Check minimum Android version (API 21+)