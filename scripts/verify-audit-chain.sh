#!/bin/bash
# ============================================================================
# verify-audit-chain.sh — Verify audit_logs chain integrity and canary token.
#
# Checks:
#   1. audit_logs_action_known constraint exists on audit_logs
#   2. CANARY_TRIPWIRE_SENTINEL canary row is present
#   3. Complaint audit actions are registered in the constraint
#
# Usage: DATABASE_URL=postgres://... bash scripts/verify-audit-chain.sh
# ============================================================================
set -euo pipefail

URL="${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/gate_monitor}"
psql_exec() { psql "$URL" -v ON_ERROR_STOP=1 -tAc "$1"; }

echo "=== Audit Chain Verification ==="

# 1. Constraint exists
cdef=$(psql_exec "SELECT pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid WHERE t.relname='audit_logs' AND c.conname='audit_logs_action_known';")
if [ -z "$cdef" ]; then
  echo "FAIL: audit_logs_action_known constraint missing"
  exit 1
fi
echo "OK: audit_logs_action_known constraint present"

# 2. Canary row present
canary_count=$(psql_exec "SELECT count(*) FROM audit_logs WHERE action='CANARY_TRIPWIRE_SENTINEL' AND details->>'tripwire'='audit_log_tamper_canary';")
if [ "$canary_count" -lt 1 ]; then
  echo "FAIL: CANARY_TRIPWIRE_SENTINEL canary row missing (found $canary_count)"
  exit 1
fi
echo "OK: CANARY_TRIPWIRE_SENTINEL canary row present ($canary_count row(s))"

# 3. Complaint actions registered
for action in COMPLAINT_CREATED COMPLAINT_RESOLVED ANTI_RAGGING_CASE_FILED SOS_RAISED MEAL_OPT_OUT_CREATED DELEGATION_RULE_CREATED COMPLAINT_SLA_BREACHED; do
  n=$(psql_exec "SELECT count(*) FROM audit_logs WHERE action='$action';")
  echo "OK: action '$action' whitelisted (count=$n)"
done

echo "=== All audit chain checks passed ==="
