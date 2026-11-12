#!/usr/bin/env bash
set -euo pipefail

: "${ANDROID_HOME:?Set ANDROID_HOME to an Android SDK with platform 36 and Build Tools 36.0.0}"
: "${JAVA_HOME:?Set JAVA_HOME to a JDK}"
export PATH="$JAVA_HOME/bin:$PATH"

source_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
output=${1:-"$source_dir/YourDramaList-Android-Test.apk"}
output=$(python3 -c 'import os, sys; print(os.path.abspath(sys.argv[1]))' "$output")
tools="$ANDROID_HOME/build-tools/36.0.0"
platform="$ANDROID_HOME/platforms/android-36/android.jar"
keystore=${ANDROID_DEBUG_KEYSTORE:-"$HOME/.android/debug.keystore"}
temporary=$(mktemp -d)
trap 'rm -rf "$temporary"' EXIT
mkdir -p "$temporary"/{classes,dex,res/drawable} "$(dirname "$keystore")"

python3 - "$source_dir/../../addonIcon.ts" "$temporary/res/drawable/ydl_icon.png" <<'PY'
import base64
import re
import sys
from pathlib import Path

source = Path(sys.argv[1]).read_text()
icon = re.search(r'"([A-Za-z0-9+/=]{500,})"', source)[1]
Path(sys.argv[2]).write_bytes(base64.b64decode(icon))
PY

cd "$temporary"
javac --release 8 -classpath "$platform" -d classes "$source_dir/MainActivity.java"
jar cf classes.jar -C classes .
"$tools/d8" --min-api 26 --lib "$platform" --output dex classes.jar
"$tools/aapt" package -M "$source_dir/AndroidManifest.xml" -S res -I "$platform" -F unsigned.apk
zip -q -j unsigned.apk dex/classes.dex
"$tools/zipalign" -f 4 unsigned.apk aligned.apk
if [[ ! -f "$keystore" ]]; then
  keytool -genkeypair -keystore "$keystore" -storepass android -keypass android \
    -alias androiddebugkey -dname 'CN=Android Debug,O=Android,C=US' \
    -keyalg RSA -keysize 2048 -validity 10000
fi
"$tools/apksigner" sign --ks "$keystore" --ks-pass pass:android --key-pass pass:android \
  --out "$output" aligned.apk
"$tools/apksigner" verify "$output"
