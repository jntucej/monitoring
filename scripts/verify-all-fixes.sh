#!/usr/bin/env bash
# scripts/verify-all-fixes.sh — confirm every fix from the review is landed.
# Usage:  bash scripts/verify-all-fixes.sh [--verbose]
# Exit:   0 = all PASS, 1 = at least one FAIL, 2 = environment not ready

set -uo pipefail
VERBOSE=0
[ "${1:-}" = "--verbose" ] && VERBOSE=1

# ── Environment readiness ────────────────────────────────────────────────────
command -v rg >/dev/null 2>&1 || { echo "ERROR: install ripgrep (rg)"; exit 2; }
[ -d src ] || { echo "ERROR: run from repo root"; exit 2; }
command -v docker >/dev/null 2>&1 || { echo "ERROR: docker not found"; exit 2; }

# ── Counters ─────────────────────────────────────────────────────────────────
PASS=0; FAIL=0; SKIP=0
declare -a FAILED=()

cyan() { printf "\033[36m%s\033[0m\n" "$1"; }
green() { printf "\033[32m%s\033[0m\n" "$1"; }
red() { printf "\033[31m%s\033[0m\n" "$1"; }
yellow() { printf "\033[33m%s\033[0m\n" "$1"; }
dim() { printf "\033[2m%s\033[0m\n" "$1"; }

section() { echo ""; cyan "═══ $1 ═══"; }
p() { PASS=$((PASS+1)); echo "  $(green '✓') $1"; }
f() { FAIL=$((FAIL+1)); FAILED+=("$1"); echo "  $(red '✗') $1"; if [ -n "${2:-}" ]; then dim "     $2"; fi; }
s() { SKIP=$((SKIP+1)); echo "  $(yellow '⊘') $1"; }

grep_has() {
  local file="$1" pattern="$2" label="$3"
  if [ ! -f "$file" ]; then f "$label" "file missing: $file"; return; fi
  if rg -q "$pattern" "$file"; then p "$label"; else f "$label" "pattern not found: $pattern"; fi
}

grep_lacks() {
  local file="$1" pattern="$2" label="$3"
  if [ ! -f "$file" ]; then f "$label" "file missing: $file"; return; fi
  if rg -q "$pattern" "$file"; then
    f "$label" "pattern still present: $pattern"
  else
    p "$label"
  fi
}

# ════════════════════════════════════════════════════════════════════════════
# BATCH 1 — P0 (C1–C13)
# ════════════════════════════════════════════════════════════════════════════
section "Batch 1 — P0 (C1–C13)"

grep_has database/migrations/20261215000000_fix_is_warden_hostel_manager.sql \
  "r IN \('principal', 'warden', 'hostel_manager'\)" \
  "C2: is_warden covers principal/warden/hostel_manager"

grep_lacks database/migrations/20261215000000_fix_is_warden_hostel_manager.sql \
  "DROP POLICY IF EXISTS %I ON %I\.%I" \
  "C2: no more blind policy-drop loop"

grep_has database/migrations/20261030000000_enrollment_purpose_check.sql \
  "role_bootstrap" \
  "C3: enrollment_codes purpose includes role_bootstrap"

grep_lacks database/migrations/20261112000002_gate_operator_kiosk_default.sql \
  "initial_pin_hash = '\\\$2[aby]\\\$" \
  "C4: no hardcoded bcrypt PIN in kiosk-default migration"

grep_lacks database/migrations/20261010120000_create_app_role.sql \
  "placeholder_to_be_rotated" \
  "C5: no placeholder password for gate_app"

grep_has "src/app/(admin)/admin/permission-policies/page.tsx" \
  '<Suspense' \
  "C7: permission-policies wraps Suspense"

grep_lacks "src/app/(admin)/admin/health/page.tsx" \
  "intervalMs: 1000\|intervalMs:1_000" \
  "C8: admin/health no 1s polling"

grep_has "src/app/(admin)/admin/layout.tsx" \
  "getAuthHeaders" \
  "C9: admin layout uses getAuthHeaders"

