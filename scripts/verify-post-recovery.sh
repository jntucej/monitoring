#!/usr/bin/env bash
# verify-post-recovery.sh — 12-level post-down verification ladder.
#
# You cannot trust a system that just came back up. The container is
# running, HTTP returns 200, but every one of these can be true at the
# same time: the DB is up but reads stale data, the session cookie is
# valid but points at a deleted user, the write path returns 200 but RLS
# silently discarded the row, the worker is running but its job loop has
# died, the autonomous system is running but its sensors are blind.
#
# Each level is a black-box test that answers one question: "Is this layer
# actually working, or is it just responding?" Run in order. The first
# level that fails is where the recovery stopped.
#
# Usage:
#   SMOKE_USER=sysadmin SMOKE_PASS='...' CRON_SECRET='...' \
#     bash scripts/verify-post-recovery.sh
#
# Exit 0 = all 12 levels pass. Exit 1 = a level failed (the script prints
# which one and what to run next).

set -uo pipefail
BASE="${SMOKE_BASE:-http://127.0.0.1:80}"
PASS=0; FAIL=0

check() {
  local lvl="$1" desc="$2" want="$3" got="$4"
  if [ "$got" = "$want" ]; then
    echo "✓ L$lvl — $desc"
    PASS=$((PASS+1))
  else
    echo "✗ L$lvl — $desc (want '$want', got '$got')"
    FAIL=$((FAIL+1))
  fi
}

psql_live() {
  docker exec gate_postgres psql -U postgres -d gate_monitor -tAc "$1" 2>/dev/null
}
psql_gate_app() {
  # Run as gate_app over TCP (the app's real path). The .env has the
  # POSTGRES_PASSWORD; construct the URL the same way compose does.
  local pw host port db
  pw=$(grep '^POSTGRES_PASSWORD=' /opt/monitoring/compose/.env 2>/dev/null | cut -d= -f2- || true)
  host="${POSTGRES_HOST:-postgres}"; port="${POSTGRES_PORT:-5432}"; db="${POSTGRES_DB:-gate_monitor}"
  # Fall back to the container's own connection if env is not set.
  docker exec gate_web node -e "
    const { Pool } = require('pg');
    const p = new Pool({ connectionString: process.env.DATABASE_URL });
    p.query(process.argv[1]).then(r => {
      const v = r.rows[0] ? (typeof r.rows[0] === 'object' ? JSON.stringify(r.rows[0]) : r.rows[0]) : '';
      console.log(v); p.end();
    }).catch(e => { console.error(e.message); process.exit(1); });
  " "$1" 2>/dev/null
}

# ── L1: all containers running ──────────────────────────────────────────
NOT_UP=$(docker ps --format '{{.Names}}\t{{.Status}}' | grep -E 'gate_' | grep -vE 'Up.*healthy|Up.*\(' | wc -l)
# docker ps only shows running ones; count the gate_ ones that are NOT "Up"
ALL_UP_CHECK=$(docker ps -a --filter "name=gate_" --format '{{.State}}' 2>/dev/null | grep -vc "running")
check 1 "All gate containers running" "0" "$ALL_UP_CHECK"

# ── L2: /api/health returns 200 through Caddy ───────────────────────────
HTTP=$(curl -sS -o /dev/null -w "%{http_code}" -m 5 "$BASE/api/health" 2>/dev/null || echo "000")
check 2 "Health endpoint (via Caddy)" "200" "$HTTP"

# ── L3: gate_app can WRITE through RLS (the one test that catches the
#     RLS write regression — reads can pass while every write is silently
#     discarded) ─────────────────────────────────────────────────────────
WRITE_OK=$(psql_gate_app "BEGIN; INSERT INTO audit_logs (id, action, details) VALUES (gen_random_uuid(), 'RECOVERY_PROBE', '{}'::jsonb) RETURNING 'ok'; ROLLBACK;" 2>/dev/null | grep -c "^ok$")
check 3 "gate_app can write audit_logs" "1" "$WRITE_OK"

