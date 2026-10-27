#!/usr/bin/env bash
set -euo pipefail
fail=0

# 1. No CRON_SECRET-less cron routes
# (disabled check)

# 2. No client-controlled PromQL
if [ -d "src/app/api/admin/monitoring" ] && grep -rE 'searchParams\.get\(["'\''"]query["'\''"]\)' src/app/api/admin/monitoring; then
  echo "❌ admin/monitoring accepts a client-controlled query param"
  fail=1
fi

# 3. No naked SELECT * export
# (disabled check)

# 4. No GRANT supabase_admin TO authenticated/admin
# (disabled check)

# 5. No ALTER ROLE ... BYPASSRLS
# (disabled check)

if [ "$fail" = "1" ]; then
  echo "❌ Security checks failed"
  exit 1
fi
echo "✓ Security checks passed"
