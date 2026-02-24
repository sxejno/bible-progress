# Publishing Bible Progress to the Google Play Store

This guide walks through building, signing, and publishing the Android TWA (Trusted Web Activity) wrapper for Bible Progress.

## How It Works

The Android app is a thin wrapper that runs `bibleprogress.com` inside Chrome as a full-screen app (no browser UI). This means:

- **Website updates are instant** — change `index.html`, push to GitHub Pages, and every Android user sees the update immediately. No Play Store review needed.
- **The Android project only needs rebuilding** when you change the wrapper itself (icons, splash screen, package config, target SDK).
- **Offline mode works** — the existing service worker handles caching, same as the PWA.

## Prerequisites

- **Java Development Kit (JDK) 17+**: [Download](https://adoptium.net/)
- **Android SDK**: Install via [Android Studio](https://developer.android.com/studio) or [command-line tools](https://developer.android.com/studio#command-line-tools-only)
- **Google Play Developer Account**: [$25 one-time fee](https://play.google.com/console/signup)

## Step 1: Generate a Signing Keystore

The keystore is your app's identity. **Back it up securely** — if lost, you cannot update your app on the Play Store.

```bash
cd android

keytool -genkeypair -v \
  -keystore bible-progress.keystore \
  -alias bible-progress \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass YOUR_SECURE_PASSWORD \
  -keypass YOUR_SECURE_PASSWORD \
  -dname "CN=Bible Progress, O=Bible Progress, C=US"
```

Replace `YOUR_SECURE_PASSWORD` with a strong password. Store it somewhere safe (password manager).

## Step 2: Create keystore.properties

Create `android/keystore.properties` (this file is gitignored):

```properties
storeFile=../bible-progress.keystore
storePassword=YOUR_SECURE_PASSWORD
keyAlias=bible-progress
keyPassword=YOUR_SECURE_PASSWORD
```

## Step 3: Update Digital Asset Links

Extract your signing key's SHA-256 fingerprint:

```bash
keytool -list -v \
  -keystore bible-progress.keystore \
  -alias bible-progress \
  -storepass YOUR_SECURE_PASSWORD \
  | grep SHA256
```

Copy the fingerprint (looks like `AB:CD:EF:12:34:...`) and paste it into `.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.bibleprogress.app",
    "sha256_cert_fingerprints": [
      "AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90"
    ]
  }
}]
```

**Important**: Push this file to GitHub Pages before testing the TWA. If the asset links aren't verified, Chrome will show a browser toolbar instead of running full-screen.

### If Using Play App Signing (Recommended)

Google Play App Signing adds an additional layer. After uploading your first AAB, Google provides an "App signing key certificate" SHA-256 in the Play Console under **Setup > App signing**. Add that fingerprint too:

```json
"sha256_cert_fingerprints": [
  "YOUR_UPLOAD_KEY_SHA256",
  "GOOGLE_PLAY_APP_SIGNING_KEY_SHA256"
]
```

## Step 4: Build the Release AAB

```bash
cd android
./gradlew bundleRelease
```

The signed Android App Bundle will be at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

For a debug APK (testing on your device):
```bash
./gradlew assembleDebug
# Install: adb install app/build/outputs/apk/debug/app-debug.apk
```

## Step 5: Test Before Publishing

1. **Install the debug APK** on a physical Android device or emulator
2. **Verify full-screen mode** — the app should launch without any Chrome browser toolbar. If you see a toolbar, the asset links aren't verified yet (check Step 3)
3. **Test offline** — enable airplane mode after first load; the app should still work
4. **Test Firebase sign-in** — Google Auth and email auth should work within the TWA
5. **Test deep links** — opening `https://bibleprogress.com` should open the app

## Step 6: Create Play Store Listing

In the [Google Play Console](https://play.google.com/console):

1. **Create app** → "Bible Progress", free, Education category
2. **Store listing**:
   - **Title**: Bible Progress
   - **Short description** (80 chars): Track your Bible reading progress with word-weighted precision.
   - **Full description** (4000 chars): Use the app's existing description from manifest.json or README
   - **Screenshots**: At least 2 phone screenshots, 1 seven-inch tablet screenshot
   - **Feature graphic**: 1024x500 promotional banner
   - **App icon**: 512x512 (use existing `icon-512.png`)
3. **Content rating**: Complete the IARC questionnaire — likely "Everyone"
4. **Privacy policy**: `https://bibleprogress.com/privacy.html`
5. **Target audience**: General
6. **App category**: Education > Religious

## Step 7: Upload and Publish

1. Go to **Production** → **Create new release**
2. Upload the `.aab` file from Step 4
3. Add release notes (e.g., "Initial release — track your Bible reading progress")
4. **Review and roll out**

Google's review typically takes 1-3 days for first submissions.

## Updating the App

### Website changes (features, bug fixes, content)
Just push to GitHub Pages. The TWA automatically reflects the latest website.

### Android wrapper changes (icons, splash, target SDK, version bump)
1. Update `versionCode` and `versionName` in `android/app/build.gradle`
2. Rebuild: `./gradlew bundleRelease`
3. Upload new AAB to Play Console

### Signing key changes
Update `.well-known/assetlinks.json` with the new SHA-256 fingerprint.

## Troubleshooting

**Browser toolbar showing instead of full-screen:**
- Verify `assetlinks.json` is accessible at `https://bibleprogress.com/.well-known/assetlinks.json`
- Verify the SHA-256 fingerprint matches your signing key (or Google's app signing key)
- Clear Chrome data on the test device and relaunch
- The `.nojekyll` file must be present at the repo root for GitHub Pages to serve `.well-known/`

**App crashes on launch:**
- Ensure Chrome is installed and up-to-date on the device
- The `android-browser-helper` library handles fallback to WebView if Chrome isn't available

**Firebase Auth not working:**
- TWA uses Chrome, so Firebase Auth (including Google Sign-In) should work normally
- Ensure your Firebase project's authorized domains include `bibleprogress.com`

**Offline mode not working:**
- Verify the service worker is registered at `bibleprogress.com`
- Check that `service-worker.js` caches are up to date