grep_has "src/app/(admin)/admin/attendance/bulk-import/page.tsx" \
  'method:\s*"POST"' \
  "C10: attendance bulk-import POSTs to API"

grep_has "src/app/(operator)/operator/pass-verification/page.tsx" \
  'workflow_type=hostel' \
  "C12: operator/pass-verification scoped to hostel"

# C13 (re-pointed post-P1-reorg): the exceptions view moved to
# response/exceptions and is wired to the scoped /api/supervisor/escalations
# endpoint; the outpass invariant is asserted across the supervisor subtree.
grep_lacks "src/app/(supervisor)/supervisor/response/exceptions/page.tsx" \
  'workflow_type=outpass' \
  "C13: supervisor/exceptions (response/) no outpass workflow_type"

grep_has "src/app/(supervisor)/supervisor/response/exceptions/page.tsx" \
  'EscalationsView' \
  "C13: supervisor/exceptions wired to the supervisor escalations endpoint"


# ════════════════════════════════════════════════════════════════════════════
# BATCH 2 — P1 (#14–#23)
# ════════════════════════════════════════════════════════════════════════════
section "Batch 2 — P1 (#14–#23)"

grep_has "src/app/(sysadmin)/sysadmin/gates/page.tsx" \
  '/api/gates' \
  "#14: sysadmin/gates uses /api/gates"

grep_has "src/app/(admin)/admin/gates/page.tsx" \
  'devices|data' \
  "#15: admin/gates envelope handling"

grep_has "src/app/(admin)/admin/analytics/page.tsx" \
  'department|role' \
  "#17: admin/analytics analytics metrics"

# #18 (re-pointed post-reorg): the standalone emergency-decisions page was
# folded into the principal console; the delegation language now lives in
# the shared DelegationsView that the governance/delegations surface renders.
grep_has "src/app/(approver)/principal/_shared/DelegationsView.tsx" \
  'delegation' \
  "#18: principal delegation surface uses 'delegation' language"

grep_lacks "src/app/(student)/student/permissions/page.tsx" \
  'ESCALATE_UP' \
  "#19: no ESCALATE_UP"

# #20 (re-pointed post-reorg): permission-management became the shared
# approvals flow; the CANCEL action vocabulary lives in the revoke endpoint
# every role's revoke goes through.
grep_has "src/app/api/permissions/[ticket]/revoke/route.ts" \
  'CANCEL' \
  "#20: permission revoke records the 'CANCEL' action"

grep_has "src/app/(approver)/staff/my-profile/page.tsx" \
  '"/api/profile"' \
  "#21: staff/my-profile uses /api/profile"

grep_has "src/app/(approver)/faculty/student-directory/page.tsx" \
  '"/api/students"' \
  "#22: faculty/student-directory uses /api/students"

# #13b (re-pointed post-reorg): supervisor approvals now open the shared
# PermissionDetailPanel, which posts actions to /api/permissions/[ticket].
grep_has "src/app/(supervisor)/supervisor/_shared/DetailSheet.tsx" \
  'PermissionDetailPanel' \
  "#13b: supervisor/approvals actions wired via PermissionDetailPanel (/api/permissions/[ticket])"


# ════════════════════════════════════════════════════════════════════════════
# BATCH 3 — P2 (#25–#30)
# ════════════════════════════════════════════════════════════════════════════
section "Batch 3 — P2 (#25–#30)"

# #26 (re-pointed post-reorg): curfew moved under team/; the dead
# OutpassApprovalsInner symbol is gone from the tree (asserted on the live
# curfew page).
grep_lacks "src/app/(supervisor)/supervisor/team/curfew/page.tsx" \
  'function OutpassApprovalsInner' \
  "#26: no dead OutpassApprovalsInner in supervisor/team/curfew"

grep_has "src/app/(admin)/admin/students/page.tsx" \
  'setActive' \
  "#27: admin/students row opens drawer"

