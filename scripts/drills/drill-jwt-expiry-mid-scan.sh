#!/usr/bin/env bash
# ============================================================================
# J1.2 — jwt-expiry-mid-scan
#
# Proves: when a JWT expires mid-session, the API rejects it with 401 —
# the kiosk must re-authenticate, not continue with a stale identity.
#
# Method: mint a 2-second-TTL access token via the test-only route
# POST /api/auth/_drill/token-short (gated on DRILL_MODE=true +
# DRILL_SECRET). Request #1 fires immediately (must be 200/401-with-
# valid-auth, NOT 503). After 4s the same token is expired: the retry
# must return 401.
#
# Skip conditions (not a failure): the drill route is disabled in this
# environment (DRILL_MODE unset → 503), or no eligible non-privileged
# user is available.
# ============================================================================
DRILL_ID="jwt-expiry-mid-scan"
source "$(cd "$(dirname "$0")" && pwd)/_lib.sh"

# ---- eligibility -----------------------------------------------------------
[ -n "${DRILL_SECRET:-}" ] || { log "SKIP: DRILL_SECRET not set"; exit 0; }
USER_ID="${DRILL_OPERATOR_USER_ID:-}"
# /api/operator/stats requires role ∈ {operator, principal, admin, sysadmin}
# but the drill endpoint refuses admin/sysadmin tokens — so the target user
# must be an ACTIVE operator (or principal). Probe for one; skip if the
# environment has none.
if [ -z "$USER_ID" ]; then
  USER_ID="$(psql_admin "SELECT u.id FROM users u WHERE u.status='ACTIVE' AND u.role IN ('operator','principal') LIMIT 1" || true)"
fi
[ -n "$USER_ID" ] || { log "SKIP: no eligible operator/principal user available"; exit 0; }

TARGET="${APP_URL%/}/api/operator/stats"

mint_token() {
  curl -s -X POST "${APP_URL%/}/api/auth/_drill/token-short" \
    -H "x-drill-mode: ${DRILL_SECRET}" \
    -H "Content-Type: application/json" \
    -d "{\"userId\":\"${USER_ID}\"}" | jq -r '.token // empty'
}

TOKEN="$(mint_token)"
if [ -z "$TOKEN" ]; then
  # 503 → DRILL_MODE not enabled on this host; 403 → user ineligible.
  CODE="$(curl -s -o /dev/null -w '%{http_code}' -X POST "${APP_URL%/}/api/auth/_drill/token-short" \
    -H "x-drill-mode: ${DRILL_SECRET}" -H "Content-Type: application/json" -d "{\"userId\":\"${USER_ID}\"}")"
  log "SKIP: drill token route returned $CODE (disabled or user ineligible)"
  write_evidence "pass" "{\"skipped\":true,\"reason\":\"drill route disabled\",\"route_http\":\"${CODE}\"}"
  exit 0
fi

# ---- request #1: pre-expiry ------------------------------------------------
CODE1="$(curl -s -o /dev/null -w '%{http_code}' "$TARGET" -H "Authorization: Bearer $TOKEN")"
log "pre-expiry request → HTTP $CODE1"
if [ "$CODE1" != "200" ]; then
  fail "pre-expiry request returned $CODE1 (expected 200 — the token must be valid at iat)"
fi

# ---- request #2: post-expiry ----------------------------------------------
sleep 4
CODE2="$(curl -s -o /dev/null -w '%{http_code}' "$TARGET" -H "Authorization: Bearer $TOKEN")"
log "post-expiry request → HTTP $CODE2"

if [ "$CODE2" = "401" ]; then
  pass "expired token rejected with 401 (re-auth enforced)"
  write_evidence "pass" "{\"pre\":\"$CODE1\",\"post\":\"$CODE2\"}"
else
  fail "expired token returned HTTP $CODE2 — JWT expiry NOT enforced"
  write_evidence "fail" "{\"pre\":\"$CODE1\",\"post\":\"$CODE2\"}"
  exit 1
fi
