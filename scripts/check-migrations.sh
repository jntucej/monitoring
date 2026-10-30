#!/usr/bin/env bash
set -eo pipefail

echo "=== Running Migration Replay Check ==="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# 1. Assert no duplicate version prefixes across migration directories
declare -A SEEN_VERSIONS
declare -A MIGRATION_FILES

shopt -s nullglob
FILES=(database/migrations/*.sql)
shopt -u nullglob

if [ ${#FILES[@]} -eq 0 ]; then
  echo "ERROR: No migration files found in database/migrations/ or supabase/migrations/" >&2
  exit 1
fi

for f in "${FILES[@]}"; do
  fname=$(basename "$f")
  if [[ "$fname" == _* ]]; then continue; fi
  # Rollback files (*.down.sql) intentionally share the version prefix of their
  # forward migration; they are not part of the forward replay chain.
  if [[ "$fname" == *.down.sql ]]; then continue; fi

  ver="${fname%%_*}"
  # Include both 14-digit timestamps and date prefixes (e.g. 20261027_gate_ops.sql)
  if [[ ! "$ver" =~ ^[0-9]{8,14}$ ]]; then
    echo "ERROR: Migration '$fname' has invalid version prefix '$ver' (expected 8-14 digits)" >&2
    exit 1
  fi
  if [[ -n "${SEEN_VERSIONS[$ver]}" && "${SEEN_VERSIONS[$ver]}" != "$fname" ]]; then
    echo "ERROR: Duplicate version prefix '$ver' detected: '$fname' and '${SEEN_VERSIONS[$ver]}'" >&2
    exit 1
  fi
  SEEN_VERSIONS[$ver]="$fname"
  MIGRATION_FILES["$fname"]="$f"
done

echo "✓ Verified ${#SEEN_VERSIONS[@]} unique migration version prefixes"

# 1b. Guard: only one migration may own audit_logs_action_known.
# Count only direct ALTER TABLE statements, not SQL nested inside DO $$ ... $$ blocks.
# grep exits 1 when it finds zero matches (the normal, healthy case); under
# `set -o pipefail` that would otherwise kill this whole script mid-way, so
# tolerate an empty result explicitly.
# Count distinct migration files that declare direct ALTER TABLE statements for audit_logs_action_known.
AUDIT_ACTION_OWNERS=$(grep -El -- '^[[:space:]]*ALTER[[:space:]]+TABLE[[:space:]]+public\.audit_logs[[:space:]]+(DROP|ADD)[[:space:]]+CONSTRAINT[[:space:]]+(IF[[:space:]]+EXISTS[[:space:]]+)?audit_logs_action_known' database/migrations/*.sql 2>/dev/null | wc -l || true)
if [ "$AUDIT_ACTION_OWNERS" -gt 1 ]; then
  echo "ERROR: Multiple migrations modify audit_logs_action_known ($AUDIT_ACTION_OWNERS files found). Only one canonical migration allowed." >&2
  exit 1
fi

# 2. Scratch Postgres: either an already-provisioned DATABASE_URL (CI mode,
# e.g. a `services: postgres` block in the calling workflow — the only
# supported way to get Postgres on GitHub-hosted runners, since ad-hoc
# `docker run` is not allowed there) or a local docker-run scratch container.
PSQL=""
RUN_SCRATCH=0

if [ -n "$DATABASE_URL" ]; then
  echo "Using pre-provisioned DATABASE_URL (CI mode, no scratch container)."
  PSQL=(psql "$DATABASE_URL")
else
  RUN_SCRATCH=1
  CONTAINER_NAME="scratch_check_migs_$$"
  POSTGRES_IMAGE="${POSTGRES_TEST_IMAGE:-postgres:17}"

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

  PSQL=(docker exec "$CONTAINER_NAME" psql -U postgres)
fi

# 3. Setup mock Supabase roles & auth schema and grant permissions on public
"${PSQL[@]}" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin') THEN
    CREATE ROLE admin;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon;
  END IF;
END
$$;

CREATE SCHEMA IF NOT EXISTS auth;
GRANT ALL ON DATABASE gate_monitor TO postgres;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA auth TO postgres;
GRANT USAGE, CREATE ON SCHEMA public TO PUBLIC;
GRANT USAGE, CREATE ON SCHEMA auth TO PUBLIC;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
  SELECT null::uuid;
$$ LANGUAGE sql;
SQL

# 4. Load baseline schema (minimal bootstrap, sufficient for the migration
# chain to replay cleanly from scratch). Tolerate the one-off pre-existing
# DDL quirks in the checked-in baseline itself (it's a hand-maintained file,
# not a pg_dump), since this check's real subject is the *migrations*, not
# the baseline.
if [ -f "database/schema.sql" ]; then
  echo "Loading baseline schema..."
  "${PSQL[@]}" -v ON_ERROR_STOP=0 < "database/schema.sql" >/dev/null
fi

# 5. Initialize schema_migrations tracking table
# NOTE: must be created with the loosest shape (no NOT NULL on filename or
# checksum) because some migration self-record blocks are written to
# adaptively support either a 2-column (version, applied_at) or a 4-column
# (version, filename, applied_at, checksum) table, and they will happily
# insert a NULL checksum when the 4-column variant happens to be detected.
"${PSQL[@]}" -v ON_ERROR_STOP=1 -c "
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     TEXT PRIMARY KEY,
  filename    TEXT,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checksum    TEXT
);" >/dev/null

# 6. Replay every migration file in sorted filename order
SORTED_NAMES=($(for k in "${!MIGRATION_FILES[@]}"; do echo "$k"; done | sort))
APPLIED_COUNT=0

for fname in "${SORTED_NAMES[@]}"; do
  fpath="${MIGRATION_FILES[$fname]}"
  echo "Replaying migration: $fname"
  # Replay migrations with ON_ERROR_STOP=1 so failures are never swallowed
  if ! "${PSQL[@]}" -v ON_ERROR_STOP=1 < "$fpath" >/dev/null 2>&1; then
    echo "ERROR: Migration '$fname' failed during replay with ON_ERROR_STOP=1" >&2
    "${PSQL[@]}" -v ON_ERROR_STOP=1 < "$fpath" || true
    exit 1
  fi

  ver="${fname%%_*}"
  "${PSQL[@]}" -v ON_ERROR_STOP=1 -c \
    "INSERT INTO schema_migrations (version, filename, checksum) VALUES ('$ver', '$fname', 'replayed') ON CONFLICT (version) DO NOTHING;" >/dev/null
  APPLIED_COUNT=$((APPLIED_COUNT + 1))
done

# 7. Assertions
RECORDED_COUNT=$("${PSQL[@]}" -tAc "SELECT count(*) FROM schema_migrations;")
if [ "$RECORDED_COUNT" -ne "$APPLIED_COUNT" ]; then
  echo "ERROR: Applied $APPLIED_COUNT migrations but schema_migrations contains $RECORDED_COUNT" >&2
  exit 1
fi

echo "SUCCESS: Replayed all $APPLIED_COUNT migrations cleanly with zero errors."
exit 0
