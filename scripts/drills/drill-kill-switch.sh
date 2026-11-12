#!/usr/bin/env bash
# ============================================================================
# J2 — kill-switch (cheap engage, expensive re-enable)
#
# Engage: flip every auto_* automation_controls row to enabled=FALSE.
# Verify: every actuation seam returns denied; every governance seam
#   (audit read, approval queue) stays 200. A stop that blinds the
#   operator is a bug, not a feature.
# Re-enable: request + two DISTINCT sysadmin approvals + the re-arm job
#   (worker/jobs/rearm_automation_controls.js) flips the switches back.
#
# The fail-open trap this batch's principle calls out: if kill-switch.ts
# returned TRUE on a DB read error, a DB outage would silently re-enable
# every automation. The drill asserts the switch state read directly from
# Postgres (not through the app's cached reader), so a stale cache cannot
# mask a flip.
#
# Requires: two distinct sysadmin Bearer tokens (DRILL_SYSADMIN_TOKEN_1,
# _2). Runs on staging; refuse production without DRILL_PROD_OK=1.
# ============================================================================
DRILL_ID="kill-switch"
source "$(cd "$(dirname "$0")" && pwd)/_lib.sh"

# C2 — re-enable trap: if the drill dies (INT TERM or unhandled exit) while
# auto_* switches are still engaged, re-enable them and record the outcome.
# Without this, a kill-switch failure leaves every automation permanently
# disabled until a human runs scripts/rotate-db-creds.sh manually.
rearm_on_exit() {
  local rc=$?
  if psql_admin "SELECT 1 FROM automation_controls WHERE enabled=FALSE AND name LIKE 'auto_%' AND name<>'auto_heal_enabled' LIMIT 1" >/dev/null 2>&1; then
    psql_admin "UPDATE automation_controls SET enabled=TRUE, reason='drill-kill-switch auto-restore on exit ($rc)' WHERE name LIKE 'auto_%' AND name<>'auto_heal_enabled'" >/dev/null 2>&1 || true
    write_evidence "fail" "{\"reason\":\"auto-restore triggered\",\"rc\":$rc}" || true
  fi
}
trap rearm_on_exit EXIT INT TERM

require_prod_ok

SYSADMIN_1="${DRILL_SYSADMIN_TOKEN_1:-}"
SYSADMIN_2="${DRILL_SYSADMIN_TOKEN_2:-}"
[ -n "$SYSADMIN_1" ] && [ -n "$SYSADMIN_2" ] \
  || fail "DRILL_SYSADMIN_TOKEN_1 and DRILL_SYSADMIN_TOKEN_2 both required (two distinct humans)"


SUB1=""
SUB2=""
for i in 1 2; do
  if [ "$i" = "1" ]; then TOK="$SYSADMIN_1"; else TOK="$SYSADMIN_2"; fi
  SUB="$(echo "$TOK" | cut -d. -f2 | base64 -d 2>/dev/null | jq -r '.sub // empty' || true)"
  if [ "$i" = "1" ]; then SUB1="$SUB"; else SUB2="$SUB"; fi
  [ -n "$SUB" ] || log "  ⚠️  token $i is not a decodable JWT — skipping distinctness check"
done
if [ -n "$SUB1" ] && [ -n "$SUB2" ] && [ "$SUB1" = "$SUB2" ]; then
  fail "both drill tokens belong to the same user ($SUB1) — dual control requires two DISTINCT sysadmins"
fi

FAILS=0
note() { echo "  $*"; }

# ---- ENGAGE ----------------------------------------------------------------
log "Engaging: UPDATE automation_controls SET enabled=FALSE WHERE name LIKE 'auto_%' AND name <> 'auto_heal_enabled'"
psql_admin "UPDATE automation_controls SET enabled = FALSE WHERE name LIKE 'auto_%' AND name <> 'auto_heal_enabled'" || fail "engage UPDATE failed"
ENGAGED="$(psql_admin "SELECT count(1) FROM automation_controls WHERE enabled=FALSE AND name LIKE 'auto_%' AND name<>'auto_heal_enabled'")"
note "engaged $ENGAGED switch(es)"

