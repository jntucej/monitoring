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

psql() { psql "$URL" -v ON_ERROR_STOP=0 -e "$@"; }

echo "==> 1. Bootstrap (roles + extensions)"
psql -f database/bootstrap.sql

echo "==> 2. Schema baseline"
psql -f database/schema.sql

echo "==> 3. Migrations (in filename order)"
for f in $(ls database/migrations/*.sql 2>/dev/null | sort); do
  echo "    $f"
  psql -f "$f" || true   # individual migration errors are non-fatal (drift tolerated)
done

echo "==> 4. Seed demo roles"
# Use the static seed with real bcrypt hashes (works on a fresh container).
# seed-21-roles.sql is idempotent and self-contained — it sets a usable
# password on SYSADMIN and OPERATOR so the operator can log in immediately.
# The GUC-dependent scripts/seed-roles.sql is NOT used here because on a
# fresh container app.seed_password is unset, which yields NULL password_hash
# for every role and blocks first login.
psql -f database/seeds/seed-21-roles.sql

echo "==> Done."
echo ""
echo "NOTE: seed-21-roles.sql ships with demo passwords (see CREDENTIALS.md)."
echo "Run scripts/create-first-sysadmin.sh to rotate the SYSADMIN / kiosk"
echo "operator credentials out-of-band before going live."
