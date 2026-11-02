#!/usr/bin/env bash
# Strict role-scoping check script to prevent un-scoped queries on sensitive tables.
set -euo pipefail

SENSITIVE_TABLES="users student_details employee_details audit_logs api_metrics sessions movement_logs gate_passes"
FAILS=0

echo "Running strict role-scoping analysis on API routes..."

for f in src/app/api/**/*.ts; do
  [ -f "$f" ] || continue
  for t in $SENSITIVE_TABLES; do
    if grep -q "$t" "$f"; then
      # If the file mentions a sensitive table, verify it includes scoping checks like auth.userId, userId, or user_id
      if ! grep -qE "userId|user_id|auth\.userId|role|req\.headers\.get" "$f"; then
        echo "FAIL: $f queries sensitive table '$t' without obvious user/role scoping checks."
        FAILS=$((FAILS + 1))
      fi
    fi
  done
done

if [ "$FAILS" -gt 0 ]; then
  echo "❌ Role scoping check failed with $FAILS potential un-scoped queries."
  exit 1
fi

echo "✅ Role scoping check passed cleanly!"
exit 0
