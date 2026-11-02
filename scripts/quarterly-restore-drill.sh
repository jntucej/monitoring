#!/usr/bin/env bash
# Quarterly DR restore drill (DR §6).
#
# Proves the 4-hour RTO by actually restoring the latest backup into a
# scratch database and confirming a user row exists for 4 representative
# roles. Run on the first Tuesday of every quarter at 3am (cron). If it
# takes longer than 2 hours, that is the incident — fix the runbook, not
# the drill.
#
# Output: a timestamped drill result in the drill log + a status_updates row
# (SEV-3 on success, SEV-2 on failure).

set -uo pipefail
BASE="${BASE_DIR:-/opt/monitoring/compose}"
DB="${DB:-gate_monitor}"
PG_CONTAINER="${PG_CONTAINER:-gate_postgres}"
START_TS=$(date +%s)
DRILL_LOG="${BASE}/backups/drill-$(date +%Y%m%d_%H%M%S).log"

log() { echo "[$(date '+%F %T')] $*" | tee -a "$DRILL_LOG"; }

# Kill switch: drill_enabled=FALSE skips the whole drill.
DRILL_ENABLED=$(docker exec "$PG_CONTAINER" psql -U postgres -d "$DB" -tAc \
  "SELECT enabled FROM automation_controls WHERE name='drill_enabled'" 2>/dev/null || echo "t")
if [ "$DRILL_ENABLED" != "t" ]; then
  log "DRILL SKIPPED: drill_enabled=FALSE (kill switch active)"
  exit 0
fi

log "=== DRILL START: quarterly restore drill ==="

# 1. Identify the newest backup.
LATEST=$(find "${BASE}/backups" -name "gate-db-*.sql.gz" -printf "%T@ %p\n" 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)
if [ -z "$LATEST" ]; then
  log "FAIL: no backup file found in ${BASE}/backups"
  exit 1
fi
log "Newest backup: $LATEST ($(stat -c %s "$LATEST") bytes)"

# 2. SHA-256 verify before restoring.
if [ -f "${LATEST}.sha256" ]; then
  if ! (cd "$(dirname "$LATEST")" && sha256sum -c "$(basename "$LATEST").sha256" >/dev/null 2>&1); then
    log "FAIL: SHA-256 mismatch on $LATEST — backup is corrupt"
    exit 1
  fi
  log "SHA-256 verified"
else
  log "WARN: no .sha256 sidecar for $LATEST — skipping integrity check"
fi

# 3. Restore into a scratch DB.
SCRATCH="drill_restore_$(date +%Y%m%d_%H%M%S)"
log "Creating scratch DB: $SCRATCH"
docker exec "$PG_CONTAINER" psql -U postgres -c "CREATE DATABASE $SCRATCH TEMPLATE template1;" 2>&1 | tee -a "$DRILL_LOG"

cleanup() {
  docker exec "$PG_CONTAINER" psql -U postgres -c "DROP DATABASE IF EXISTS $SCRATCH;" 2>/dev/null || true
  log "Cleaned up scratch DB $SCRATCH"
}
trap cleanup EXIT

if ! gunzip -c "$LATEST" | docker exec -i "$PG_CONTAINER" psql -U postgres -d "$SCRATCH" -v ON_ERROR_STOP=1 \
     2>"${DRILL_LOG}.restore_err"; then
  log "FAIL: psql restore returned non-zero"
  tail -10 "${DRILL_LOG}.restore_err" | tee -a "$DRILL_LOG"
  exit 1
fi
log "Restore complete"

# 4. Confirm table count + a user row for each of 4 representative roles.
TABLES=$(docker exec "$PG_CONTAINER" psql -U postgres -d "$SCRATCH" -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
log "Scratch DB table count: $TABLES"

ROLES_OK=true
for ROLE in student operator hod sysadmin; do
  FOUND=$(docker exec "$PG_CONTAINER" psql -U postgres -d "$SCRATCH" -tAc \
    "SELECT count(*) FROM public.users u JOIN public.user_roles ur ON ur.user_id=u.id
     WHERE u.status='active' AND ur.role='$ROLE' LIMIT 1;" 2>/dev/null || echo 0)
  if [ "${FOUND:-0}" -ge 1 ]; then
    log "role $ROLE: active user present in restored DB"
  else
    log "role $ROLE: no active user found"
    ROLES_OK=false
  fi
done

# 5. Time it.
END_TS=$(date +%s)
ELAPSED=$(( END_TS - START_TS ))
ELAPSED_MIN=$(( ELAPSED / 60 ))
log "Drill took ${ELAPSED}s (${ELAPSED_MIN} min) — RTO target 240 min"

# 6. Write the result to the drill log + a status_updates row.
STATUS="success"
SEV="SEV-3"
if [ "$ELAPSED_MIN" -gt 240 ] || [ "$ROLES_OK" != "true" ]; then
  STATUS="slow/incomplete"
  SEV="SEV-2"
fi

{
  echo ""
  echo "## DR Drill Log"
  echo ""
  echo "| Date | Elapsed | Status |"
  echo "|---|---|---|"
  echo "| $(date -I) | ${ELAPSED_MIN}m | ${STATUS} |"
} >> "${BASE}/backups/drill.log" 2>/dev/null || true

docker exec "$PG_CONTAINER" psql -U postgres -d "$DB" -q -c \
  "INSERT INTO public.status_updates (severity, title, detail)
   VALUES ('$SEV', 'Quarterly DR drill: $STATUS',
     'Elapsed ${ELAPSED_MIN}m. Scratch DB table count: $TABLES. Log: $DRILL_LOG');" 2>/dev/null || true

log "=== DRILL ${STATUS^^} (${ELAPSED_MIN}m) ==="
[ "$ELAPSED_MIN" -le 240 ] && [ "$ROLES_OK" = "true" ]
