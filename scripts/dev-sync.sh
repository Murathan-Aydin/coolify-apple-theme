#!/usr/bin/env bash
# Applies the theme to a local Coolify dev instance (scripts/dev in the
# Coolify checkout). The dev container mounts the checkout at /var/www/html,
# so the files go to <checkout>/public/apple-theme and the nginx snippet is
# copied into the container. Re-run after each change; recreating the
# container drops the snippet.
#
# Usage: scripts/dev-sync.sh [coolify checkout] [container]
set -euo pipefail

cd "$(dirname "$0")/.."

checkout="${1:-$HOME/dev/coolify}"
container="${2:-coolify-dev-$(basename "$checkout")}"

scripts/build.sh
mkdir -p "$checkout/public/apple-theme"
cp dist/public/* "$checkout/public/apple-theme/"

# Keep the copied files out of the Coolify checkout's git status.
exclude="$checkout/.git/info/exclude"
if [[ -f "$exclude" ]] && ! grep -qx 'public/apple-theme/' "$exclude"; then
    echo 'public/apple-theme/' >> "$exclude"
fi

docker cp dist/apple-theme.conf "$container:/etc/nginx/conf.d/apple-theme.conf"
docker exec -u root "$container" nginx -t -q
docker exec -u root "$container" nginx -s reload
echo "Theme applied to $container"
