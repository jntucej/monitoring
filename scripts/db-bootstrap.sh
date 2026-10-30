#!/bin/bash
# ============================================================================
# Database Bootstrap: create a working gate_monitor schema from scratch
# Usage:
#   bash scripts/db-bootstrap.sh              (uses .env DATABASE_URL or localhost)
#   DATABASE_URL=postgres://... bash scripts/db-bootstrap.sh
# ============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."

URL="${DATABASE_URL:-postgres://postgres:ci_dummy_postgres_password_123@localhost:5432/gate_monitor}"

psql_exec() { command psql "$URL" -v ON_ERROR_STOP=1 "$@"; }

echo "==> 1. Bootstrap (roles + extensions)"
psql_exec -f database/bootstrap.sql

echo "==> 2. Schema baseline"
psql_exec -f database/schema.sql

echo "==> 3. Migrations (in filename order)"
for f in $(ls database/migrations/*.sql 2>/dev/null | sort); do
  echo "    $f"
  psql_exec -f "$f"
done

echo "==> 4. Seed demo roles"
# Use the static seed with real bcrypt hashes (works on a fresh container).
# seed-21-roles.sql is idempotent and self-contained — it sets a usable
# password on SYSADMIN and OPERATOR so the operator can log in immediately.
# The GUC-dependent scripts/seed-roles.sql is NOT used here because on a
# fresh container app.seed_password is unset, which yields NULL password_hash
# for every role and blocks first login.
psql_exec -f database/seeds/seed-21-roles.sql

echo "==> Done."
echo ""

# First-run guard: ensure no ACTIVE sysadmin/admin user has NULL password without operator initialization
NULL_ADMINS=$(psql_exec -tAc "SELECT count(*) FROM users WHERE role IN ('sysadmin', 'admin') AND status = 'ACTIVE' AND password_hash IS NULL;" || echo "0")
if [ "$NULL_ADMINS" -gt 0 ]; then
  echo "⚠️ NOTICE: $NULL_ADMINS administrative accounts have password_hash = NULL (uninitialized)."
  echo "You MUST run: bash scripts/create-first-sysadmin.sh to configure the root administrator."
fi

