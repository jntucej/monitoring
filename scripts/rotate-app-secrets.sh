#!/usr/bin/env bash
# Rotates application secrets (JWT, Auth, QR, Mobile, Cron, Scrape tokens)
# and updates the environment configuration.
set -euo pipefail

ENV_FILE="${1:-.env}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Target env file '$ENV_FILE' not found. Creating..."
  touch "$ENV_FILE"
fi

echo "=== Rotating Application Secrets in $ENV_FILE ==="

rotate_secret() {
  local var_name="$1"
  local bytes="${2:-32}"
  local new_val
  new_val=$(openssl rand -hex "$bytes")

  if grep -q "^${var_name}=" "$ENV_FILE"; then
    sed -i "s|^${var_name}=.*|${var_name}=${new_val}|" "$ENV_FILE"
  else
    echo "${var_name}=${new_val}" >> "$ENV_FILE"
  fi
  echo "✓ Rotated ${var_name}"
}

rotate_secret "AUTH_JWT_SECRET" 32
rotate_secret "JWT_SECRET" 32
rotate_secret "QR_TOKEN_SECRET" 32
rotate_secret "MOBILE_TOKEN_SECRET" 32
rotate_secret "CRON_SECRET" 32
rotate_secret "INTERNAL_MW_SECRET" 32
rotate_secret "METRICS_SCRAPE_TOKEN" 32

echo "=== Secret rotation complete ==="
echo "Note: If running services in production, restart containers to apply updated secrets."
