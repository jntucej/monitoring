#!/usr/bin/env bash
set -euo pipefail
fail=0

# 1. No CRON_SECRET-less cron routes
for f in src/app/api/cron/*/route.ts; do
  if [ -f "$f" ] && ! grep -q "checkCronAuth" "$f"; then
    echo "❌ $f is missing checkCronAuth"
    fail=1
  fi
done

# 2. No client-controlled PromQL
if [ -d "src/app/api/admin/monitoring" ] && grep -rE 'searchParams\.get\(["'\''"]query["'\''"]\)' src/app/api/admin/monitoring; then
  echo "❌ admin/monitoring accepts a client-controlled query param"
  fail=1
fi

# 3. No naked SELECT * export
if [ -f "src/app/api/admin/compliance/export/route.ts" ] && grep -rE 'SELECT \* FROM users' src/app/api/admin/compliance/export/route.ts; then
  echo "❌ compliance/export dumps password hashes"
  fail=1
fi

# 4. No GRANT supabase_admin TO authenticated/admin
if [ -d "database" ] && grep -rE "GRANT supabase_admin TO (authenticated|admin)" database/; then
  echo "❌ supabase_admin granted to authenticated/admin"
  fail=1
fi

# 5. No ALTER ROLE ... BYPASSRLS
if [ -d "database" ] && grep -rE "ALTER ROLE .* BYPASSRLS" database/; then
  echo "❌ BYPASSRLS migration found"
  fail=1
fi

if [ "$fail" = "1" ]; then
  echo "❌ Security checks failed"
  exit 1
fi
echo "✓ Security checks passed"
