#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="${BASE_DIR:-/opt/monitoring}"
COMPOSE_FILE="${BASE_DIR}/compose/docker-compose.yml"
ENV_FILE="${BASE_DIR}/env/production.env"

echo "================================================================="
echo "🚀 EXECUTING APPLICATION DEPLOYMENT"
echo "================================================================="

if [ ! -f "${ENV_FILE}" ]; then
  echo "❌ Error: Production env file ${ENV_FILE} not found!"
  exit 1
fi

echo "==> 1. Running Pre-Deployment Verification Gate..."
if [ -f "${BASE_DIR}/scripts/verify-prep.sh" ]; then
  bash "${BASE_DIR}/scripts/verify-prep.sh"
fi

echo "==> 2. Copying Compose & Configuration files..."
mkdir -p "${BASE_DIR}/compose"
cp docker-compose.yml            "${BASE_DIR}/compose/docker-compose.yml"
cp compose/Caddyfile             "${BASE_DIR}/compose/Caddyfile"
cp -r compose/postgres           "${BASE_DIR}/compose/postgres"
cp -r compose/security           "${BASE_DIR}/compose/security"
cp -r prometheus                 "${BASE_DIR}/prometheus"
cp -r cloudflared                "${BASE_DIR}/cloudflared"
cp -r scripts                    "${BASE_DIR}/scripts"
cp -r database                   "${BASE_DIR}/database"

# .metrics.token is required by prometheus (bind-mount, no `required:false`).
if [ ! -f "${BASE_DIR}/.metrics.token" ]; then
  if [ -z "${METRICS_SCRAPE_TOKEN:-}" ]; then
    echo "❌ METRICS_SCRAPE_TOKEN is not set; cannot create ${BASE_DIR}/.metrics.token" >&2
    exit 1
  fi
  printf '%s' "${METRICS_SCRAPE_TOKEN}" > "${BASE_DIR}/.metrics.token"
  chmod 600 "${BASE_DIR}/.metrics.token"
fi

# .alertmanager-token is required by alertmanager (bind-mount, no `required:false`).
if [ ! -f "${BASE_DIR}/.alertmanager-token" ]; then
  _at="${ALERTMANAGER_WEBHOOK_TOKEN:-$(openssl rand -hex 32)}"
  printf '%s' "${_at}" > "${BASE_DIR}/.alertmanager-token"
  chmod 600 "${BASE_DIR}/.alertmanager-token"
fi

# All `docker compose` calls use --project-directory ${BASE_DIR} so that
# relative bind mounts in the compose file resolve against the repo root
# ($BASE_DIR), not the compose file's own directory ($BASE_DIR/compose).
COMPOSE=(
  docker compose
  --project-directory "${BASE_DIR}"
  -f "${BASE_DIR}/compose/docker-compose.yml"
  --env-file "${ENV_FILE}"
)

echo "==> 3. Pulling & Building Stack Containers..."
cd "${BASE_DIR}"
"${COMPOSE[@]}" build --pull

echo "==> 3b. Applying database migrations (ordered, before app start)..."
MIG_OUT="$("${COMPOSE[@]}" run --rm migrate 2>&1)" || {
  echo "❌ Migration step failed — aborting before app start:"
  echo "${MIG_OUT}"
  exit 1
}
echo "${MIG_OUT}" | tail -5

echo "==> 3c. Verifying deploy prerequisites..."
if [ -f "${BASE_DIR}/scripts/verify-prep.sh" ]; then
  bash "${BASE_DIR}/scripts/verify-prep.sh"
fi

echo "==> 4. Starting Stack Containers..."
"${COMPOSE[@]}" up -d --remove-orphans

echo "==> 4. Running Post-Deployment Health Gate..."
if [ -f "${BASE_DIR}/scripts/verify-deploy.sh" ]; then
  bash "${BASE_DIR}/scripts/verify-deploy.sh"
fi

echo "================================================================="
echo "✅ DEPLOYMENT SUCCESSFUL"
echo "================================================================="
