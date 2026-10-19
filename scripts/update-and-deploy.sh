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

echo "==> Restarting stack..."
docker compose up -d postgres redis web worker

echo "==> Verifying..."
sleep 5
curl -sf -o /dev/null http://localhost:3000 && echo "   web up at http://localhost:3000" || echo "   web not yet responding"
echo "==> Done."
