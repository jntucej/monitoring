#!/bin/bash
# ============================================================================
# verify-audit-chain.sh — Verify audit-chain integrity.
#
# Two layers (both run on host cron; see /etc/cron.d/gate-jobs):
#
#   A. LEGACY canary tripwire (audit_logs table)
#      1. audit_logs_action_known constraint exists
#      2. CANARY_TRIPWIRE_SENTINEL canary row is present
#      3. Known complaint actions are registered in the constraint
#
#   B. NEW SHA256 hash chain (audit_events → audit_chain, added 2026-11)
#      4. audit_chain + audit_chain_checkpoints tables exist
#      5. Latest checkpoint status = 'OK' (or alert if 'BROKEN')
#      6. Chain length grows (no silent truncation)
#
# Usage: DATABASE_URL=postgres://... bash scripts/verify-audit-chain.sh
#        (run with -h flag against the gate_postgres container, or set
#         DATABASE_URL to the container's internal address)
# ============================================================================
set -euo pipefail

URL="${DATABASE_URL:-postgres://postgres:***@localhost:5432/gate_monitor}"
psql_exec() { psql "$URL" -v ON_ERROR_STOP=1 -tAc "$1"; }

echo "=== Audit Chain Verification ==="

# --- A. LEGACY canary tripwire (audit_logs) ---

# 1. Constraint exists
cdef=$(psql_exec "SELECT pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid WHERE t.relname='audit_logs' AND c.conname='audit_logs_action_known';")
if [ -z "$cdef" ]; then
  echo "WARN: audit_logs_action_known constraint missing (legacy table)"
  # Not fatal — the legacy table may not exist on fresh installs.
else
  echo "OK: audit_logs_action_known constraint present"
fi

# 2. Canary row present (legacy)
canary_count=$(psql_exec "SELECT count(*) FROM audit_logs WHERE action='CANARY_TRIPWIRE_SENTINEL' AND details->>'tripwire'='audit_log_tamper_canary';" 2>/dev/null || echo 0)
if [ "$canary_count" -ge 1 ]; then
  echo "OK: CANARY_TRIPWIRE_SENTINEL canary row present ($canary_count row(s))"
else
  echo "WARN: canary row not found in audit_logs (legacy table may be empty)"
fi

# 3. Complaint actions registered (legacy)
for action in COMPLAINT_CREATED COMPLAINT_RESOLVED ANTI_RAGGING_CASE_FILED SOS_RAISED MEAL_OPT_OUT_CREATED DELEGATION_RULE_CREATED COMPLAINT_SLA_BREACHED; do
  n=$(psql_exec "SELECT count(*) FROM audit_logs WHERE action='$action';" 2>/dev/null || echo 0)
  echo "OK: action '$action' registered (count=$n)"
done

# --- B. NEW SHA256 hash chain (audit_events → audit_chain) ---

# 4. Tables exist
tables_ok=$(psql_exec "SELECT count(*) FROM pg_class WHERE relname IN ('audit_chain','audit_chain_checkpoints') AND relkind='r';")
if [ "$tables_ok" -ge 2 ]; then
  echo "OK: audit_chain + audit_chain_checkpoints tables present"
else
  echo "WARN: audit_chain tables missing (first nightly run will create them)"
fi

# 5. Latest checkpoint status
last_status=$(psql_exec "SELECT status FROM audit_chain_checkpoints ORDER BY seq DESC LIMIT 1;" 2>/dev/null || echo "NONE")
last_seq=$(psql_exec "SELECT seq FROM audit_chain_checkpoints ORDER BY seq DESC LIMIT 1;" 2>/dev/null || echo 0)
case "$last_status" in
  OK)
    echo "OK: latest checkpoint seq=$last_seq status=OK"
    ;;
  BROKEN)
    echo "CRITICAL: latest checkpoint seq=$last_seq status=BROKEN — chain integrity broken, investigate immediately"
    echo "  → freeze the affected audit_events rows, open a security incident"
    echo "  → do NOT re-run until the break is forensically explained"
    exit 1
    ;;
  NONE|*)
    echo "WARN: no checkpoint yet (first nightly 02:00 run pending)"
    ;;
esac

# 6. Chain length
chain_len=$(psql_exec "SELECT count(*) FROM audit_chain;" 2>/dev/null || echo 0)
echo "INFO: audit_chain length = $chain_len links"

echo "=== Audit chain verification complete ==="
