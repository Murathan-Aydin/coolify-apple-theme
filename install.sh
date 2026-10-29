#!/usr/bin/env bash
# Installs or updates the Apple theme on a self-hosted Coolify server.
# Run as root on the server, from a clone of this repository:
#   sudo ./install.sh
set -euo pipefail

cd "$(dirname "$0")"

SOURCE=/data/coolify/source
THEME_DIR=/data/coolify/apple-theme
CUSTOM="$SOURCE/docker-compose.custom.yml"
MARKER='# coolify-apple-theme'
# Served under /coolify-apple-theme/: Coolify's proxy sends PathPrefix(`/app`)
# (so /apple-theme too) to Reverb.
PUBLIC_DEST=/var/www/html/public/coolify-apple-theme

if [[ ! -d "$SOURCE" ]]; then
    echo "No Coolify installation found in $SOURCE." >&2
    exit 1
fi

scripts/build.sh

# 1. Theme files. The nginx snippet is rewritten in place (same inode), so a
#    running container sees the new version through its bind mount.
mkdir -p "$THEME_DIR/public"
cp dist/public/* "$THEME_DIR/public/"
cat dist/apple-theme.conf > "$THEME_DIR/apple-theme.conf"

# 2. The compose override that mounts them. Coolify's upgrade script keeps it.
#    A file this theme wrote (it starts with the marker) is rewritten, so
#    older installs get the current mounts.
if [[ ! -f "$CUSTOM" ]] || [[ "$(head -n 1 "$CUSTOM")" == "$MARKER" ]]; then
    cp docker-compose.custom.yml "$CUSTOM"
    echo "Wrote $CUSTOM"
elif ! grep -q "$PUBLIC_DEST" "$CUSTOM"; then
    echo "$CUSTOM is not managed by the theme. Add (or update) these volumes in its coolify service, then run ./install.sh again:" >&2
    sed -n '/^services:/,$p' docker-compose.custom.yml >&2
    exit 1
fi

# 3. Apply. A container that already mounts the theme only needs an nginx
#    reload; otherwise recreate it with the image it runs now (never "latest",
#    which would upgrade Coolify).
mounts="$(docker inspect coolify --format '{{range .Mounts}}{{.Destination}} {{end}}')"
if [[ "$mounts" == *"/etc/nginx/conf.d/apple-theme.conf"* && "$mounts" == *"$PUBLIC_DEST"* ]]; then
    docker exec -u root coolify nginx -t -q
    docker exec -u root coolify nginx -s reload
    echo "Theme updated."
    exit 0
fi

current_image="$(docker inspect coolify --format '{{.Config.Image}}')"
current_tag="${current_image##*:}"
compose_files=(-f "$SOURCE/docker-compose.yml" -f "$SOURCE/docker-compose.prod.yml" -f "$CUSTOM")
if [[ -f "$SOURCE/docker-compose.postgres-upgrade.yml" ]]; then
    compose_files+=(-f "$SOURCE/docker-compose.postgres-upgrade.yml")
fi

echo "Recreating the coolify container (image tag $current_tag)..."
LATEST_IMAGE="$current_tag" docker compose --env-file "$SOURCE/.env" "${compose_files[@]}" \
    up -d --no-deps --wait --wait-timeout 120 coolify
echo "Theme installed. Reload Coolify in the browser."
