#!/usr/bin/env bash
# Robust backup verification script incorporating structural gzip check,
# un-swallowed psql errors (-v ON_ERROR_STOP=1), and table sanity floors.
set -uo pipefail

BACKUP_DIR="/opt/monitoring/backups"
if [ -L "$BACKUP_DIR" ] && [ ! -e "$BACKUP_DIR" ]; then
    BACKUP_DIR="/opt/monitoring/backups-local"
fi
DAILY_DIR="$BACKUP_DIR/daily"

echo "================================================================="
echo "GATE MONITOR — ROBUST BACKUP RESTORE VERIFICATION"
echo "================================================================="

PG_CONTAINER="gate_postgres"
DB="${DB:-gate_monitor}"

LATEST_BACKUP=$(ls -t "$DAILY_DIR"/gate-*.sql.gz 2>/dev/null | head -n 1)
if [ -z "$LATEST_BACKUP" ]; then
    echo "ERROR: No backup files found in $DAILY_DIR."
    exit 1
fi

echo "Verifying backup: $LATEST_BACKUP"

# 1. Integrity check (gzip -t)
gzip -t "$LATEST_BACKUP" || { echo "FAIL: gzip integrity check failed"; exit 1; }

# 2b. SHA-256 checksum check against the .sha256 sidecar written by
# master-backup.sh. Older backups (before the sidecar existed) have no
# .sha256 file — warn, do not fail (backups are restorable by content).
LATEST_SHA="${LATEST_BACKUP}.sha256"
if [ -f "$LATEST_SHA" ]; then
    if ! cd "$(dirname "$LATEST_BACKUP")" && sha256sum -c "$(basename "$LATEST_SHA")" >/dev/null 2>&1; then
        echo "FAIL: SHA-256 checksum mismatch for $(basename "$LATEST_BACKUP")"
        exit 1
    fi
    echo "SHA-256 checksum verified: $(basename "$LATEST_BACKUP")"
else
    echo "WARN: no .sha256 sidecar for $(basename "$LATEST_BACKUP") — trusting gzip integrity only (pre-checksum backup)"
fi

# 2. Header check (PostgreSQL database dump)
HEADER=$(gunzip -c "$LATEST_BACKUP" | head -5)
if [[ "$HEADER" != *"PostgreSQL database dump"* ]]; then
    echo "FAIL: Backup file header does not match PostgreSQL database dump format"
    exit 1
fi

# 2c. Schema-staleness check (DR §3): compare the table count in the backup
# against the live schema. If the backup was taken BEFORE a migration ran,
# restoring it loses that migration. This is a warning, not a hard fail —
# the backup is still valid for its point-in-time — but the operator must
# know.
BACKUP_TABLES=$(gunzip -c "$LATEST_BACKUP" 2>/dev/null | grep -c "CREATE TABLE" || echo 0)
LIVE_TABLES=$(docker exec "$PG_CONTAINER" psql -U postgres -d "$DB" -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null || echo 0)
LATEST_MIGRATION=$(docker exec "$PG_CONTAINER" psql -U postgres -d "$DB" -tAc \
  "SELECT filename FROM public.schema_migrations ORDER BY version DESC LIMIT 1;" 2>/dev/null || echo "unknown")
echo "Backup contains ${BACKUP_TABLES} CREATE TABLE statements; live DB has ${LIVE_TABLES} public tables."
echo "Latest applied migration: ${LATEST_MIGRATION}"
if [ "$BACKUP_TABLES" -lt "$LIVE_TABLES" ]; then
    echo "⚠️  Backup has ${BACKUP_TABLES} tables, live has ${LIVE_TABLES} — backup may be stale."
    echo "   This backup cannot restore a deploy that added tables since it was taken."
    echo "   The restore below still validates the dump's integrity, but a live deploy"
    echo "   will require a backup taken AFTER migration ${LATEST_MIGRATION}."
fi
echo ""

# 3. Create scratch DB with template = template1 (which has extensions allowed)
SCRATCH_DB="restore_test_$(date +%Y%m%d_%H%M%S)"
echo "Creating scratch database: $SCRATCH_DB..."
docker exec "$PG_CONTAINER" psql -U postgres -c "CREATE DATABASE $SCRATCH_DB TEMPLATE template1;"

cleanup() {
    echo "Cleaning up scratch database: $SCRATCH_DB..."
    docker exec "$PG_CONTAINER" psql -U postgres -c "DROP DATABASE IF EXISTS $SCRATCH_DB;" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# 4. Restore backup into scratch DB with strict error stopping and error
# capture. Strip the --create/--clean database statements and re-point
# \connect at the scratch DB (sed surgery is single-line — multi-line
# statements would choke a naive sed).
echo "Restore backup into $SCRATCH_DB..."
TMP_ERR="/tmp/restore_err_$$.txt"
if ! gunzip -c "$LATEST_BACKUP" \
     | grep -v -E '^CREATE DATABASE|^DROP DATABASE|^\\connect' \
     | docker exec -i "$PG_CONTAINER" psql -U postgres -d "$SCRATCH_DB" -v ON_ERROR_STOP=1 >/dev/null 2> "$TMP_ERR"; then
    echo "❌ FAIL: psql restore encountered errors:"
    cat "$TMP_ERR"
    rm -f "$TMP_ERR"
    exit 1
fi
rm -f "$TMP_ERR"

# 5. Assert table count floor
TABLE_COUNT=$(docker exec "$PG_CONTAINER" psql -U postgres -d "$SCRATCH_DB" -t -A -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo "Scratch database public table count: $TABLE_COUNT"
if [ "$TABLE_COUNT" -lt 50 ]; then
    echo "❌ FAIL: Table count $TABLE_COUNT is below expected sanity floor (50 tables)"
    exit 1
fi

# 6. Verify Uploads / Attachments backup archive if present
LATEST_UPLOADS=$(ls -t "$DAILY_DIR"/uploads-*.tar.gz 2>/dev/null | head -n 1 || true)
if [ -n "$LATEST_UPLOADS" ]; then
    echo "Verifying uploads backup: $LATEST_UPLOADS"
    tar -tzf "$LATEST_UPLOADS" >/dev/null || { echo "FAIL: uploads backup archive is corrupt"; exit 1; }
    echo "✓ Uploads archive is valid and readable."
fi

# 7. I6: cold-backup freshness — the off-host copy (.enc) must exist and
# be within 26 hours. master-backup.sh writes the local .sql.gz;
# sync-cold-backup.sh encrypts and ships it; a stale .enc means the
# off-host copy has not been updated since the last daily cycle.
echo "── I6: cold-backup freshness check ──"
COLD_DIR="${COLD_BACKUP_DIR:-$DAILY_DIR}"
LATEST_ENC=$(find "$COLD_DIR" -name 'gate-*.sql.gz.enc' -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -1 | cut -d' ' -f2-)
if [ -z "$LATEST_ENC" ]; then
    echo "❌ FAIL: no .enc cold backup found in $COLD_DIR — off-host copy missing." >&2
    exit 1
fi
AGE_H=$(( ( $(date +%s) - $(stat -c %Y "$LATEST_ENC") ) / 3600 ))
if [ "$AGE_H" -gt 26 ]; then
    echo "❌ FAIL: cold backup is ${AGE_H}h old (limit 26h): $LATEST_ENC" >&2
    exit 1
fi
echo "✓ cold backup is fresh (${AGE_H}h old): $LATEST_ENC"

echo "================================================================="
echo "✅ RESTORE VERIFICATION PASSED SUCCESSFULLY."
echo "================================================================="
exit 0
