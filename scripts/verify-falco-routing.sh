#!/usr/bin/env bash
# scripts/verify-falco-routing.sh
# L8c — The most common failure: Falco-generated alerts that never make it
# to a responder. A missing alert is a Sev-2. Run at least weekly; treat
# failure as an incident, not a flake.
#
# How it works:
#   1. Spawn a short-lived shell inside gate_web (the rule that fires is
#      "Shell Spawned in Application Container" — CRITICAL priority).
#   2. Give Falco 10 s to detect + POST the webhook to worker:3001.
#   3. Query system_alerts / operator_actions for the falco-sourced row.
#   4. If no row appeared within the window → the pipeline is broken and
#      this script exits non-zero.
set -euo pipefail

WINDOW_SECONDS=15
CONTAINER="${CONTAINER:-gate_web}"
DB_CONTAINER="${DB_CONTAINER:-gate_postgres}"
DB="${DB:-gate_monitor}"

echo "=== L8 Falco routing verification ==="

# 0) Is falco actually running?
if ! docker ps --filter "name=gate_falco" --format '{{.Names}}' | grep -q gate_falco; then
  echo "NOTE: gate_falco not running — skipping (add to weekly drill cron, not CI)."
  exit 0
fi

# 1) Force a shell spawn in the web container (Falco should catch it).
docker exec "$CONTAINER" sh -c "true" 2>/dev/null || true
echo "Spawned probe shell in ${CONTAINER}; waiting ${WINDOW_SECONDS}s for the alert..."
sleep "$WINDOW_SECONDS"

# 2) Did the alert reach the receiver and get recorded?
COUNT=$(docker exec "$DB_CONTAINER" psql -U postgres -d "$DB" -tAc \
  "SELECT count(*) FROM system_alerts
   WHERE details->>'source'='falco' AND created_at > NOW() - INTERVAL '${WINDOW_SECONDS} seconds'" \
  2>/dev/null || echo "0")

if [ "${COUNT:-0}" -ge 1 ]; then
  echo "✓ Falco → webhook → system_alerts pipeline verified (${COUNT} alert row(s) in window)."
  exit 0
fi

echo "✗ FAIL: no falco-sourced system_alerts row appeared within ${WINDOW_SECONDS}s."
echo "   Check: docker logs gate_falco | tail -20"
echo "   Check: docker logs gate_worker | grep falco | tail -10"
echo "   A missing alert is a Sev-2 — treat this as an incident."
exit 1
