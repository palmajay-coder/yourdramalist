#!/usr/bin/env bash
# Keeps only the given Android release on GitHub and deletes every older release, so the releases page
# always shows just the current app. Version tags stay (they are not shown to users and mark the code of
# each version). Runs only when the kept release is published with its APK, so there is always a download.
# Usage: bash mobile/prune-releases.sh 1.1.30   (needs GH_TOKEN and GITHUB_REPOSITORY)
set -euo pipefail
version=${1:?Give the version to keep, for example 1.1.30}
repo=${GITHUB_REPOSITORY:?Set GITHUB_REPOSITORY}
keep="v$version"
apk="YourDramaList-$version-android.apk"
assets=$(gh api "repos/$repo/releases/tags/$keep" --jq '.assets[].name')
grep -qx "$apk" <<< "$assets" || { echo "$keep has no $apk; nothing deleted."; exit 1; }
gh api --paginate "repos/$repo/releases?per_page=100" --jq '.[].tag_name' | while read -r tag; do
  [[ "$tag" == "$keep" ]] && continue
  echo "Deleting release $tag (the tag stays)"
  gh release delete "$tag" --repo "$repo" --yes
done
