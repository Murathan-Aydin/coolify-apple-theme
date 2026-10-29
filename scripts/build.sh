#!/usr/bin/env bash
# Builds dist/: the theme files served at /coolify-apple-theme/ and the nginx snippet
# that injects them. The version in the URLs busts browser caches on updates.
set -euo pipefail

cd "$(dirname "$0")/.."

rm -rf dist
mkdir -p dist/public

cat src/tokens.css src/materials.css src/wallpapers.css src/overrides.css src/panel.css > dist/public/apple-theme.css
cp src/apple-theme.js dist/public/apple-theme.js

if command -v sha1sum >/dev/null; then
    hash_cmd=sha1sum
else
    hash_cmd=shasum
fi
version="$(cat dist/public/apple-theme.css dist/public/apple-theme.js | LC_ALL=C "$hash_cmd" | cut -c1-10)"
sed "s/__VERSION__/${version}/g" nginx/apple-theme.conf > dist/apple-theme.conf

echo "Built dist/ (version ${version})"
