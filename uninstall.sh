#!/usr/bin/env bash
# Removes the Apple theme from a self-hosted Coolify server. Run as root.
#
# Order matters: the compose override must go before the theme files. A bind
# mount whose source file is missing makes Docker create a directory there,
# and nginx then fails to load conf.d/apple-theme.conf.
set -euo pipefail

SOURCE=/data/coolify/source
THEME_DIR=/data/coolify/apple-theme
CUSTOM="$SOURCE/docker-compose.custom.yml"

# 1. Turn the theme off right away: an empty snippet injects nothing.
if [[ -f "$THEME_DIR/apple-theme.conf" ]]; then
    : > "$THEME_DIR/apple-theme.conf"
    docker exec -u root coolify nginx -s reload 2>/dev/null || true
fi

# 2. Remove the mounts. A custom file that only holds the theme is deleted.
if [[ -f "$CUSTOM" ]] && grep -q "/data/coolify/apple-theme" "$CUSTOM"; then
    if grep -q '^# coolify-apple-theme' "$CUSTOM"; then
        rm "$CUSTOM"
        echo "Removed $CUSTOM"
    else
        echo "Remove the /data/coolify/apple-theme volumes from $CUSTOM, then run ./uninstall.sh again." >&2
        exit 1
    fi
fi

# 3. Recreate the container without the mounts, on the image it runs now.
current_image="$(docker inspect coolify --format '{{.Config.Image}}')"
compose_files=(-f "$SOURCE/docker-compose.yml" -f "$SOURCE/docker-compose.prod.yml")
[[ -f "$CUSTOM" ]] && compose_files+=(-f "$CUSTOM")
if [[ -f "$SOURCE/docker-compose.postgres-upgrade.yml" ]]; then
    compose_files+=(-f "$SOURCE/docker-compose.postgres-upgrade.yml")
fi
LATEST_IMAGE="${current_image##*:}" docker compose --env-file "$SOURCE/.env" "${compose_files[@]}" \
    up -d --no-deps --wait --wait-timeout 120 coolify

# 4. Only now delete the files.
rm -rf "$THEME_DIR"
echo "Theme removed."
