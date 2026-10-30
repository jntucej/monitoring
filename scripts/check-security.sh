#!/usr/bin/env bash
# scripts/check-security.sh
# Verifies critical security invariants across routes, migrations, and roles.
set -euo pipefail

fail=0

echo "=== Running Security Invariant Checks ==="

# 1. No CRON_SECRET-less cron routes
echo "Checking cron route authorization..."
for cron_route in $(find src/app/api/cron -name 'route.ts' 2>/dev/null || true); do
  if ! grep -qE "CRON_SECRET|withCronAuth|cronAuth" "$cron_route"; then
    echo "❌ Cron route missing CRON_SECRET authorization: $cron_route"
    fail=1
  fi
done

# 2. No client-controlled PromQL
echo "Checking Prometheus metrics endpoint parameters..."
if [ -d "src/app/api/admin/monitoring" ] && grep -rE 'searchParams\.get\(["'\''"]query["'\''"]\)' src/app/api/admin/monitoring; then
  echo "❌ admin/monitoring accepts a client-controlled query param"
  fail=1
fi

# 3. No un-sanitized client export dumps
echo "Checking for unsafe export routes..."
if [ -d "src/app/api" ] && grep -rnE "SELECT \* FROM [a-zA-Z0-9_]+" src/app/api | grep -iE "(passwords|tokens|secrets|keys)" 2>/dev/null; then
  echo "❌ Detected raw SELECT * querying secrets in API route"
  fail=1
fi

# 4. No dangerous role escalations in migrations
echo "Checking database migrations for unauthorized superuser grants..."
if grep -riE "GRANT\s+supabase_admin\s+TO\s+(authenticated|anon|admin)" database/migrations/ 2>/dev/null; then
  echo "❌ Detected invalid GRANT supabase_admin in migrations"
  fail=1
fi

# 5. No new BYPASSRLS grants (only NOBYPASSRLS allowed on postgres / gate_app)
echo "Checking for new BYPASSRLS grants in migrations..."
# Check for active ALTER ROLE (postgres|gate_app) ... BYPASSRLS without preceding NO
if grep -riE "ALTER\s+ROLE\s+(postgres|gate_app)\s+BYPASSRLS" database/migrations/ | grep -v "NOBYPASSRLS" 2>/dev/null; then
  echo "❌ Detected unsafe ALTER ROLE (postgres|gate_app) BYPASSRLS in migrations"
  fail=1
fi

if [ "$fail" = "1" ]; then
  echo "❌ Security checks failed!"
  exit 1
fi

echo "✓ All security checks passed."
