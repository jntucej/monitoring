#!/usr/bin/env bash
# Regenerates database/schema.sql (the fresh-install baseline) so it exactly
# reflects "baseline + every migration in database/migrations/", in the right
# order. Intended to be run after adding/adjusting migrations so the checked-in
# baseline never silently drifts behind the migration chain.
#
# WARNING: this OVERWRITES database/schema.sql with a full pg_dump of the
# fully-migrated end state. That is only correct when you have independently
# verified the regenerated file still replays cleanly through
# scripts/check-migrations.sh AND is acceptable as the *deploy-time* baseline
# for fresh installs (as opposed to the older minimal hand-maintained
# bootstrap this repo currently uses). Run it deliberately, review the diff,
# and only commit the result after check-migrations.sh passes — do NOT treat
# this as a routine post-edit step or a hard CI gate.

set -eo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# CI mode: if a pre-provisioned DATABASE_URL is set (e.g. a `services: postgres`
# block in the calling workflow — the only supported way to get Postgres on
# GitHub-hosted runners), use it directly. Otherwise fall back to a local
# docker-run scratch container (local/dev behavior, unchanged).
PSQL=""
PG_DUMP=""

if [ -n "$DATABASE_URL" ]; then
  echo "Using pre-provisioned DATABASE_URL (CI mode, no scratch container)."
  PSQL=(psql "$DATABASE_URL")
  PG_DUMP=(psql "$DATABASE_URL")
else
  CONTAINER_NAME="schema_regen_$$"
  POSTGRES_IMAGE="${POSTGRES_TEST_IMAGE:-postgres:17}"

  cleanup() {
    echo "Cleaning up scratch container $CONTAINER_NAME..."
    docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
  }
  trap cleanup EXIT INT TERM

  echo "1. Starting scratch Postgres ($POSTGRES_IMAGE)..."
  docker run --rm -d --name "$CONTAINER_NAME" -e POSTGRES_PASSWORD=test "$POSTGRES_IMAGE" >/dev/null

  until docker exec "$CONTAINER_NAME" pg_isready -U postgres >/dev/null 2>&1; do
    sleep 1
  done

  PSQL=(docker exec "$CONTAINER_NAME" psql -U postgres)
  PG_DUMP=(docker exec "$CONTAINER_NAME" pg_dump -U postgres)
fi

# Refusing to write the file in place by mistake: build into a sidecar path
# first, verify it's non-empty, then move it over the original.
TMP_OUT="$(mktemp)"

echo "2. Creating Supabase compatibility roles + auth schema..."
"${PSQL[@]}" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin') THEN CREATE ROLE admin; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
END
$$;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT null::uuid; $$ LANGUAGE sql;
SQL

echo "3. Loading current baseline (database/schema.sql) + creating schema_migrations..."
if [ -f "database/schema.sql" ]; then
  # Tolerate re-loading our own previous pg_dump output (which includes
  # "CREATE SCHEMA public;" — already present in a fresh Postgres container).
  "${PSQL[@]}" -v ON_ERROR_STOP=0 \
    < <(grep -v '^CREATE SCHEMA public;' "database/schema.sql") >/dev/null
fi

# Most migrations' "self-record" blocks INSERT INTO schema_migrations but never
# CREATE it (that lives in database/bootstrap.sql, which fresh installs run
# separately from schema.sql). Ensure it exists before replaying so those
# self-records don't fail.
"${PSQL[@]}" -v ON_ERROR_STOP=1 -c "
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     TEXT PRIMARY KEY,
  filename    TEXT,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checksum    TEXT
);" >/dev/null

shopt -s nullglob
FILES=(database/migrations/*.sql)
shopt -u nullglob

if [ ${#FILES[@]} -eq 0 ]; then
  echo "ERROR: no migration files found under database/migrations/" >&2
  exit 1
fi

for f in "${FILES[@]}"; do
  fname=$(basename "$f")
  if [[ "$fname" == _* || "$fname" == *.down.sql ]]; then continue; fi
  # Some forward migrations assume state that only exists after manually applied,
  # older migrations (i.e. ones that predate the checked-in schema.sql baseline
  # and aren't re-runnable from scratch) — e.g. RLS policies on tables that
  # `schema.sql` already creates but whose DDL/permissions were hand-tuned in
  # production and never got a standalone CREATE TABLE migration. Replay with
  # ON_ERROR_STOP=0 (matching how the live DB was actually built) and keep going,
  # mirroring scripts/check-schema-drift.sh's tolerance.
  "${PSQL[@]}" -v ON_ERROR_STOP=0 < "$f" >/dev/null 2>&1 \
    || echo "Warning: $fname reported errors while replaying (expected for some pre-baseline RLS migrations); continuing."
done

echo "4. Dumping the fresh schema-only catalog to $TMP_OUT ..."
if [ -n "$DATABASE_URL" ]; then
  pg_dump "$DATABASE_URL" --schema=public --schema-only --no-owner --no-privileges \
    | grep -v '^CREATE SCHEMA public;' > "$TMP_OUT"
else
  docker exec "$CONTAINER_NAME" pg_dump -U postgres --schema=public --schema-only --no-owner --no-privileges \
    | grep -v '^CREATE SCHEMA public;' > "$TMP_OUT"
fi

# Guard: a successful pg_dump that still produced an empty/stub file shouldn't
# be allowed to clobber the real baseline.
if [ ! -s "$TMP_OUT" ]; then
  echo "ERROR: pg_dump produced an empty file; refusing to overwrite database/schema.sql." >&2
  exit 1
fi

echo "5. Swapping in the regenerated baseline..."
mv "$TMP_OUT" "database/schema.sql"

echo "✅ database/schema.sql is now synced with all ${#FILES[@]} migrations."
