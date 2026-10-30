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

LATEST_BACKUP=$(ls -t "$DAILY_DIR"/gate-*.sql.gz 2>/dev/null | head -n 1)
if [ -z "$LATEST_BACKUP" ]; then
    echo "ERROR: No backup files found in $DAILY_DIR."
    exit 1
fi

echo "Verifying backup: $LATEST_BACKUP"

# 1. Integrity check (gzip -t)
gzip -t "$LATEST_BACKUP" || { echo "FAIL: gzip integrity check failed"; exit 1; }

# 2. Header check (PostgreSQL database dump)
HEADER=$(gunzip -c "$LATEST_BACKUP" | head -5)
if [[ "$HEADER" != *"PostgreSQL database dump"* ]]; then
    echo "FAIL: Backup file header does not match PostgreSQL database dump format"
    exit 1
fi

# 3. Create scratch DB with template = template1 (which has extensions allowed)
SCRATCH_DB="restore_test_$(date +%Y%m%d_%H%M%S)"
echo "Creating scratch database: $SCRATCH_DB..."
docker exec "$PG_CONTAINER" psql -U postgres -c "CREATE DATABASE $SCRATCH_DB TEMPLATE template1;"

cleanup() {
    echo "Cleaning up scratch database: $SCRATCH_DB..."
    docker exec "$PG_CONTAINER" psql -U postgres -c "DROP DATABASE IF EXISTS $SCRATCH_DB;" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# 4. Restore backup into scratch DB with strict error stopping and error capture
echo "Restore backup into $SCRATCH_DB..."
TMP_ERR="/tmp/restore_err_$$.txt"
if ! gunzip -c "$LATEST_BACKUP" \
     | sed -e '/DROP DATABASE IF EXISTS gate_monitor;/d' \
           -e '/CREATE DATABASE gate_monitor/,/;/d' \
           -e 's/\\connect gate_monitor/\\connect '"$SCRATCH_DB"'/g' \
           -e '/CREATE EXTENSION IF NOT EXISTS pg_trgm;/d' \
           -e '/extension-custom-scripts/d' \
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

echo "================================================================="
echo "✅ RESTORE VERIFICATION PASSED SUCCESSFULLY."
echo "================================================================="
exit 0
