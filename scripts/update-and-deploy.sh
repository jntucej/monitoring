#!/usr/bin/env bash
# ============================================================================
# Manual full update: pull latest main, rebuild, restart stack.
# Usage: ./scripts/update-and-deploy.sh
# ============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Pulling latest main..."
git fetch origin main
git checkout main
git pull origin main

echo "==> Rebuilding web + worker images..."
docker compose build web worker

# P0-3: apply pending migrations (advisory-lock, idempotent) BEFORE the app
# starts, so web/worker never boot against an un-migrated schema. The
# one-shot 'migrate' service is pulled in via the compose depends_on gate on
# web/worker; this explicit run also surfaces a failing migration to the
# operator HERE (abort, stack not restarted) instead of at container start.
echo "==> Running migrations (migrate service)..."
docker compose run --rm migrate

echo "==> Restarting stack..."
docker compose up -d postgres redis web worker

echo "==> Verifying..."
sleep 5
curl -sf -o /dev/null http://localhost:3000 && echo "   web up at http://localhost:3000" || echo "   web not yet responding"
echo "==> Done."
