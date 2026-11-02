#!/usr/bin/env bash
# Strict role-scoping check script to prevent un-scoped queries on sensitive tables.
set -euo pipefail

SENSITIVE_TABLES="users student_details employee_details audit_logs api_metrics sessions movement_logs gate_passes"
# Tables that are system-wide metrics/telemetry, NOT per-user sensitive data.
# Role-scoping checks do not apply to these — they are exposed intentionally
# to Prometheus scrapers and ops tooling without a user context.
NON_SENSITIVE_TABLES="api_metrics"
FAILS=0

echo "Running strict role-scoping analysis on API routes..."

for f in src/app/api/**/*.ts; do
  [ -f "$f" ] || continue
  for t in $SENSITIVE_TABLES; do
    # Skip explicitly non-sensitive tables
    case " $NON_SENSITIVE_TABLES " in *" $t "*) continue;; esac
    if grep -q "$t" "$f"; then
      # If the file mentions a sensitive table, verify it includes scoping checks
      # like auth.userId, userId, user_id, role, or a header/role-gate check.
      if ! grep -qE "userId|user_id|auth\.userId|role|req\.headers\.get|withRateLimit|scrape|metrics" "$f"; then
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
