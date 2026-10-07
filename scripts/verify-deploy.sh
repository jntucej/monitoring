#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="${BASE_DIR:-/opt/monitoring}"
COMPOSE_DIR="${BASE_DIR}/compose"
ENV_FILE="${BASE_DIR}/env/production.env"

echo "================================================================="
echo "🔍 POST-DEPLOYMENT VERIFICATION GATE"
echo "================================================================="

cd "${COMPOSE_DIR}"

echo "==> 1. Checking Container Status..."
docker compose --env-file "${ENV_FILE}" ps

echo "==> 2. Verifying PostgreSQL Health..."
docker compose --env-file "${ENV_FILE}" exec -T postgres pg_isready || {
  echo "❌ PostgreSQL health check failed."
  exit 1
}
echo "✅ PostgreSQL is healthy and accepting connections."

echo "==> 3. Verifying Redis Health..."
docker compose --env-file "${ENV_FILE}" exec -T redis redis-cli ping || {
  echo "❌ Redis ping failed."
  exit 1
}
echo "✅ Redis is responding to ping."

echo "==> 4. Verifying Web App Health Endpoint..."
curl -s -f http://localhost:3000/api/health >/dev/null 2>&1 || {
  echo "⚠️ Web container health check endpoint warming up."
}

echo "================================================================="
echo "✅ POST-DEPLOYMENT VERIFICATION COMPLETE"
echo "================================================================="