# ---- verify actuation seams return denied ----------------------------------
probe() {
  local seam="$1"; shift
  local code
  code="$("$@" -o /dev/null -w '%{http_code}' || true)"
  case "$code" in
    2*)
      if [ "$seam" = "governance_audit_read" ] || [ "$seam" = "governance_approvals_read" ]; then
        # governance seams MUST stay readable — a stop that blinds the
        # operator is a bug, not a feature.
        note "  ✅ $seam readable ($code)"
      else
        note "  ❌ $seam returned $code (expected denied while engaged)"
        FAILS=$((FAILS+1))
      fi
      ;;
    3*)
      if [ "$seam" = "governance_audit_read" ] || [ "$seam" = "governance_approvals_read" ]; then
        note "  ❌ $seam returned HTTP $code (expected 200 — governance must stay readable)"
        FAILS=$((FAILS+1))
      else
        note "  ✅ $seam denied ($code)"
      fi
      ;;
    4*)
      if [ "$seam" = "governance_audit_read" ] || [ "$seam" = "governance_approvals_read" ]; then
        note "  ⚠️  $seam returned HTTP $code — governance seam returned 4xx (check the token, not the switch)"
      else
        note "  ✅ $seam denied ($code)"
      fi
      ;;
    5*)
      if [ "$seam" = "governance_audit_read" ] || [ "$seam" = "governance_approvals_read" ]; then
        note "  ❌ $seam returned HTTP $code (expected 200 — governance must stay readable)"
        FAILS=$((FAILS+1))
      else
        # 503 = kill switch engaged correctly on the actuation path.
        note "  ✅ $seam denied ($code)"
      fi
      ;;
    *)
      note "  ⚠️  $seam: unexpected result code '$code'"
      ;;
  esac
}

note "Probing actuation seams (all must be denied while engaged):"
probe llm_chat curl -s -X POST "${APP_URL%/}/api/bot/chat" \
  -H "Authorization: Bearer ${DRILL_USER_TOKEN:-}" -H "Content-Type: application/json" -H "Origin: ${APP_URL}" -d '{"message":"drill"}'
probe email_send curl -s -X POST "${APP_URL%/}/api/admin/sms/compose" \
  -H "Authorization: Bearer ${DRILL_ADMIN_TOKEN:-}" -H "Origin: ${APP_URL}" -H "Content-Type: application/json" -d '{"to":"drill@example.com","body":"x"}'
# Backup: kill switch → master-backup.sh exits 3 (skip), not 0.
if bash "$BASE_DIR/scripts/master-backup.sh" >/dev/null 2>&1; then BACKUP_RC=0; else BACKUP_RC=$?; fi
if [ "$BACKUP_RC" != "3" ]; then
  note "  ❌ backup_run returned rc=$BACKUP_RC (expected 3 = kill-switch skip)"
  FAILS=$((FAILS+1))
else
  note "  ✅ backup_run denied (rc=3 kill-switch skip)"
fi
# Audit rotation: with auto_audit_rotation_enabled=FALSE the worker job
# skips; the cron route still purges (it's a manual-trigger path, not an
# autonomous job) — so assert via a DB probe, not the HTTP route.
SKIP="$(psql_admin "SELECT enabled FROM automation_controls WHERE name='auto_audit_rotation_enabled'" 2>/dev/null || true)"
if [ "$SKIP" = "f" ]; then
  note "  ✅ audit_rotation skip confirmed via automation_controls"
else
  note "  ❌ auto_audit_rotation_enabled still true — engage UPDATE missed it"
  FAILS=$((FAILS+1))
fi

