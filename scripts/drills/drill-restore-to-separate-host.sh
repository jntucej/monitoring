#!/usr/bin/env bash
# ============================================================================
# J3 — restore-to-separate-host
#
# The quarterly-restore-drill.sh restores into a scratch DB on the SAME
# Postgres — it proves the dump is valid, not that you can recover from
# host loss. This drill does the real thing: decrypt the latest signed
# cold backup (.enc from the I6 sync job) into a DISPOSABLE postgres:17
# container, validate the data, and record RTO.
#
# Skip conditions: no .enc cold backup exists yet (sync-cold-backup.sh
# has never run / never pushed), or the encryption key env var is unset.
# ============================================================================
DRILL_ID="restore-separate-host"
source "$(cd "$(dirname "$0")" && pwd)/_lib.sh"

command -v docker >/dev/null 2>&1 || fail "docker not available"

COLD_DIR="${COLD_BACKUP_DIR:-/opt/monitoring/backups/daily}"
LATEST_ENC="$(find "$COLD_DIR" -name '*.sql.gz.enc' -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -1 | cut -d' ' -f2-)"
if [ -z "$LATEST_ENC" ]; then
  log "SKIP: no cold backup .enc found in $COLD_DIR (has sync-cold-backup.sh run yet?)"
  write_evidence "pass" "{\"skipped\":true,\"reason\":\"no .enc cold backup\"}"
  exit 0
fi
[ -n "${COLD_BACKUP_ENCRYPTION_KEY:-}" ] \
  || fail "COLD_BACKUP_ENCRYPTION_KEY not set — cannot decrypt $LATEST_ENC"

log "Restoring $(basename "$LATEST_ENC") into a disposable postgres:17"

SCRATCH="restore-drill-${STAMP//[^a-z0-9]/}"
PG_VER="${DRILL_PG_VERSION:-17}"
START_TS="$(date +%s)"

cleanup() {
  log "cleanup: removing scratch container"
  docker rm -f "$SCRATCH" >/dev/null 2>&1 || true
}

docker run -d --rm --name "$SCRATCH" \
  -e POSTGRES_PASSWORD=drill \
  -e POSTGRES_DB=gate_monitor_restored \
  -e POSTGRES_USER=postgres \
  "postgres:${PG_VER}" >/dev/null
# Wait for readiness (max 60s).
READY=0
for _ in $(seq 1 60); do
  if docker exec "$SCRATCH" pg_isready -U postgres >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 1
done
[ "$READY" = "1" ] || fail "scratch postgres never became ready"

# ---- decrypt + restore -------------------------------------------------------
if ! openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
    -in "$LATEST_ENC" -pass pass:"${COLD_BACKUP_ENCRYPTION_KEY}" \
    | gunzip \
    | docker exec -i "$SCRATCH" psql -U postgres -d gate_monitor_restored -v ON_ERROR_STOP=1 >/dev/null; then
  fail "restore into scratch container failed (decryption or psql error)"
fi

# ---- validate: table count + one active row per representative role ----------
TABLES="$(docker exec "$SCRATCH" psql -U postgres -d gate_monitor_restored -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")"
[ -n "$TABLES" ] && [ "$TABLES" -ge 50 ] 2>/dev/null \
  || fail "restored only ${TABLES:-0} public tables — dump is stale or truncated"

ROLE_FAILS=0
ROLE_EVIDENCE=""
for role in student operator hod sysadmin; do
  N="$(docker exec "$SCRATCH" psql -U postgres -d gate_monitor_restored -tAc \
    "SELECT count(*) FROM users u JOIN user_roles ur ON ur.user_id = u.id WHERE ur.role = '$role' AND u.status = 'ACTIVE'")"
  if [ "${N:-0}" -ge 1 ] 2>/dev/null; then
    ROLE_EVIDENCE="$ROLE_EVIDENCE $role=$N"
  else
    log "  ❌ no active $role user in restored DB"
    ROLE_FAILS=$((ROLE_FAILS+1))
  fi
done
if [ "$ROLE_FAILS" -gt 0 ]; then
  fail "restored DB missing active users for $ROLE_FAILS role(s) — RTO restore incomplete"
fi

RTO=$(( $(date +%s) - START_TS ))
pass "restore verified: $TABLES public tables, active users in all 4 probed roles, RTO ${RTO}s"
write_evidence "pass" "{\"tables\":$TABLES,\"rto_seconds\":$RTO,\"backup\":\"$(basename "$LATEST_ENC")\",\"roles\":\"$(echo $ROLE_EVIDENCE | xargs)\"}"
