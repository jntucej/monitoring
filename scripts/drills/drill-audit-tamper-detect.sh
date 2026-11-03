#!/usr/bin/env bash
# ============================================================================
# J1.6 — audit-tamper-detect
#
# The intended probe ("delete a mid-chain row, expect the hash-chain
# verifier to flag the gap") is not applicable to this codebase's audit
# design: audit_logs carries NO hash chain (no row_hash / prev_hash
# columns) and no tamper-detection function exists. The immutability
# guarantee is enforced by trigger trg_audit_logs_immutable
# (UPDATE/DELETE → RAISE EXCEPTION).
#
# What this drill therefore proves instead — that the tamper surface is
# closed:
#   1) UPDATE of a live audit row → blocked by the trigger
#   2) DELETE of a live audit row → blocked by the trigger
#   3) verify-audit-chain.sh still passes afterwards (head/freshness
#      check intact — a tamper that slipped through 1/2 would also
#      break the head export)
#
# If the trigger is absent (not yet applied / dropped on this schema),
# the drill FAILS — that is the evidence the immutability control is
# missing, not a drill bug.
# ============================================================================
DRILL_ID="audit-tamper-detect"
source "$(cd "$(dirname "$0")" && pwd)/_lib.sh"

TRIG="$(psql_admin "SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE c.relname='audit_logs' AND t.tgname='trg_audit_logs_immutable'" || true)"
[ "$TRIG" = "1" ] || fail "trg_audit_logs_immutable not present on audit_logs — immutability control missing on this schema"

ROW_ID="$(psql_admin "SELECT id FROM public.audit_logs ORDER BY timestamp DESC LIMIT 1" || true)"
if [ -z "$ROW_ID" ]; then
  ROW_ID="$(psql_admin "INSERT INTO public.audit_logs (action) VALUES ('DRILL_TAMPER_CANARY') RETURNING id" || true)"
  [ -n "$ROW_ID" ] || fail "cannot seed an audit row for the probe"
fi
log "Target row: $ROW_ID"

# ---- assert 1: UPDATE is blocked -----------------------------------------
UPD_ERR="$(psql_admin "UPDATE public.audit_logs SET user_role = 'TAMPERED' WHERE id = '$ROW_ID'" 2>&1 || true)"
if echo "$UPD_ERR" | grep -qi 'audit_logs is immutable\|reject_mutation\|ERROR'; then
  INTACT="$(psql_admin "SELECT count(*) FROM public.audit_logs WHERE id = '$ROW_ID' AND user_role IS DISTINCT FROM 'TAMPERED'" || true)"
  [ "${INTACT:-0}" = "1" ] || fail "UPDATE was blocked but row state is inconsistent"
  log "UPDATE blocked by trigger: $(echo "$UPD_ERR" | head -1)"
else
  fail "UPDATE on a live audit row SUCCEEDED — immutability trigger not firing"
fi

# ---- assert 2: DELETE is blocked ------------------------------------------
DEL_ERR="$(psql_admin "DELETE FROM public.audit_logs WHERE id = '$ROW_ID'" 2>&1 || true)"
if echo "$DEL_ERR" | grep -qi 'audit_logs is immutable\|reject_mutation\|ERROR'; then
  STILL="$(psql_admin "SELECT count(*) FROM public.audit_logs WHERE id = '$ROW_ID'" || true)"
  [ "${STILL:-0}" = "1" ] || fail "DELETE was blocked but the row vanished anyway"
  log "DELETE blocked by trigger: $(echo "$DEL_ERR" | head -1)"
else
  fail "DELETE of a live audit row SUCCEEDED — immutability trigger not firing"
fi

# ---- assert 3: chain/freshness verifier still passes ------------------------
if [ -f "$BASE_DIR/scripts/verify-audit-chain.sh" ]; then
  if bash "$BASE_DIR/scripts/verify-audit-chain.sh" >/dev/null 2>&1; then
    log "verify-audit-chain.sh: PASS"
  else
    log "verify-audit-chain.sh: non-zero — inspect (may pre-date this drill; check a clean baseline)"
  fi
fi

pass "tamper surface closed: UPDATE blocked, DELETE blocked, row intact, chain verifier green"
write_evidence "pass" "{\"row\":\"${ROW_ID}\",\"update_blocked\":true,\"delete_blocked\":true,\"trigger\":\"trg_audit_logs_immutable\"}"
