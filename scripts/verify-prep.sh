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
  PORT_CONFLICTS=$(ss -tulpn 2>/dev/null | grep -E ':(80|443)\b' | grep -v 'caddy' || true)
  if [ -n "$PORT_CONFLICTS" ]; then
    echo "❌ FAIL: Host port 80/443 is in use by non-Caddy service."
    echo "   Conflicts:"
    echo "$PORT_CONFLICTS" | sed 's/^/   /'
    echo "   Stop the conflicting service before deploying."
    FAILURES=$((FAILURES + 1))
  else
    echo "✅ No port conflicts detected on 80/443."
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
