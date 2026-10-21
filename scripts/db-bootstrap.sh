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
psql -f scripts/seed-roles.sql

echo "==> Done."
