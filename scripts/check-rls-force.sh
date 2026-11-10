#!/usr/bin/env bash
# scripts/check-rls-force.sh
# Verifies that every public table with RLS enabled also has RLS FORCED.
#
# WHY: ENABLE ROW LEVEL SECURITY leaves the table OWNER able to bypass
# every policy. FORCE ROW LEVEL SECURITY extends the policies to the
# owner, closing that gap. The self-healing migration
# 20270106000003_force_rls_high_value_tables.sql forces any table that
# was enabled-but-not-forced at the time it ran; this script is the CI
# gate that catches any table created AFTER that migration which enabled
# RLS without forcing it.
#
# The FORCE check is pure catalog read (pg_class.relrowsecurity vs
# relforcerowsecurity), so it works against ANY database connection —
# including the CI postgres service where the gate_app role does not
# exist (unlike check-rls-enforcement.sh, which needs role emulation).
#
# Exit codes:
#   0 — all RLS-enabled tables are forced
#   1 — enabled-but-not-forced tables exist (printed, one per line)
#   2 — could not run the query (docker/psql unavailable); skips cleanly
#
# Uses the same CONTAINER/DB env knobs as check-rls-enforcement.sh.
set -uo pipefail

CONTAINER="${CONTAINER:-gate_postgres}"
DB="${DB:-gate_monitor}"

psql_available=false
PSQL=""

# 1. CI mode: DATABASE_URL set and reachable → connect directly.
if [ -n "${DATABASE_URL:-}" ]; then
  if command -v psql >/dev/null 2>&1; then
    PSQL() { psql "$DATABASE_URL" -d "$DB" -tAc "$1" 2>/dev/null; }
    psql_available=true
  fi
fi

# 2. Local mode: docker exec into the compose postgres container.
if [ "$psql_available" != true ] && docker ps >/dev/null 2>&1; then
  PSQL() { docker exec -i "$CONTAINER" psql -h 127.0.0.1 -U postgres -d "$DB" -tAc "$1" 2>/dev/null; }
  psql_available=true
fi

if [ "$psql_available" != true ]; then
  echo "SKIP: no psql path available (DATABASE_URL unset/unreachable, docker unavailable)."
  exit 2
fi

echo "=== RLS FORCE Verification ==="

MISSED=$(PSQL "
  SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relkind = 'r'
     AND c.relrowsecurity
     AND NOT c.relforcerowsecurity
   ORDER BY c.relname;")

TOTAL_ENABLED=$(PSQL "
  SELECT count(*)
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relkind = 'r'
     AND c.relrowsecurity;")

if [ -z "$TOTAL_ENABLED" ]; then
  echo "SKIP: could not query pg_class (connection failure)."
  exit 2
fi

if [ -z "$MISSED" ]; then
  echo "✓ PASS: all $TOTAL_ENABLED RLS-enabled public tables have FORCE ROW LEVEL SECURITY."
  exit 0
fi

echo "✗ FAIL: $TOTAL_ENABLED RLS-enabled tables, but the following are NOT forced (owner bypass still possible):"
echo "$MISSED" | sed 's/^/    /'
cat <<EOF

Fix: run
  ALTER TABLE public.<table> FORCE ROW LEVEL SECURITY;
or replay the self-heal:
  psql -d $DB -f database/migrations/20270106000003_force_rls_high_value_tables.sql
EOF
exit 1
