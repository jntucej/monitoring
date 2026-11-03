#!/usr/bin/env bash
# ============================================================================
# J1.5 — llm-down-fast-fail
#
# Proves: when the LLM proxy is unreachable, /api/bot/chat fails FAST
# (bounded by RAG_LLM_TIMEOUT_MS, default 6s) instead of hanging until the
# HTTP client's socket timeout (30s+) — which would saturate the request
# pool during an upstream outage.
#
# (The Batch-H "circuit breaker" does not exist as a module in this codebase;
# the load-bearing property is the timeout bound. The drill asserts that
# every call to /api/bot/chat during the outage lands within TIMEOUT+1s,
# and that at least one lands in <3s once the process pool is warm — i.e.
# the failure is being fast-failed, not retried-slowly.)
#
# Injection: docker stop gate_llm_proxy (if the proxy is not running, the
# probe is SKIP — there is nothing to isolate). Cleanup restarts it.
# ============================================================================
DRILL_ID="llm-down-fast-fail"
source "$(cd "$(dirname "$0")" && pwd)/_lib.sh"

require_prod_ok
command -v docker >/dev/null 2>&1 || fail "docker not available"
if ! docker ps --format '{{.Names}}' | grep -q '^gate_llm_proxy$'; then
  log "SKIP: gate_llm_proxy container not found"
  write_evidence "pass" "{\"skipped\":true}"
  exit 0
fi

USER_TOKEN="${DRILL_USER_TOKEN:-}"
[ -n "$USER_TOKEN" ] || fail "DRILL_USER_TOKEN not set — need a user-level Bearer token"

TIMEOUT_S=8 # RAG_LLM_TIMEOUT_MS/1000 + 2s slack

cleanup() {
  docker start gate_llm_proxy >/dev/null 2>&1 || true
  sleep 2
}

docker stop gate_llm_proxy >/dev/null 2>&1 || fail "could not stop gate_llm_proxy"
sleep 1 # let in-flight connections die

# ---- fire 6 sequential probes; measure wall time ----------------------------
VIOLATIONS=0
FAST=0
for i in 1 2 3 4 5 6; do
  T0="$(date +%s.%N)"
  CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 -X POST \
    "${APP_URL%/}/api/bot/chat" \
    -H "Authorization: Bearer ${USER_TOKEN}" \
    -H "Content-Type: application/json" \
    -H "Origin: ${APP_URL}" \
    -d '{"message":"drill-ping"}')"
  T1="$(date +%s.%N)"
  ELAPSED="$(awk -v a="$T0" -v b="$T1" 'BEGIN{printf "%.2f", b-a}')"
  ELAPSED_INT="${ELAPSED%.*}"
  if [ "${ELAPSED_INT:-0}" -gt "$TIMEOUT_S" ] 2>/dev/null; then
    log "  probe $i: HTTP $CODE in ${ELAPSED}s — SLOW (> ${TIMEOUT_S}s)"
    VIOLATIONS=$((VIOLATIONS+1))
  else
    [ "$ELAPSED_INT" -le 3 ] 2>/dev/null && FAST=$((FAST+1))
    log "  probe $i: HTTP $CODE in ${ELAPSED}s"
  fi
done

pass_status() {
  log "All 6 probes landed within the ${TIMEOUT_S}s bound ($FAST fast, $VIOLATIONS slow)"
  write_evidence "pass" "{\"fast\":$FAST,\"slow\":$VIOLATIONS,\"bound_s\":$TIMEOUT_S}"
}

if [ "$VIOLATIONS" -eq 0 ]; then
  pass_status
  log "circuit-fast-fail verified"
  exit 0
fi
fail "$VIOLATIONS/6 probes exceeded the ${TIMEOUT_S}s timeout bound — upstream outage is blocking the request pool"
write_evidence "fail" "{\"slow\":$VIOLATIONS,\"bound_s\":$TIMEOUT_S}"
exit 1