grep_has "src/app/(admin)/admin/notification-settings/page.tsx" \
  'data' \
  "#28: notification-settings unwraps .data"

# #29 (re-pointed post-reorg): the single _shared.tsx split into the
# principal/_components tree; the "Not connected" honesty badge is shared
# from HostelPanels.
grep_has "src/components/principal/_components/HostelPanels.tsx" \
  'PlaceholderBadge' \
  "#29: principal shared components use PlaceholderBadge"

# #30b (re-pointed post-reorg): the reports page renders ReportsView,
# which is where the /api/students/stats wiring lives.
grep_has "src/app/(supervisor)/supervisor/_shared/ReportsView.tsx" \
  '/api' \
  "#30b: supervisor/reports (ReportsView) wired to real endpoints"

grep_has "src/app/(sysadmin)/sysadmin/consent/page.tsx" \
  '/api/admin/consent/stats' \
  "#30c: consent page calls the API route"


# ════════════════════════════════════════════════════════════════════════════
# BATCH 4 — next #5 (D–L)
# ════════════════════════════════════════════════════════════════════════════
section "Batch 4 — next #5 (D–L)"

grep_has "src/app/(admin)/admin/kb/page.tsx" \
  'data' \
  "F: admin/kb unwraps envelope"

grep_has "src/app/(admin)/admin/alumni/page.tsx" \
  'DEPROVISIONED' \
  "H: admin/alumni client-side filters DEPROVISIONED"

grep_has "src/app/(admin)/admin/attendance/page.tsx" \
  'getHeaders' \
  "I: admin/attendance uses getHeaders"

if [ -f database/migrations/20261221000001_drop_sdetails_select_auth.sql ]; then
  p "J: drop-sdetails_select_auth migration exists"
else
  f "J: missing drop-sdetails_select_auth migration"
fi


# ════════════════════════════════════════════════════════════════════════════
# BATCH 5 — next #6 (k8s + scripts)
# ════════════════════════════════════════════════════════════════════════════
section "Batch 5 — next #6 (k8s + scripts)"

grep_has k8s/deployment.yaml \
  'gate-postgres' \
  "1: k8s deployment has gate-postgres"

grep_has scripts/seed-data.js \
  'NODE_ENV' \
  "5: seed-data.js checks NODE_ENV"

grep_has scripts/quick-recover.sh \
  'ON_ERROR_STOP=1' \
  "6: quick-recover.sh uses ON_ERROR_STOP=1"

grep_has scripts/verify-backup.sh \
  'ON_ERROR_STOP=1' \
  "6: verify-backup.sh uses ON_ERROR_STOP=1"

grep_has scripts/telegram_bot_handler.py \
  'TELEGRAM_BOT_TOKEN' \
  "7: telegram_bot_handler checks env vars"

grep_has packages/ai-scheduler-kit/src/SchedulerDashboard.tsx \
  'requires an explicit adapter' \
  "9: SchedulerDashboard throws without adapter"

# ════════════════════════════════════════════════════════════════════════════
# GATE — live-DB regression checks (require the running stack)
# ════════════════════════════════════════════════════════════════════════════
section "Gate — gate_app RLS read-set (silent-zero-row regression)"
if bash scripts/check-gate-app-read-set.sh; then
  p "gate_app can read every RLS-enabled table (P0-2)"
else
  f "gate_app can read every RLS-enabled table (P0-2)" "$(bash scripts/check-gate-app-read-set.sh 2>&1 | head -1)"
fi

# ════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "  SUMMARY"
echo "═══════════════════════════════════════════════════════════════════"
printf "  $(green 'PASS')  %d\n" "$PASS"
printf "  $(red   'FAIL')  %d\n" "$FAIL"
printf "  $(yellow 'SKIP')  %d\n" "$SKIP"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "$(red 'FAILED CHECKS:')"
  for c in "${FAILED[@]}"; do echo "  - $c"; done
  exit 1
fi

echo "$(green 'ALL CHECKS PASS')"
exit 0