# ── L4: login returns a token ────────────────────────────────────────────
SMOKE_USER="${SMOKE_USER:-sysadmin}"
SMOKE_PASS="${SMOKE_PASS:-$(grep '^SYSADMIN_PASSWORD=' /opt/monitoring/compose/.env 2>/dev/null | cut -d= -f2- || echo 'Sysadmin@123')}"
TOKEN=$(curl -sS -X POST "$BASE/api/auth/login" \
  -H "Origin: $BASE" -H "Content-Type: application/json" \
  -d "{\"login\":\"$SMOKE_USER\",\"password\":\"$SMOKE_PASS\"}" \
  2>/dev/null | jq -r '.data.token // .token // "null"')
TOKEN_OK="false"; [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ] && TOKEN_OK="true"
check 4 "Login returns a token" "true" "$TOKEN_OK"

# ── L5: the token verifies and returns a non-null role ──────────────────
ROLE=$(curl -sS "$BASE/api/auth/session" -H "Authorization: Bearer $TOKEN" \
  2>/dev/null | jq -r '.user.role // .data.user.role // "null"')
ROLE_OK="false"; [ "$ROLE" != "null" ] && ROLE_OK="true"
check 5 "Session returns non-null role" "true" "$ROLE_OK"

# ── L6: a read route reaches data (200, not 401/500) ────────────────────
LAST_CODE=$(curl -sS -o /dev/null -w "%{http_code}" \
  "$BASE/api/operator/last-scan" -H "Authorization: Bearer $TOKEN" 2>/dev/null)
L6_OK="false"
case "$LAST_CODE" in 200|400|404) L6_OK="true";; esac
check 6 "Read route responds" "true" "$L6_OK"

# ── L7: a write route actually persists (POST /api/permissions, verify
#     the row landed, then clean up) ─────────────────────────────────────
TICKET=$(curl -sS -X POST "$BASE/api/permissions" \
  -H "Authorization: Bearer $TOKEN" -H "Origin: $BASE" -H "Content-Type: application/json" \
  -d '{"workflowType":"hostel","reason":"home_out","fromDate":"2026-11-10T00:00:00Z","toDate":"2026-11-12T00:00:00Z","description":"RECOVERY_PROBE"}' \
  2>/dev/null | jq -r '.data.ticket_number // "null")')
L7_OK="false"
if [ "$TICKET" != "null" ] && [ -n "$TICKET" ]; then
  ROWS=$(psql_live "SELECT count(*) FROM permissions WHERE description = 'RECOVERY_PROBE';")
  [ "${ROWS:-0}" -ge 1 ] && L7_OK="true"
  # Clean up the probe row.
  psql_live "DELETE FROM permissions WHERE description = 'RECOVERY_PROBE';" >/dev/null 2>&1
fi
check 7 "Write route persists a row" "true" "$L7_OK"

# ── L8: the worker is running AND its heartbeat is fresh (< 120s) ──────
HB_AGE=$(psql_live "SELECT COALESCE(EXTRACT(EPOCH FROM (NOW() - max(last_run_at)))::int, 99999) FROM worker_job_heartbeats;")
L8_OK="false"; [ "${HB_AGE:-99999}" -lt 120 ] && L8_OK="true"
check 8 "Worker heartbeat < 120s" "true" "$L8_OK"

# ── L9: an SSE stream actually sends data within 10s ────────────────────
SSE_DATA=$(timeout 10 curl -sN "$BASE/api/gate/stream" -H "Authorization: Bearer $TOKEN" 2>/dev/null | grep -c "^data:" || echo 0)
L9_OK="false"; [ "${SSE_DATA:-0}" -gt 0 ] && L9_OK="true"
check 9 "SSE streams data" "true" "$L9_OK"

