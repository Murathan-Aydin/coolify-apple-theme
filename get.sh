#!/usr/bin/env bash
# One-line installer for coolify-apple-theme. Run as root on the Coolify server:
#
#   curl -fsSL https://raw.githubusercontent.com/Murathan-Aydin/coolify-apple-theme/main/get.sh | sudo bash
#
# Uninstall:  ... | sudo bash -s -- uninstall
# Options (environment variables):
#   COOLIFY_APPLE_THEME_REF   branch or tag to install (default: main)
#   GITHUB_TOKEN              token with read access, when the repository is private
#
# Everything runs inside main(), so a truncated download executes nothing.
set -euo pipefail

main() {
    local repo='Murathan-Aydin/coolify-apple-theme'
    local ref="${COOLIFY_APPLE_THEME_REF:-main}"
    local dir='/opt/coolify-apple-theme'
    local action="${1:-install}"

    if [[ "$(id -u)" -ne 0 ]]; then
        echo 'Run as root: curl -fsSL <url> | sudo bash' >&2
        exit 1
    fi
    if [[ "$action" != 'install' && "$action" != 'uninstall' ]]; then
        echo "Unknown action '$action' (use install or uninstall)." >&2
        exit 1
    fi
    for tool in curl tar docker; do
        command -v "$tool" >/dev/null || { echo "Missing $tool." >&2; exit 1; }
    done

    if [[ "$action" == 'uninstall' && -x "$dir/uninstall.sh" ]]; then
        "$dir/uninstall.sh"
        rm -rf "$dir"
        return
    fi

    # Download the repository at $ref. The API tarball works for private
    # repositories with a token; codeload serves public ones without one.
    local tmp
    tmp="$(mktemp -d)"
    trap 'rm -rf "$tmp"' EXIT
    echo "Downloading $repo@$ref..."
    if [[ -n "${GITHUB_TOKEN:-}" ]]; then
        curl -fsSL -H "Authorization: Bearer $GITHUB_TOKEN" -H 'Accept: application/vnd.github+json' \
            "https://api.github.com/repos/$repo/tarball/$ref" -o "$tmp/theme.tar.gz"
    else
        curl -fsSL "https://codeload.github.com/$repo/tar.gz/$ref" -o "$tmp/theme.tar.gz" || {
            echo 'Download failed. If the repository is private, set GITHUB_TOKEN.' >&2
            exit 1
        }
    fi
    mkdir -p "$tmp/src"
    tar -xzf "$tmp/theme.tar.gz" -C "$tmp/src" --strip-components=1

    # The theme's state lives in /data/coolify; this folder only holds the code.
    rm -rf "$dir"
    mv "$tmp/src" "$dir"
    chmod +x "$dir"/install.sh "$dir"/uninstall.sh "$dir"/scripts/*.sh

    if [[ "$action" == 'uninstall' ]]; then
        "$dir/uninstall.sh"
        rm -rf "$dir"
    else
        "$dir/install.sh"
    fi
}

main "$@"
