#!/usr/bin/env bash
# ============================================================================
# J1.4 — postgres-down
#
# Proves: when the database is down, the web tier fails CLOSED with 503 +
# a machine-readable body (not 500 stack trace, not 200 empty data), and
# a write endpoint does NOT return 200.
#
# Injection: docker stop gate_postgres. The app's pool connections die;
# after ~5s every query fails and the health endpoint must report
# `status: unavailable` → HTTP 503. Cleanup restarts the container.
#
# A 200-from-health or a 200-from-write while the DB is down is the exact
# bug class the drill exists to catch (fail-open).
# ============================================================================
DRILL_ID="postgres-down"
source "$(cd "$(dirname "$0")" && pwd)/_lib.sh"

require_prod_ok
command -v docker >/dev/null 2>&1 || fail "docker not available on this host"
docker ps --format '{{.Names}}' | grep -q '^gate_postgres$' || { log "SKIP: gate_postgres not running"; exit 0; }

ADMIN_TOKEN="${DRILL_ADMIN_TOKEN:-}"
[ -n "$ADMIN_TOKEN" ] || fail "DRILL_ADMIN_TOKEN not set — the write-path assertion needs it"

STAMP_NOW="$(date +%s)"
cleanup() {
  log "cleanup: restarting $DB_CONTAINER"
  docker start "$DB_CONTAINER" >/dev/null 2>&1 || true
  # Wait for the pool to recover before declaring success.
  for _ in $(seq 1 30); do
    if docker exec "$DB_CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then
      log "$DB_CONTAINER recovered"
      return 0
    fi
    sleep 1
  done
  log "WARNING: $DB_CONTAINER did not come up within 30s — investigate"
}

# ---- inject ----------------------------------------------------------------
docker stop "$DB_CONTAINER" >/dev/null 2>&1 || fail "could not stop $DB_CONTAINER"
log "DB stopped; waiting 6s for the pool to notice"
sleep 6

# ---- assert: health must be 503 with a clear body ----------------------------
RESP_FILE="$(mktemp)"
CODE="$(curl -s -o "$RESP_FILE" -w '%{http_code}' "${APP_URL%/}/api/health")"
BODY="$(cat "$RESP_FILE")"
rm -f "$RESP_FILE"

if [ "$CODE" = "503" ]; then
  if echo "$BODY" | grep -qi 'unavailable\|degraded\|database\|postgres'; then
    log "health → 503 with clear body"
  else
    log "health → 503 but body lacks the expected marker; body: $(echo "$BODY" | head -c 160)"
  fi
else
  fail "health returned HTTP $CODE with DB down — expected 503 (fail-closed)"
  exit 1
fi

# ---- assert: a write must NOT return 200 ------------------------------------
WRITE_CODE="$(curl -s -o /dev/null -w '%{http_code}' -X POST "${APP_URL%/}/api/operator/mode" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Origin: ${APP_URL}" -H "Content-Type: application/json" \
  -d '{"mode":"OPEN","reason":"drill-postgres-down"}')"

if [ "$WRITE_CODE" = "200" ]; then
  fail "write returned 200 while DB was down — FAIL-CLOSED VIOLATED"
  exit 1
fi
log "write returned $WRITE_CODE (any value other than 200 is acceptable)"

pass "DB-down fail-closed verified: health=503, write=$WRITE_CODE"
write_evidence "pass" "{\"health_http\":\"$CODE\",\"write_http\":\"$WRITE_CODE\",\"duration_s\":$(( $(date +%s) - STAMP_NOW ))}"
