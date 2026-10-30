#!/usr/bin/env bash
set -euo pipefail
# regenerate-schema.sh - Replays all migrations in order and generates database/schema.sql
# R3-15 fix: Uses ON_ERROR_STOP=1 and fails fast on any migration error.

DB_NAME="${DB_NAME:-gate_monitor_dev}"
PSQL=(psql -d "$DB_NAME")

echo "[regenerate-schema] Replaying migrations with ON_ERROR_STOP=1..."

# Reset test db or create temp schema if needed
"${PSQL[@]}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" >/dev/null

MIGRATIONS_DIR="database/migrations"
FILES=( "$MIGRATIONS_DIR"/*.sql )

for f in "${FILES[@]}"; do
  fname=$(basename "$f")
  echo "  -> Replaying $fname..."
  if ! "${PSQL[@]}" -v ON_ERROR_STOP=1 < "$f" >/tmp/mig.err 2>&1; then
    echo "ERROR: $fname failed during regeneration. Baseline unchanged." >&2
    cat /tmp/mig.err >&2
    exit 1
  fi
done

echo "[regenerate-schema] Dumping schema to database/schema.sql..."
pg_dump --schema-only --no-owner --no-acl "$DB_NAME" > database/schema.sql
echo "[regenerate-schema] Success! Schema regenerated and validated."
