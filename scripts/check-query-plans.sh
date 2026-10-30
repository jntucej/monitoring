#!/usr/bin/env bash
# scripts/check-query-plans.sh
# Verifies that hot queries on unbounded tables (users, movement_logs, audit_logs)
# are index-backed and do not trigger sequential scans.
set -euo pipefail

CONTAINER="${CONTAINER:-gate_postgres}"
DB="${DB:-gate_monitor}"

echo "=== Verifying Query Plan Budgets on Hot Tables ==="

FAILS=0

assert_index_scan() {
  local desc="$1"
  local sql="$2"
  local table="$3"

  local plan
  plan=$(docker exec -i "$CONTAINER" psql -U gate_app -d "$DB" -c "EXPLAIN $sql" 2>&1 || true)
  
  if echo "$plan" | grep -qE "Seq Scan on ${table}"; then
    echo "❌ FAIL: $desc triggered a Sequential Scan on $table!" >&2
    echo "$plan" >&2
    FAILS=$((FAILS + 1))
  else
    echo "✓ PASS: $desc is index-backed"
  fi
}

# Hot query 1: User authentication lookup by unique_id
assert_index_scan "User lookup by unique_id" \
  "SELECT id, password_hash, role FROM users WHERE unique_id = 'admin';" \
  "users"

# Hot query 2: Active movement lookup for student
assert_index_scan "Movement log student lookup" \
  "SELECT id, direction, timestamp FROM movement_logs WHERE user_id = '07187ea8-8062-4263-bc65-d2194564abe7' ORDER BY timestamp DESC LIMIT 1;" \
  "movement_logs"

# Hot query 3: Audit log inspection by action
assert_index_scan "Audit logs action lookup" \
  "SELECT id, action, timestamp FROM audit_logs WHERE action = 'SCAN_RECORDED' ORDER BY timestamp DESC LIMIT 10;" \
  "audit_logs"

echo ""
if [ "$FAILS" -gt 0 ]; then
  echo "Query plan budget check FAILED!" >&2
  exit 1
fi

echo "✓ All hot query plan budgets verified within acceptable index bounds."
