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

echo "==> 2.1 Verifying PostgreSQL Auth for Application User..."
docker compose --env-file "${ENV_FILE}" exec -T postgres \
  psql -U gate_app -d gate_monitor -c "SELECT 1 FROM users LIMIT 0" >/dev/null || {
  echo "❌ PostgreSQL auth/grants broken for gate_app. Check RLS policies and grants."
  exit 1
}
echo "✅ PostgreSQL auth verified for gate_app user."

# Prove TCP auth works with the actual configured password. The check above
# uses the unix socket (trusted auth), which cannot catch the
# current_setting()/psql-var mismatch between the migration and
# DATABASE_URL — a wrong gate_app password passes socket auth but fails TCP.
GATE_APP_PASSWORD="${GATE_APP_PASSWORD:-$(grep -E '^GATE_APP_PASSWORD=' "${ENV_FILE}" | head -1 | cut -d= -f2- || true)}"
docker compose --project-directory "${BASE_DIR}" --env-file "${ENV_FILE}" exec -T -e PGPASSWORD="${GATE_APP_PASSWORD}" postgres \
  psql -h 127.0.0.1 -U gate_app -d gate_monitor -c "SELECT 1" >/dev/null || {
  echo "❌ gate_app TCP auth with the configured password FAILED — mismatch between migration and DATABASE_URL."
  exit 1
}
echo "✅ gate_app TCP auth verified with configured password."

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