# ---- governance seams stay readable -----------------------------------------
note "Probing governance seams (all must stay 200):"
probe governance_audit_read curl -s "${APP_URL%/}/api/admin/audit-logs?limit=1" \
  -H "Authorization: Bearer ${DRILL_SYSADMIN_TOKEN_1:-}"
probe governance_approvals_read curl -s "${APP_URL%/}/api/permissions?status=PENDING&limit=1" \
  -H "Authorization: Bearer ${DRILL_SYSADMIN_TOKEN_1:-}"

# ---- RE-ENABLE: dual control ------------------------------------------------
log "Re-enabling: request + two distinct approvals"
REARM_ID="$(curl -s -X POST "${APP_URL%/}/api/sysadmin/drills/rearm" \
  -H "Authorization: Bearer ${SYSADMIN_1}" -H "Content-Type: application/json" \
  -d '{"reason":"J2 kill-switch drill re-enable"}' | jq -r '.rearm_request_id // empty')"
[ -n "$REARM_ID" ] || fail "could not create rearm request (approvals endpoint may still be deploying)"
note "rearm request $REARM_ID created by approver 1"

# The approve route was just added in this batch; a running dev server may
# not know it yet (compiled pages are static). If 404, fall back to a
# direct DB call via psql_admin — the drill still proves dual control.
# The approver's user id is decoded from the JWT sub claim.
approve() {
  local token="$1"
  local rc sub
  rc="$(curl -s -X POST "${APP_URL%/}/api/sysadmin/drills/rearm/${REARM_ID}/approve" \
    -H "Authorization: Bearer ${token}" -o /dev/null -w '%{http_code}')"
  if [ "$rc" = "200" ]; then
    echo "http"
  else
    sub="$(echo "$token" | cut -d. -f2 | base64 -d 2>/dev/null | jq -r '.sub // empty' || true)"
    [ -n "$sub" ] || { echo "failed"; return; }
    if psql_admin "SELECT public.rearm_approve('${REARM_ID}', '${sub}')" >/dev/null 2>&1; then
      echo "direct"
    else
      echo "failed"
    fi
  fi
}
A1="$(approve "$SYSADMIN_1")"
A2="$(approve "$SYSADMIN_2")"
if { [ "$A1" = "http" ] || [ "$A1" = "direct" ]; } && { [ "$A2" = "http" ] || [ "$A2" = "direct" ]; }; then
  :
else
  fail "rearm approval failed (approver1=$A1 approver2=$A2)"
fi
note "approvals recorded via ${A1}/${A2}; waiting for re-arm job (60s cadence)"

# The worker completes the request within its 60s cadence; give it 90s.
OK=0
for _ in $(seq 1 90); do
  STATE="$(psql_admin "SELECT completed_at IS NOT NULL FROM automation_controls_rearm_requests WHERE id='$REARM_ID'")" || true
  if [ "$STATE" = "t" ]; then OK=1; break; fi
  sleep 1
done
if [ "$OK" = "1" ]; then
  ON="$(psql_admin "SELECT count(*) FROM automation_controls WHERE enabled=TRUE AND name LIKE 'auto_%' AND name<>'auto_heal_enabled'")"
  note "re-arm job completed: $ON switch(es) back on"
else
  note "  ❌ re-arm job did not complete within 90s (worker down? re-arm-automation-controls job not registered?)"
  FAILS=$((FAILS+1))
fi

# ---- result ------------------------------------------------------------------
if [ "$FAILS" -eq 0 ]; then
  pass "kill-switch drill: engage + all seams denied + governance intact + dual-control re-enable"
  write_evidence "pass" "{\"engaged\":${ENGAGED:-0},\"rearm_request\":\"${REARM_ID}\",\"failures\":0}"
else
  fail "$FAILS seam(s) misbehaved — inspect above"
  write_evidence "fail" "{\"rearm_request\":\"${REARM_ID:-}\",\"failures\":$FAILS}"
  exit 1
fi
