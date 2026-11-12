#!/usr/bin/env bash
# ============================================================================
# J1.1 — audit-writer-failclosed
#
# Proves: if the audit pipeline breaks mid-write, the business operation is
# REJECTED, not silently committed without an audit trail.
#
# The injection: rename audit_logs so every INSERT fails. The system has
# two audit paths that MUST be fail-closed together:
#   (a) movement_logs trigger  — trg_audit_on_movement → audit_log_entry()
#                                 (Postgres trigger; a failing INSERT aborts
#                                  the whole transaction → 500/503)
#   (b) application auditWrite — src/server/services/audit/write.ts
#                                 (JS try/catch → MUST NOT swallow)
#
# Known bug this drill is expected to catch: auditWrite() currently
# swallows insert failures (console.error and continue), so the scan
# itself succeeds even when the audit trail is down. The drill reports
# a 2xx in that case — which is exactly the FAIL-CLOSED violation the
# drill exists to catch. Fixing the drill result means making the scan
# path fail closed on audit-insert errors.
#
# Expected on a HEALTHY system: a manual-entry scan POST returns 5xx
# (or 409) while the table is renamed; it MUST NOT return 2xx.
#
# Cleanup is mandatory: restore the table name even on failure.
# ============================================================================
DRILL_ID="audit-writer-failclosed"
source "$(cd "$(dirname "$0")" && pwd)/_lib.sh"

require_prod_ok

# ---- pre-flight -----------------------------------------------------------
# A user who is actually eligible for manual entry, so that any 4xx/5xx
# the assertion sees is attributable to the DB/trigger failure and not to
# an unrelated validation error (unknown roll, wrong gate, …).
PERSON_ID="$(psql_admin "SELECT u.id FROM users u WHERE u.role='student' AND u.status='ACTIVE' LIMIT 1" || true)"
ROLL="$(psql_admin "SELECT u.unique_id FROM users u WHERE u.id='${PERSON_ID:-}' LIMIT 1" || true)"
if [ -z "$ROLL" ]; then
  log "No active student available; falling back to any user row."
  ROLL="$(psql_admin "SELECT u.unique_id FROM users u WHERE u.role='student' LIMIT 1" || true)"
fi
[ -n "$ROLL" ] || fail "cannot identify a student roll number for the probe"

OPERATOR_TOKEN="${DRILL_OPERATOR_TOKEN:-}"
[ -n "$OPERATOR_TOKEN" ] || fail "DRILL_OPERATOR_TOKEN not set — need an operator (gate-bound) Bearer token"

ORIG_TABLE_EXISTS="$(psql_admin "SELECT count(*) FROM pg_class WHERE relname='audit_logs' AND relnamespace='public'::regnamespace")"
[ "$ORIG_TABLE_EXISTS" = "1" ] || fail "audit_logs does not exist in public — nothing to drill"

# ---- inject ----------------------------------------------------------------
log "Injecting: ALTER TABLE public.audit_logs RENAME TO audit_logs_drill_bak"
cleanup() {
  log "Restoring audit_logs table name…"
  psql_admin "ALTER TABLE IF EXISTS public.audit_logs_drill_bak RENAME TO audit_logs" 2>/dev/null || true
}
# Fires on ANY exit (INT TERM HUP QUIT ABRT included) so a SIGKILL'd or
# interrupted drill cannot leave audit_logs renamed.
trap cleanup EXIT INT TERM HUP QUIT ABRT

if ! psql_admin "ALTER TABLE public.audit_logs RENAME TO audit_logs_drill_bak"; then
  fail "could not rename audit_logs (db admin access broken?)"
fi

# ---- probe -----------------------------------------------------------------
log "Probing POST /api/operator/manual-entry (roll=$ROLL, direction=IN, reason=drill)"
RESP_FILE="$(mktemp)"
HTTP_CODE="$(curl -s -o "$RESP_FILE" -w '%{http_code}' -X POST \
  "${APP_URL%/}/api/operator/manual-entry" \
  -H "Authorization: Bearer ${OPERATOR_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Origin: ${APP_URL}" \
  -d "{\"roll\":\"${ROLL}\",\"direction\":\"IN\",\"reason\":\"drill-audit-failclosed\"}" || true)"

RESP_BODY="$(cat "$RESP_FILE" 2>/dev/null || true)"
rm -f "$RESP_FILE"

# ---- rollback BEFORE the verdict (table must be restored either way) -------
log "Cleaning up: renaming audit_logs back"
psql_admin "ALTER TABLE public.audit_logs_drill_bak RENAME TO audit_logs" || fail "cleanup rename failed"

case "$HTTP_CODE" in
  5*|409)
    pass "write rejected with HTTP $HTTP_CODE while audit table was missing"
    write_evidence "pass" "{\"http_code\":\"${HTTP_CODE}\",\"roll\":\"${ROLL}\",\"body_excerpt\":\"$(echo "$RESP_BODY" | head -c 200)\"}"
    ;;
  2*)
    fail "write SUCCEEDED (HTTP $HTTP_CODE) without an audit table — FAIL-CLOSED VIOLATED (auditWrite swallows the error)"
    write_evidence "fail" "{\"http_code\":\"${HTTP_CODE}\",\"roll\":\"${ROLL}\",\"note\":\"mutation committed with audit table missing; see src/server/services/audit/write.ts\"}"
    exit 1
    ;;
  400|401|403|422|429)
    fail "unexpected HTTP $HTTP_CODE — probe did not reach the audit-failure path; check operator token / CSRF / rate limit"
    write_evidence "fail" "{\"http_code\":\"${HTTP_CODE}\",\"body_excerpt\":\"$(echo "$RESP_BODY" | head -c 200)\"}"
    exit 1
    ;;
  *)
    fail "unexpected HTTP $HTTP_CODE"
    write_evidence "fail" "{\"http_code\":\"${HTTP_CODE}\"}"
    exit 1
    ;;
esac
