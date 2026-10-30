#!/usr/bin/env bash
set -euo pipefail

CADDY_FILE="${CADDY_FILE:-Caddyfile}"

if [ ! -f "$CADDY_FILE" ]; then
  echo "ERROR: $CADDY_FILE not found" >&2
  exit 1
fi

# Take a backup with timestamp so we can audit/rollback
BACKUP="${CADDY_FILE}.bak.$(date +%Y%m%d%H%M%S)"
cp "$CADDY_FILE" "$BACKUP"
echo "Backup created: $BACKUP"

# Track whether any change was made
CHANGED=0

# 1. Replace the placeholder with the plain HTTP listener
if grep -qE '^\{\$PUBLIC_URL' "$CADDY_FILE"; then
  sed -i -E 's/^\{\$PUBLIC_URL.*$/:80 {/g' "$CADDY_FILE"
  CHANGED=1
  echo "Replaced \$PUBLIC_URL block with :80 block"
fi

# 2. Strip tls directives only if they exist AND we're behind a plain-HTTP proxy
if grep -qE '^[[:space:]]*tls ' "$CADDY_FILE"; then
  if [ "${BEHIND_TLS_TERMINATOR:-false}" = "true" ]; then
    sed -i -E '/^[[:space:]]*tls /d' "$CADDY_FILE"
    CHANGED=1
    echo "Removed tls directives (BEHIND_TLS_TERMINATOR=true)"
  else
    echo "NOTICE: tls directives present but BEHIND_TLS_TERMINATOR != true; leaving them."
  fi
fi

# 3. Validate the resulting Caddyfile
if command -v docker >/dev/null 2>&1; then
  if ! docker run --rm -v "$(pwd)/$CADDY_FILE:/etc/caddy/Caddyfile:ro" caddy:2-alpine \
       caddy validate --config /etc/caddy/Caddyfile 2>/dev/null; then
    echo "ERROR: Patched Caddyfile fails validation. Restoring backup." >&2
    mv "$BACKUP" "$CADDY_FILE"
    exit 1
  fi
  echo "Caddyfile passes validation"
fi

if [ "$CHANGED" = "0" ]; then
  echo "No changes needed — Caddyfile already patched."
else
  echo "Caddyfile patched successfully."
fi
