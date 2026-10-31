#!/usr/bin/env bash
# ============================================================================
# check-gate-app-read-set.sh — prove the app role (gate_app) can read every
# RLS-enabled table. This is the CI regression check for the "silent zero-row"
# failure class: RLS on + NOBYPASSRLS + a missing gate_app SELECT policy = the
# app gets HTTP 200 with an empty result set.
#
# Usage:
#   bash scripts/check-gate-app-read-set.sh            # against running gate_postgres
#   DB_HOST=... DB_USER=postgres DB_NAME=gate_monitor bash scripts/check-gate-app-read-set.sh
#
# Exits 0 if every RLS-enabled public base table has a gate_app SELECT (or ALL)
# policy. Exits 1 and lists the offenders otherwise.
# ============================================================================
set -uo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Default to the running Postgres container when docker is available; otherwise
# use local psql with env overrides.
PSQL=""
if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^gate_postgres$'; then
  PSQL=(docker exec gate_postgres psql -U postgres -d "${POSTGRES_DB:-gate_monitor}")
elif command -v psql >/dev/null 2>&1; then
  PSQL=(psql -h "${DB_HOST:-127.0.0.1}" -p "${DB_PORT:-5432}" -U "${DB_USER:-postgres}" -d "${DB_NAME:-gate_monitor}")
else
  echo "ERROR: no psql available (need docker+gate_postgres or psql on PATH)" >&2
  exit 2
fi

GAP=$("${PSQL[@]}" -tAc "
SELECT string_agg(t.table_name, ', ' ORDER BY t.table_name)
FROM information_schema.tables t
WHERE t.table_schema='public' AND t.table_type='BASE TABLE'
  AND EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='public' AND c.relname=t.table_name AND c.relrowsecurity)
  AND NOT EXISTS (SELECT 1 FROM pg_policies p
                  WHERE p.schemaname='public' AND p.tablename=t.table_name
                    AND p.cmd IN ('ALL','SELECT') AND p.roles::text ILIKE '%gate_app%');" 2>/dev/null)

COUNT=$("${PSQL[@]}" -tAc "
SELECT count(*) FROM information_schema.tables t
WHERE t.table_schema='public' AND t.table_type='BASE TABLE'
  AND EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='public' AND c.relname=t.table_name AND c.relrowsecurity)
  AND NOT EXISTS (SELECT 1 FROM pg_policies p
                  WHERE p.schemaname='public' AND p.tablename=t.table_name
                    AND p.cmd IN ('ALL','SELECT') AND p.roles::text ILIKE '%gate_app%');")

if [ "${COUNT:-0}" -eq 0 ]; then
  echo "PASS: gate_app has a SELECT/ALL policy on every RLS-enabled public table."
  exit 0
else
  echo "FAIL: ${COUNT} RLS-enabled table(s) lack a gate_app SELECT policy (silent-zero-row risk):" >&2
  echo "  ${GAP}" >&2
  echo "Fix: add the missing policies (see database/migrations/20270101000013_gate_app_rls_read_set_select.sql) or register a new owner-of-record migration." >&2
  exit 1
fi
