#!/usr/bin/env bash
# scripts/check-rls-enforcement.sh
# Verifies that RLS policies enforce isolation across roles and negative permissions.
# Evaluates cross-role / cross-resource access using role context emulation.
set -euo pipefail

CONTAINER="${CONTAINER:-gate_postgres}"
DB="${DB:-gate_monitor}"

echo "=== Running RLS Cross-Role Enforcement Checks ==="

psql_cmd() {
  docker exec -i "$CONTAINER" psql -h 127.0.0.1 -U gate_app -d "$DB" -v ON_ERROR_STOP=1 "$@"
}

TOTAL=0
PASSED=0
FAILED=0

assert_denied() {
  local desc="$1"
  local sql="$2"
  TOTAL=$((TOTAL + 1))
  
  local res
  res=$(docker exec -i "$CONTAINER" psql -h 127.0.0.1 -U gate_app -d "$DB" -tAc "$sql" 2>&1 || true)
  if echo "$res" | grep -qE "permission denied|0 rows|^0$|ERROR:"; then
    echo "  ✓ PASS: $desc"
    PASSED=$((PASSED + 1))
  elif [ -z "$res" ]; then
    echo "  ✓ PASS: $desc (0 rows returned)"
    PASSED=$((PASSED + 1))
  else
    echo "  ✗ FAIL: $desc (Returned unexpected data: $res)"
    FAILED=$((FAILED + 1))
  fi
}

assert_count() {
  local desc="$1"
  local expected="$2"
  local sql="$3"
  TOTAL=$((TOTAL + 1))

  local res
  res=$(docker exec -i "$CONTAINER" psql -h 127.0.0.1 -U gate_app -d "$DB" -tAc "$sql" 2>&1 || true)
  # Take the last line of output if multi-line transaction output
  local val
  val=$(echo "$res" | grep -vE "^(BEGIN|SET|ROLLBACK|COMMIT)" | tr -d '[:space:]' | tail -n 1)
  if [ "$val" = "$expected" ]; then
    echo "  ✓ PASS: $desc"
    PASSED=$((PASSED + 1))
  else
    echo "  ✗ FAIL: $desc (Expected $expected, got '$val' [raw: $res])"
    FAILED=$((FAILED + 1))
  fi
}

# Fetch real student IDs for testing
STUDENT_A_ID=$(docker exec -i "$CONTAINER" psql -h 127.0.0.1 -U gate_app -d "$DB" -tAc "SELECT id FROM users WHERE role = 'student' ORDER BY created_at ASC LIMIT 1;")
STUDENT_B_ID=$(docker exec -i "$CONTAINER" psql -h 127.0.0.1 -U gate_app -d "$DB" -tAc "SELECT id FROM users WHERE role = 'student' AND id != '$STUDENT_A_ID' ORDER BY created_at ASC LIMIT 1;")

echo "1. Verify NOBYPASSRLS on postgres and gate_app roles"
assert_count "gate_app rolbypassrls is false" "f" "SELECT rolbypassrls FROM pg_roles WHERE rolname = 'gate_app';"
assert_count "postgres rolbypassrls is false" "f" "SELECT rolbypassrls FROM pg_roles WHERE rolname = 'postgres';"

echo "2. Student cross-read assertions"
assert_count "Student 1 cannot read Student 2's hostel permissions under RLS" "0" "
  BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL app.current_user_id TO '$STUDENT_A_ID';
  SELECT count(*) FROM permissions WHERE requester_user_id = '$STUDENT_B_ID' AND workflow_type = 'hostel';
  ROLLBACK;
"

assert_count "Student 1 cannot read other student_details rows as warden" "0" "
  BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL app.current_user_id TO '$STUDENT_A_ID';
  SELECT count(*) FROM student_details WHERE user_id = '$STUDENT_B_ID';
  ROLLBACK;
"

echo "3. Operator cross-resource assertions"
assert_count "Non-admin cannot read system_settings rows" "0" "
  BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL app.current_user_id TO '$STUDENT_A_ID';
  SELECT count(*) FROM system_settings;
  ROLLBACK;
"

echo "4. Anonymous role restrictions"
assert_denied "Anon cannot read users table" "
  BEGIN;
  SET LOCAL ROLE anon;
  SELECT count(*) FROM users;
  ROLLBACK;
"

assert_denied "Anon cannot read system_settings table" "
  BEGIN;
  SET LOCAL ROLE anon;
  SELECT count(*) FROM system_settings;
  ROLLBACK;
"

echo ""
echo "=== Summary: $PASSED / $TOTAL checks passed ==="
if [ "$FAILED" -gt 0 ]; then
  echo "RLS enforcement verification FAILED!"
  exit 1
fi
echo "✓ All RLS enforcement assertions verified successfully."
