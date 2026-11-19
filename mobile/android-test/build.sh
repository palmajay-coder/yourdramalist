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
# Release builds pass the permanent YourDramaList key (see mobile/README.md). Every release must use
# that same key, or Android refuses to install the update over the app people already have.
release_keystore=${YDL_KEYSTORE:-}
keystore=${release_keystore:-${ANDROID_DEBUG_KEYSTORE:-"$HOME/.android/debug.keystore"}}
if [[ -n "${YDL_RELEASE:-}" && -z "$release_keystore" ]]; then
  echo "YDL_RELEASE is set but YDL_KEYSTORE is not. Release builds must use the permanent release key." >&2
  exit 1
fi

if [[ "${ANDROID_UNSIGNED:-0}" == 1 && ( -n "${YDL_RELEASE:-}" || -n "$release_keystore" ) ]]; then
  echo "Unsigned output is only supported for local builds without a release key." >&2
  exit 1
fi
temporary=$(mktemp -d)
trap 'rm -rf "$temporary"' EXIT
mkdir -p "$temporary"/{classes,dex,res/drawable,res/values}
# The launch background matches the opening animation's light grey (#eceef1), so opening the app goes
# straight into the YDL animation with no dark flash first. Android 12 and later use it for the splash too.
cat > "$temporary/res/values/styles.xml" <<'XML'
<resources>
    <color name="ydl_launch">#ECEEF1</color>
    <style name="YdlTheme" parent="@android:style/Theme.Material.NoActionBar">
        <item name="android:windowBackground">@color/ydl_launch</item>
    </style>
</resources>
XML

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
# The What's new dialog uses the same text as the GitHub release notes: mobile/whats-new.md.
mkdir -p src
python3 - "$source_dir/MainActivity.java" "src/MainActivity.java" "$source_dir/../android-version.txt" "$source_dir/../whats-new.md" "${YDL_VERSION_NAME:-}" <<'PY'
import sys
from pathlib import Path

source, target, version_file, notes_file, version = sys.argv[1:6]
if not version and Path(version_file).exists():
    version = Path(version_file).read_text().strip()
lines = []
if Path(notes_file).exists():
    for line in Path(notes_file).read_text().splitlines():
        line = line.strip()
        if line.startswith(("- ", "* ")):
            lines.append("\u2022 " + line[2:].strip())
message = "\n\n".join(lines)
escape = lambda text: text.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
java = Path(source).read_text()
java = java.replace("@@WHATS_NEW_VERSION@@", escape(version)).replace("@@WHATS_NEW_MESSAGE@@", escape(message))
Path(target).write_text(java)
PY
javac --release 8 -classpath "$platform" -d classes "src/MainActivity.java"
jar cf classes.jar -C classes .
"$tools/d8" --min-api 26 --lib "$platform" --output dex classes.jar
# A release sets its own version. Android only installs an update with a higher version code.
python3 - "$source_dir/AndroidManifest.xml" "$temporary/AndroidManifest.xml" "${YDL_VERSION_CODE:-}" "${YDL_VERSION_NAME:-}" <<'PY'
import re
import sys
from pathlib import Path

source, target, code, name = sys.argv[1:5]
text = Path(source).read_text()
if code:
    if not code.isdigit(): sys.exit("YDL_VERSION_CODE must be a whole number")
    text = re.sub(r'android:versionCode="\d+"', f'android:versionCode="{code}"', text)
if name:
    if not re.fullmatch(r"[0-9A-Za-z.\-]{1,30}", name): sys.exit("YDL_VERSION_NAME has unexpected characters")
    text = re.sub(r'android:versionName="[^"]*"', f'android:versionName="{name}"', text)
Path(target).write_text(text)
PY
"$tools/aapt" package -M "$temporary/AndroidManifest.xml" -S res -I "$platform" -F unsigned.apk
zip -q -j unsigned.apk dex/classes.dex
"$tools/zipalign" -f 4 unsigned.apk aligned.apk
if [[ "${ANDROID_UNSIGNED:-0}" == 1 ]]; then
  cp aligned.apk "$output"
  exit 0
fi
mkdir -p "$(dirname "$keystore")"
if [[ -n "$release_keystore" ]]; then
  : "${YDL_KEYSTORE_PASSWORD:?Set YDL_KEYSTORE_PASSWORD for the release key}"
  "$tools/apksigner" sign --ks "$release_keystore" --ks-key-alias "${YDL_KEY_ALIAS:-yourdramalist}" \
    --ks-pass env:YDL_KEYSTORE_PASSWORD --key-pass env:YDL_KEYSTORE_PASSWORD --out "$output" aligned.apk
else
  if [[ ! -f "$keystore" ]]; then
    keytool -genkeypair -keystore "$keystore" -storepass android -keypass android \
      -alias androiddebugkey -dname 'CN=Android Debug,O=Android,C=US' \
      -keyalg RSA -keysize 2048 -validity 10000
  fi
  "$tools/apksigner" sign --ks "$keystore" --ks-pass pass:android --key-pass pass:android \
    --out "$output" aligned.apk
fi
"$tools/apksigner" verify --print-certs "$output"
