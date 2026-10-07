#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="${BASE_DIR:-/opt/monitoring}"
FAILURES=0
WARNINGS=0

echo "================================================================="
echo "🔍 PRE-DEPLOYMENT VERIFICATION GATE"
echo "================================================================="

# Check Docker runtime
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  echo "✅ Docker Engine is operational."
else
  echo "❌ FAIL: Docker Engine is not running or accessible."
  FAILURES=$((FAILURES + 1))
fi

# Check Docker Compose
if docker compose version >/dev/null 2>&1; then
  echo "✅ Docker Compose plugin available."
else
  echo "❌ FAIL: Docker Compose v2 is required."
  FAILURES=$((FAILURES + 1))
fi

# Check port 80/443 conflicts
if command -v ss >/dev/null 2>&1; then
  if ss -tulpn | grep -E ':(80|443)\b' | grep -v 'caddy' >/dev/null 2>&1; then
    echo "⚠️  WARNING: Host port 80/443 is in use. Stop any host web server before starting Caddy."
    WARNINGS=$((WARNINGS + 1))
  fi
fi

# Check env file
if [ -f "${BASE_DIR}/env/production.env" ]; then
  echo "✅ Production environment file exists."
fi

echo "================================================================="
echo "VERIFICATION SUMMARY: Failures: ${FAILURES}, Warnings: ${WARNINGS}"
if [ "${FAILURES}" -eq 0 ]; then
  echo "✅ PREPARATION VERIFICATION PASSED (Ready for deploy)."
  exit 0
else
  echo "❌ PREPARATION VERIFICATION FAILED."
  exit 1
fi
