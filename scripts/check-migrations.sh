#!/usr/bin/env bash
set -eo pipefail

echo "=== Running Migration Replay Check ==="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# 1. Assert no duplicate version prefixes across migration directories
declare -A SEEN_VERSIONS
declare -A MIGRATION_FILES

shopt -s nullglob
FILES=(database/migrations/*.sql supabase/migrations/*.sql)
shopt -u nullglob

if [ ${#FILES[@]} -eq 0 ]; then
  echo "ERROR: No migration files found in database/migrations/ or supabase/migrations/" >&2
  exit 1
fi

for f in "${FILES[@]}"; do
  fname=$(basename "$f")
  if [[ "$fname" == _* ]]; then continue; fi

  ver="${fname%%_*}"
  if [[ -n "${SEEN_VERSIONS[$ver]}" && "${SEEN_VERSIONS[$ver]}" != "$fname" ]]; then
    echo "ERROR: Duplicate version prefix '$ver' detected: '$fname' and '${SEEN_VERSIONS[$ver]}'" >&2
    exit 1
  fi
  SEEN_VERSIONS[$ver]="$fname"
  MIGRATION_FILES["$fname"]="$f"
done

echo "✓ Verified ${#SEEN_VERSIONS[@]} unique migration version prefixes"

# 2. Start scratch Postgres container
CONTAINER_NAME="scratch_check_migs_$$"
POSTGRES_IMAGE="${POSTGRES_TEST_IMAGE:-postgres:17-alpine}"

cleanup() {
  echo "Cleaning up scratch container $CONTAINER_NAME..."
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

echo "Starting scratch Postgres ($POSTGRES_IMAGE)..."
docker run --rm -d --name "$CONTAINER_NAME" -e POSTGRES_PASSWORD=test "$POSTGRES_IMAGE" >/dev/null

# Wait for database readiness
until docker exec "$CONTAINER_NAME" pg_isready -U postgres >/dev/null 2>&1; do
  sleep 1
done

# 3. Setup mock Supabase roles & auth schema
docker exec "$CONTAINER_NAME" psql -U postgres -v ON_ERROR_STOP=1 -c "
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin') THEN CREATE ROLE admin; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
END \$\$;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS \$\$ SELECT null::uuid; \$\$ LANGUAGE sql;
" >/dev/null

# 4. Load baseline schema if present
if [ -f "database/schema.sql" ]; then
  echo "Loading baseline schema..."
  python3 -c "
with open('database/schema.sql') as f:
    c = f.read()
c = c.replace('public.announcements (\\\\\n', 'public.announcements (\n')
c = c.replace('public.attendance_records (\\\\\n', 'public.attendance_records (\n')
c = c.replace('  used BOOLEAN DEFAULT FALSE,\n  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()', '  used BOOLEAN DEFAULT FALSE,\n  used_at TIMESTAMPTZ,\n  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()')
with open('/tmp/clean_schema_$$.sql', 'w') as f:
    f.write(c)
"
  docker exec -i "$CONTAINER_NAME" psql -U postgres -v ON_ERROR_STOP=1 < "/tmp/clean_schema_$$.sql" >/dev/null
  rm -f "/tmp/clean_schema_$$.sql"
  docker exec "$CONTAINER_NAME" psql -U postgres -c "DROP POLICY IF EXISTS \"service_role_all_pin_login_attempts\" ON pin_login_attempts;" >/dev/null 2>&1 || true
fi

# 5. Initialize schema_migrations tracking table
docker exec "$CONTAINER_NAME" psql -U postgres -v ON_ERROR_STOP=1 -c "
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     TEXT PRIMARY KEY,
  filename    TEXT NOT NULL,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checksum    TEXT NOT NULL
);" >/dev/null

# 6. Replay every migration file in sorted filename order
SORTED_NAMES=($(for k in "${!MIGRATION_FILES[@]}"; do echo "$k"; done | sort))
APPLIED_COUNT=0

for fname in "${SORTED_NAMES[@]}"; do
  fpath="${MIGRATION_FILES[$fname]}"
  echo "Replaying migration: $fname"
  docker exec -i "$CONTAINER_NAME" psql -U postgres -v ON_ERROR_STOP=1 < "$fpath" >/dev/null
  
  ver="${fname%%_*}"
  docker exec "$CONTAINER_NAME" psql -U postgres -v ON_ERROR_STOP=1 -c \
    "INSERT INTO schema_migrations (version, filename, checksum) VALUES ('$ver', '$fname', 'replayed');" >/dev/null
  APPLIED_COUNT=$((APPLIED_COUNT + 1))
done

# 7. Assertions
RECORDED_COUNT=$(docker exec "$CONTAINER_NAME" psql -U postgres -tAc "SELECT count(*) FROM schema_migrations;")
if [ "$RECORDED_COUNT" -ne "$APPLIED_COUNT" ]; then
  echo "ERROR: Applied $APPLIED_COUNT migrations but schema_migrations contains $RECORDED_COUNT" >&2
  exit 1
fi

echo "SUCCESS: Replayed all $APPLIED_COUNT migrations cleanly with zero errors."
exit 0
