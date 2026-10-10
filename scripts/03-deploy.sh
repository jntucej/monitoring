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
cp Caddyfile "${BASE_DIR}/compose/Caddyfile"
if [ -f Dockerfile ]; then
  cp Dockerfile "${BASE_DIR}/compose/Dockerfile"
fi
if [ -d database ]; then
  cp -r database "${BASE_DIR}/compose/"
fi

echo "==> 3. Pulling & Building Stack Containers..."
cd "${BASE_DIR}/compose"
docker compose --env-file "${ENV_FILE}" build --pull
docker compose --env-file "${ENV_FILE}" up -d --remove-orphans

echo "==> 4. Running Post-Deployment Health Gate..."
if [ -f "${BASE_DIR}/scripts/verify-deploy.sh" ]; then
  bash "${BASE_DIR}/scripts/verify-deploy.sh"
fi

echo "================================================================="
echo "✅ DEPLOYMENT SUCCESSFUL"
echo "================================================================="
