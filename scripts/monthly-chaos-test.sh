#!/usr/bin/env bash
# Monthly chaos test (DR §6) — proves the auto-heal + kill-switch loop works
# under real failure, not just on paper.
#
# Run: Sunday 2am (cron). Each test is isolated and leaves the system in a
# known-good state before moving on.
#
# Tests:
#   1. Stop gate_worker -> auto-heal restarts it within 5 min
#   2. Stop gate_web    -> auto-heal restarts it within 2 min
#   3. Disable auto_heal_enabled -> stop gate_worker -> confirm NO restart
#   4. Re-enable auto_heal_enabled -> confirm restarts resume

set -uo pipefail
BASE="${BASE_DIR:-/opt/monitoring/compose}"
DB="${DB:-gate_monitor}"
PG_CONTAINER="${PG_CONTAINER:-gate_postgres}"
TELEGRAM_SCRIPT="${TELEGRAM_SCRIPT:-${BASE}/scripts/telegram-notify.sh}"
CHAOS_LOG="${BASE}/backups/chaos-$(date +%Y%m%d_%H%M%S).log"

log() { echo "[$(date '+%F %T')] $*" | tee -a "$CHAOS_LOG"; }
notify() {
  log "NOTIFY: $1"
  [ -f "$TELEGRAM_SCRIPT" ] && bash "$TELEGRAM_SCRIPT" "$1" 2>/dev/null || true
}

drill_enabled() {
  local v
  v=$(docker exec "$PG_CONTAINER" psql -U postgres -d "$DB" -tAc \
    "SELECT enabled FROM automation_controls WHERE name='drill_enabled'" 2>/dev/null || echo "t")
  [ "$v" = "t" ]
}

set_auto_heal() {
  docker exec "$PG_CONTAINER" psql -U postgres -d "$DB" -q -c \
    "UPDATE automation_controls SET enabled=$1 WHERE name='auto_heal_enabled';"
}

wait_for_status() {
  local c="$1" want="$2" timeout="$3" i=0
  while [ $i -lt "$timeout" ]; do
    local st; st=$(docker inspect --format '{{.State.Status}}' "$c" 2>/dev/null || echo "missing")
    [ "$st" = "$want" ] && return 0
    sleep 5; i=$((i+5))
  done
  return 1
}

if ! drill_enabled; then
  log "CHAOS TEST SKIPPED: drill_enabled=FALSE"
  exit 0
fi

log "=== MONTHLY CHAOS TEST START ==="
RESULTS=()

log "[T1] Stopping gate_worker..."
docker stop gate_worker >/dev/null 2>&1 || true
if wait_for_status gate_worker "running" 300; then
  log "[T1] PASS: gate_worker auto-restarted within 5m"
  RESULTS+=("T1=pass")
else
  log "[T1] FAIL: gate_worker did not restart within 5m"
  RESULTS+=("T1=FAIL")
fi

log "[T2] Stopping gate_web..."
docker stop gate_web >/dev/null 2>&1 || true
if wait_for_status gate_web "running" 120; then
  log "[T2] PASS: gate_web auto-restarted within 2m"
  RESULTS+=("T2=pass")
else
  log "[T2] FAIL: gate_web did not restart within 2m"
  RESULTS+=("T2=FAIL")
fi

log "[T3] Disabling auto_heal_enabled..."
set_auto_heal FALSE
docker stop gate_worker >/dev/null 2>&1 || true
sleep 30
ST=$(docker inspect --format '{{.State.Status}}' gate_worker 2>/dev/null || echo "missing")
if [ "$ST" != "running" ]; then
  log "[T3] PASS: kill switch held - gate_worker stayed stopped"
  RESULTS+=("T3=pass")
else
  log "[T3] FAIL: gate_worker restarted despite kill switch"
  RESULTS+=("T3=FAIL")
fi

log "[T4] Re-enabling auto_heal_enabled..."
set_auto_heal TRUE
if wait_for_status gate_worker "running" 300; then
  log "[T4] PASS: auto-heal resumed after re-enable"
  RESULTS+=("T4=pass")
else
  log "[T4] FAIL: auto-heal did not resume"
  RESULTS+=("T4=FAIL")
fi

log "=== MONTHLY CHAOS TEST DONE: ${RESULTS[*]} ==="
FAILED=0
for r in "${RESULTS[@]}"; do [ "${r#*=}" = "FAIL" ] && FAILED=1; done

SEV="SEV-3"; [ $FAILED -eq 1 ] && SEV="SEV-2"
TITLE="Monthly chaos test: ${RESULTS[*]}"
docker exec "$PG_CONTAINER" psql -U postgres -d "$DB" -q -c \
  "INSERT INTO public.status_updates (severity, title, detail)
   VALUES ('$SEV', '$TITLE', 'Chaos log: $CHAOS_LOG');" 2>/dev/null || true

notify "chaos test: $TITLE"
exit $FAILED
