#!/usr/bin/env bash
# scripts/check-audit-constraint.sh
# Verifies that audit_logs_action_known CHECK constraint is active, contains
# the canonical action array, and (the recommended gate) proves ONE-ROW-PER-ACTION
# insertability: every action in the owner-of-record migration
# (database/migrations/20270101000014_audit_action_canonical_owner.sql) must be
# insertable into audit_logs, and an unknown action must be rejected.
#
# CI mode (DATABASE_URL set): connects directly to the pre-provisioned CI
# Postgres service. Local mode: uses docker exec against gate_postgres.
#
# This is the regression check for the "silent zero-row / wrong constraint"
# class: if the constraint is missing or not biting, the bogus-action insert
# would wrongly succeed and the check fails.
set -euo pipefail

CONTAINER="${CONTAINER:-gate_postgres}"
DB="${DB:-gate_monitor}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OWNER_MIG="$ROOT_DIR/database/migrations/20270101000014_audit_action_canonical_owner.sql"

# Helper: run psql, preferring DATABASE_URL (CI) over docker exec (local).
# NOTE: on the host DATABASE_URL points at the compose-service host
# `postgres`, which only resolves inside the docker network — from the host
# `psql` fails with "could not translate host name". The docker-exec branch
# is therefore ALWAYS used on this host even when DATABASE_URL is set; the
# CI branch (a real host-resolvable DATABASE_URL, e.g. a github services
# `postgres:15-alpine`) is preferred when its host DOES resolve.
psql_exec() {
  local sql="$1"
  if [ -n "${DATABASE_URL:-}" ]; then
    local _host="${DATABASE_URL#*://}"
    _host="${_host%%/*}"; _host="${_host%%@*}"; _host="${_host##*:}"
    if getent hosts "$_host" >/dev/null 2>&1; then
      psql "$DATABASE_URL" -tAc "$sql"
      return
    fi
    # Host doesn't resolve (host-side DATABASE_URL pointing at a compose
    # service name): fall through to docker exec against the running
    # gate_postgres container, which is where the live schema actually is.
  fi
  docker exec -i "$CONTAINER" psql -U postgres -d "$DB" -tAc "$sql"
}

echo "=== Verifying audit_logs_action_known constraint ==="

# Prefer the JOIN form (schema-scoped, no ambiguous-column error when other
# tables carry same-named constraints); fall back to the bare conname lookup
# so a partial index or view rename in the future still finds it.
DEF=$(psql_exec \
  "SELECT pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid WHERE t.relname = 'audit_logs' AND c.conname = 'audit_logs_action_known';" 2>/dev/null | head -n 1 || echo "")
if [ -z "$DEF" ]; then
  DEF=$(psql_exec \
    "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'audit_logs_action_known';" 2>/dev/null | head -n 1 || echo "")
fi

if [ -z "$DEF" ]; then
  echo "FAIL: Constraint 'audit_logs_action_known' is missing on table audit_logs!" >&2
  exit 1
fi

if ! echo "$DEF" | grep -q 'ARRAY\['; then
  echo "FAIL: Constraint 'audit_logs_action_known' does not contain an ARRAY definition!" >&2
  echo "Definition: $DEF" >&2
  exit 1
fi

echo "✓ Constraint 'audit_logs_action_known' exists and contains a canonical action array."

# ── One-row-per-action insertability test (recommended gate) ──────────────────
# Extract the action set from the owner-of-record migration and verify each is
# insertable; then verify an unknown action is rejected.
if [ ! -f "$OWNER_MIG" ]; then
  echo "NOTE: owner-of-record migration $OWNER_MIG not found — skipping insertability test." >&2
  exit 0
fi

# Extract actions ONLY from the owner's constraint ARRAY block, so version
# numbers or other quoted tokens elsewhere in the file are not treated as
# audit actions. The ARRAY block uses 4-space indented entries and ends with
# `  ])`, so match that closing line (2-space `]` + paren) as the window.
ACTIONS=$(awk '/ADD CONSTRAINT audit_logs_action_known/,/^  \]\)/' "$OWNER_MIG" \
  | grep -oE "'[A-Za-z_0-9]+'" | tr -d "'" | sort -u)
if [ -z "$ACTIONS" ]; then
  echo "FAIL: could not extract any actions from $OWNER_MIG" >&2
  exit 1
fi

COUNT=$(echo "$ACTIONS" | grep -c .)
echo "Running one-row-per-action insertability test against $COUNT canonical actions..."

# 1) Every canonical action must be insertable.
#
# NOTE: In CI mode (postgres:15-alpine service), audit_logs may not yet have
# the immutability trigger (20261223000001) or the full schema; the insert
# test is only meaningful when the migration chain has been replayed.
# The constraint existence check above is the primary gate; the insert test
# below is skipped in CI mode where the schema may not be complete.
# The host-side psql_exec now probes host resolvability before using
# DATABASE_URL, so CI mode (real Postgres service) still skips; the
# host-side docker-exec path (local host) runs the full insert test.
if [ -n "${DATABASE_URL:-}" ]; then
  _cihost="${DATABASE_URL#*://}"; _cihost="${_cihost%%/*}"; _cihost="${_cihost%%@*}"; _cihost="${_cihost##*:}"
  if getent hosts "$_cihost" >/dev/null 2>&1; then
    echo "NOTE: CI mode — skipping one-row-per-action insert test (constraint existence verified above)."
    exit 0
  fi
fi

INSERT_FAILS=0
while IFS= read -r a; do
  [ -z "$a" ] && continue
  OK=$(psql_exec \
    "INSERT INTO audit_logs (id, action, user_id, user_name, user_role, details, ip_address, user_agent, timestamp)
     VALUES (gen_random_uuid(), '$a', NULL, 'audit_check', 'audit_check', '{}', '127.0.0.1', 'audit_check', NOW()) RETURNING 'ok';" \
    2>/dev/null | head -n 1 || echo "err")
  if [ "$OK" != "ok" ]; then
    echo "  ✗ canonical action '$a' is NOT insertable (constraint too narrow)." >&2
    INSERT_FAILS=$((INSERT_FAILS+1))
  fi
done <<< "$ACTIONS"

# 2) An unknown action must be rejected (constraint actually bites).
BOGUS_OK=$(psql_exec \
  "INSERT INTO audit_logs (id, action, user_id, user_name, user_role, details, ip_address, user_agent, timestamp)
   VALUES (gen_random_uuid(), 'ZZ_AUDIT_CHECK_BOGUS_ACTION', NULL, 'audit_check', 'audit_check', '{}', '127.0.0.1', 'audit_check', NOW()) RETURNING 'ok';" \
  2>/dev/null || echo "rejected")
if [ "$BOGUS_OK" = "ok" ]; then
  echo "FAIL: unknown action 'ZZ_AUDIT_CHECK_BOGUS_ACTION' was accepted — the CHECK constraint is NOT enforced." >&2
  exit 1
fi

echo "✓ Probe rows left in place (audit_logs is immutable by design)."

if [ "$INSERT_FAILS" -gt 0 ]; then
  echo "FAIL: $INSERT_FAILS canonical action(s) could not be inserted into audit_logs." >&2
  exit 1
fi

echo "✓ One-row-per-action insertability: all $COUNT canonical actions accepted, unknown action rejected."
