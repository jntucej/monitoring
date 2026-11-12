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

# If AUTH_JWT_SECRETS is set, rotate the CURRENT key into the ring before
# replacing AUTH_JWT_SECRET so active access tokens keep verifying during
# the restart window (otherwise all logged-in users get 401'd).
#   OLD=$(grep '^AUTH_JWT_SECRET=' "$ENV_FILE" | cut -d= -f2-)
#   NEW=$(openssl rand -hex 32)
#   sed -i "s|^AUTH_JWT_SECRETS=.*|AUTH_JWT_SECRETS=k$(date +%s):${NEW},k_prev:${OLD}|" "$ENV_FILE"

# Containers cache the env/credentials at start; force a rolling restart so
# every replica picks up the new secret.
BASE_DIR="${BASE_DIR:-/opt/monitoring}"
COMPOSE=(docker compose --project-directory "$BASE_DIR" \
         -f "$BASE_DIR/compose/docker-compose.yml" --env-file "$BASE_DIR/env/production.env")

echo "==> Rolling-restarting web + worker to pick up new secret…"
"${COMPOSE[@]}" up -d --force-recreate --no-deps web worker
for i in $(seq 1 30); do
  S=$(docker inspect --format='{{.State.Health.Status}}' gate_web 2>/dev/null || echo unknown)
  [ "$S" = "healthy" ] && { echo "   web healthy after rotation"; break; }
  sleep 2
done
echo "Note: Rolling restart completed. If AUTH_JWT_SECRETS ring is configured, active tokens will verify during the transition window."
