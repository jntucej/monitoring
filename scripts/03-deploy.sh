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
mkdir -p "${BASE_DIR}/compose" "${BASE_DIR}/config"
cp docker-compose.yml "${BASE_DIR}/compose/docker-compose.yml"
# compose/Caddyfile is the authoritative reverse-proxy config (mounted by the
# compose service). Propagate it to the deploy target.
cp compose/Caddyfile "${BASE_DIR}/compose/Caddyfile"
if [ -f Dockerfile ]; then
  cp Dockerfile "${BASE_DIR}/compose/Dockerfile"
fi
if [ -d database ]; then
  cp -r database "${BASE_DIR}/compose/"
fi

echo "==> 3. Pulling & Building Stack Containers..."
cd "${BASE_DIR}/compose"
docker compose --env-file "${ENV_FILE}" build --pull

echo "==> 3b. Applying database migrations (ordered, before app start)..."
# Run the migrate service once. It blocks until every migration is applied,
# exits 0 on success. If it fails, we abort BEFORE bringing up web/worker so
# the app never serves traffic against an un-migrated schema.
# (web/worker also gate on `migrate: service_completed_successfully`.)
MIG_OUT="$(docker compose --env-file "${ENV_FILE}" run --rm migrate 2>&1)" || {
  echo "❌ Migration step failed — aborting before app start:"
  echo "${MIG_OUT}"
  exit 1
}
echo "${MIG_OUT}" | tail -5

echo "==> 4. Starting Stack Containers..."
docker compose --env-file "${ENV_FILE}" up -d --remove-orphans

echo "==> 4. Running Post-Deployment Health Gate..."
if [ -f "${BASE_DIR}/scripts/verify-deploy.sh" ]; then
  bash "${BASE_DIR}/scripts/verify-deploy.sh"
fi

echo "================================================================="
echo "✅ DEPLOYMENT SUCCESSFUL"
echo "================================================================="