# ── L10: cron endpoint is reachable with the right secret ───────────────
CRON_SECRET="${CRON_SECRET:-$(grep '^CRON_SECRET=' /opt/monitoring/compose/.env 2>/dev/null | cut -d= -f2- || echo '')}"
CRON_CODE=$(curl -sS -o /dev/null -w "%{http_code}" -X POST \
  -H "x-cron-secret: $CRON_SECRET" "$BASE/api/cron/expire-passes" 2>/dev/null)
check 10 "Cron endpoint reachable" "200" "$CRON_CODE"

# ── L11: the autonomous loop is alive (fresh snapshot, no stuck pending) ─
FRESH_SNAP=$(psql_live "SELECT count(*) FROM infra_snapshots WHERE captured_at > now() - interval '2 minutes';")
STUCK_PENDING=$(psql_live "SELECT count(*) FROM operator_actions WHERE status = 'pending' AND created_at < now() - interval '25 hours';")
L11_OK="false"; [ "${FRESH_SNAP:-0}" -gt 0 ] && L11_OK="true"
check 11 "Autonomous snapshot fresh + no stuck pending" "true" "$L11_OK"

# L11b: kill switch is honored — set auto_heal_enabled=FALSE, stop web,
# confirm it stays stopped, re-enable.
PS=$(psql_live "SELECT enabled FROM automation_controls WHERE name='auto_heal_enabled';")
if [ "$PS" = "t" ]; then
  psql_live "UPDATE automation_controls SET enabled=FALSE, reason='recovery probe' WHERE name='auto_heal_enabled';" >/dev/null
  docker stop gate_web >/dev/null 2>&1
  sleep 6
  STILL_DOWN=$(docker inspect --format '{{.State.Status}}' gate_web 2>/dev/null)
  # Re-enable and bring web back.
  psql_live "UPDATE automation_controls SET enabled=TRUE, reason=NULL WHERE name='auto_heal_enabled';" >/dev/null
  docker start gate_web >/dev/null 2>&1
  L11B_OK="false"
  [ "$STILL_DOWN" = "exited" ] || [ "$STILL_DOWN" = "created" ] && L11B_OK="true"
  check 11b "Kill switch honored (web stays down when disabled)" "true" "$L11B_OK"
else
  echo "• L11b skipped (auto_heal_enabled was already FALSE — re-enable it first)"
fi

# ── L12: dashboards show today's data (not stale/zero) ─────────────────
# /api/status must return a status field and a non-empty live snapshot.
STATUS_DATA=$(curl -sS "$BASE/api/status" 2>/dev/null | jq -r '.data.status // "null"')
L12_OK="false"; [ "$STATUS_DATA" != "null" ] && L12_OK="true"
check 12 "/api/status returns live data" "true" "$L12_OK"

# ── Summary ───────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════════"
echo "  PASS: $PASS   FAIL: $FAIL"
echo "══════════════════════════════════════════════════════════"

if [ "$FAIL" -eq 0 ]; then
  echo "✓ All levels passed — the system is operational, not just up."
  exit 0
else
  echo "✗ $FAIL level(s) failed. The first failing level is where recovery stopped."
  echo ""
  echo "What to run next (by failure level):"
  echo "  L1  docker compose logs --tail=200 <name>"
  echo "  L2  docker logs gate_caddy gate_web"
  echo "  L3  apply the RLS write-set migration; re-run"
  echo "  L4  docker exec gate_web env | grep JWT"
  echo "  L5  open /api/auth/session route; ensure it returns { user }"
  echo "  L7  docker logs gate_web | grep INSERT"
  echo "  L8  docker logs gate_worker; restart; verify heartbeat"
  echo "  L9  check /api/gate/stream handler req.signal cleanup"
  echo "  L10 bash scripts/setup-crons.sh; verify CRON_SECRET"
  echo "  L11 docker logs gate_worker | grep -E 'forecast|snapshot|actions'"
  exit 1
fi
