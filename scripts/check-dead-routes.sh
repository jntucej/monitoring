#!/usr/bin/env bash
# scripts/check-dead-routes.sh
# Audits all API routes in src/app/api to identify routes that lack consumer calls in client code.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== Auditing API Routes for Client Usage ==="

DEAD_COUNT=0
TOTAL_ROUTES=0

for route in $(find "$ROOT_DIR/src/app/api" -name 'route.ts' 2>/dev/null | sort); do
  TOTAL_ROUTES=$((TOTAL_ROUTES + 1))
  # Derive base path (e.g. /root/monitoring/src/app/api/auth/login/route.ts -> /api/auth/login)
  endpoint=$(echo "$route" | sed -E 's|.*/src/app||; s|/route\.ts||')
  # Remove param placeholders like [id] -> wildcard/regex check
  base_endpoint=$(echo "$endpoint" | sed 's|\[.*\]||g' | sed 's|/$||')

  # Search across UI and lib consumers for the endpoint path
  if ! grep -rq --exclude-dir='.next' --exclude-dir='node_modules' --exclude="$route" "$base_endpoint" "$ROOT_DIR/src" 2>/dev/null; then
    # Allow known webhook, metrics, or public root routes
    if [[ "$base_endpoint" =~ ^/api/(cron|health|metrics) ]]; then
      continue
    fi
    # Non-blocking audit warning as specified in Master Plan priority matrix
    echo "  [AUDIT] Unreferenced endpoint candidate: $endpoint ($route)"
    DEAD_COUNT=$((DEAD_COUNT + 1))
  fi
done

echo ""
echo "=== Summary: $TOTAL_ROUTES total routes audited ($DEAD_COUNT unreferenced candidates logged) ==="
exit 0
