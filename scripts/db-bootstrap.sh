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
echo "NOTE: seed-21-roles.sql ships with demo passwords (see CREDENTIALS.md)."
echo "Run scripts/create-first-sysadmin.sh to rotate the SYSADMIN / kiosk"
echo "operator credentials out-of-band before going live."

# First-run guard: the seed above ships with demo passwords and sets
# password_must_change=TRUE on every seeded account. Before going live you
# MUST run scripts/create-first-sysadmin.sh to rotate SYSADMIN / kiosk
# OPERATOR credentials out-of-band; users flagged password_must_change are
# forced to change their password on next login (client redirect to
# /settings/password?mandatory=1, cleared by a self-service change).
