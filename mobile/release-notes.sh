#!/usr/bin/env bash
# Release notes for an Android release: the What's new list (mobile/whats-new.md, the same text the app
# shows after an update). No install instructions. Usage: bash mobile/release-notes.sh 1.1.26
set -euo pipefail
version=${1:?Give the version, for example 1.1.26}
dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
echo "## What's new in $version"
echo
if [[ -s "$dir/whats-new.md" ]]; then cat "$dir/whats-new.md"; else echo "- Fixes and improvements."; fi
