# YourDramaList mobile test builds

The Android and iOS wrappers load [yourdramalist.net](https://yourdramalist.net/). The Android wrapper uses the application ID `com.palmajay.yourdramalist.mobiletest`.

From this directory, run `npm ci`. Create a native project with `npx cap add android` or `npx cap add ios`. Run `python3 brand-icons.py` with Pillow installed to apply the YourDramaList icon. Run `npm run sync` after updating the Capacitor configuration.

The downloadable Android APK uses the WebView app in `android-test`.

## Releasing the Android app

Android only installs an update over the app when both are signed with the same key. The key that signed 1.1.23 and 1.1.24 was lost, so those installs need one reinstall. From 1.1.25 on, every release is signed with the permanent YourDramaList release key, so updates install over the app and keep its data.

- **Never sign a release with a debug key or a new key.** The release workflow refuses any key other than the permanent one (it checks the certificate's SHA-256, `31f302187e76…41c68a63`).
- **Where the key lives:** two GitHub Actions secrets on this repository, `YDL_RELEASE_KEYSTORE_BASE64` (the key file, base64) and `YDL_RELEASE_KEYSTORE_PASSWORD`, plus a private backup kept by the owner. The key file is never committed.
- **To release:** put the new version (for example `1.1.27`) in `mobile/android-version.txt`, set `APP_VERSION` and `DISPLAY_VERSION` in `text.ts` to the same number (the version badge in the app shows the website's version), deploy the site, and push. Once the workflow file is on the default branch, it can also be started from Actions, then **Android app release**, then **Run workflow**. The workflow builds and signs the app, raises the version code (100 plus the run number), and publishes a release with `YourDramaList.apk` and `android-latest.json`.
- **Update notice:** the app adds `YourDramaListApp/<version code>` to its browser signature. The website reads `android-latest.json` from the latest release (`/api/app/android`) and shows a download notice when the app is older. Apps from before 1.1.25 are asked to reinstall once.
- **Local builds:** set `ANDROID_HOME` and `JAVA_HOME`, then run `bash android-test/build.sh /path/to/YourDramaList.apk` with Android platform 36 and Build Tools 36.0.0 installed. Without `YDL_KEYSTORE` it signs with the computer's debug key, which is fine for testing but never for a release.

For a Capacitor Android build, use Java 21 and Android SDK 36, then run `./gradlew assembleDebug` from the generated `android` directory. The APK is in `android/app/build/outputs/apk/debug/` relative to this directory.

For an iPhone build, open the generated Xcode project with `npx cap open ios` on macOS. Set the Apple development team for the App target. Select a simulator for local development or archive the app under the team's App Store Connect record for TestFlight.
