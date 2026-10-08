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

echo "==> 4. Verifying Web App Health..."
for i in $(seq 1 30); do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' gate_web 2>/dev/null || echo "unknown")
  if [ "${STATUS}" = "healthy" ]; then
    echo "✅ Web container is healthy."
    break
  fi
  echo "Waiting for gate_web to be healthy (attempt ${i}/30, status: ${STATUS})..."
  sleep 10
  if [ "${i}" = "30" ]; then
    echo "❌ Web container failed to become healthy."
    exit 1
  fi
done

echo "================================================================="
echo "✅ POST-DEPLOYMENT VERIFICATION COMPLETE"
echo "================================================================="
