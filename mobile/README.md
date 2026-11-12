# YourDramaList mobile test builds

The Android and iOS apps load the shared mobile setup from the YourDramaList Cloudflare test Worker. The test app has its own application ID, com.palmajay.yourdramalist.mobiletest.

From this directory, run `npm ci`. Create a native project with `npx cap add android` or `npx cap add ios`. Run `python3 brand-icons.py` with Pillow installed to apply the YourDramaList icon. Run `npm run sync` after updating the Capacitor configuration.

The downloadable Android test APK uses the WebView app in `android-test`. To rebuild it, set `ANDROID_HOME` and `JAVA_HOME`, then run `bash android-test/build.sh /path/to/YourDramaList-Android-Test.apk` with Android platform 36 and Build Tools 36.0.0 installed. Keep the same debug keystore to install later test builds as updates.

For a Capacitor Android build, use Java 21 and Android SDK 36, then run `./gradlew assembleDebug` from the generated `android` directory. The APK is in `android/app/build/outputs/apk/debug/` relative to this directory.

For an iPhone build, open the generated Xcode project with `npx cap open ios` on macOS. Set the Apple development team for the App target. Select a simulator for local development or archive the app under the team's App Store Connect record for TestFlight.
