#!/usr/bin/env bash
# scripts/check-audit-constraint.sh
# Verifies that audit_logs_action_known CHECK constraint is active and contains the canonical action array.
set -euo pipefail

CONTAINER="${CONTAINER:-gate_postgres}"
DB="${DB:-gate_monitor}"

echo "=== Verifying audit_logs_action_known Constraint ==="

DEF=$(docker exec -i "$CONTAINER" psql -U postgres -d "$DB" -tAc \
  "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='audit_logs_action_known';" 2>/dev/null || echo "")

if [ -z "$DEF" ]; then
  echo "FAIL: Constraint 'audit_logs_action_known' is missing on table audit_logs!" >&2
  exit 1
fi

if ! echo "$DEF" | grep -q 'ARRAY\['; then
  echo "FAIL: Constraint 'audit_logs_action_known' does not contain an ARRAY definition!" >&2
  echo "Definition: $DEF" >&2
  exit 1
fi

echo "✓ Constraint 'audit_logs_action_known' exists and contains canonical action array."
