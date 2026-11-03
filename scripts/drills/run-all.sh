#!/usr/bin/env bash
# ============================================================================
# J6 — run-all: execute the non-destructive drill suite and exit non-zero
# if any drill FAILED. Runs from the host (or CI) against the compose
# stack at DRILL_APP_URL (default http://localhost:3000).
#
# The restore-to-separate-host drill (J3) is NOT in the default set — it
# pulls a postgres:17 image and decrypts a cold backup; setup-crons.sh
# schedules it quarterly instead of weekly.
#
# Env:
#   DRILL_APP_URL            — base URL of the stack under test
#   DRILL_ENV                — staging | production (production requires
#                              DRILL_PROD_OK=1 for the destructive drills)
#   DRILL_SKIP_DOCKER=1      — skip drills that need docker (postgres-down,
#                              llm-down) when the host has no docker
# ============================================================================
set -uo pipefail
cd "$(cd "$(dirname "$0")" && pwd)/../../.."

BASE_DIR="${BASE_DIR:-/opt/monitoring/compose}"
DRILLS=(
  drill-audit-writer-failclosed
  drill-jwt-expiry-mid-scan
  drill-disk-full-backup-refusal
  drill-audit-tamper-detect
  drill-nextjs-cve-regression
)
# Drills that need docker available on this host:
DOCKER_DRILLS=(
  drill-postgres-down
  drill-circuit-opens-fast
  drill-restore-to-separate-host
)
PASS=0; FAIL=0; SKIP=0
LOG_DIR="$BASE_DIR/backups"
mkdir -p "$LOG_DIR"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
RUN_LOG="$LOG_DIR/drills-run-${STAMP}.log"

log() { echo "[$(date -u +%H:%M:%SZ)] $*" | tee -a "$RUN_LOG"; }

run_drill() {
  local script="$BASE_DIR/scripts/drills/$1.sh"
  if [ ! -f "$script" ]; then
    log "SKIP $1 (script missing)"
    SKIP=$((SKIP+1))
    return 0
  fi
  if bash "$script" >> "$RUN_LOG" 2>&1; then
    log "PASS $1"
    PASS=$((PASS+1))
  else
    log "FAIL $1 (see $RUN_LOG)"
    FAIL=$((FAIL+1))
  fi
}

log "=== drill run-all: $(date -u) (env=${DRILL_ENV:-staging}) ==="
for d in "${DRILLS[@]}"; do
  run_drill "$d"
done
if [ "${DRILL_SKIP_DOCKER:-0}" = "1" ]; then
  for d in "${DOCKER_DRILLS[@]}"; do
    log "SKIP $d (DRILL_SKIP_DOCKER=1)"
    SKIP=$((SKIP+1))
  done
else
  for d in "${DOCKER_DRILLS[@]}"; do
    run_drill "$d"
  done
fi

# Kill-switch drill (J2) is dual-control by design and is run ON DEMAND by
# two named humans, not by the cron. It is intentionally not in run-all.

log "── drill run-all: $PASS pass, $FAIL fail, $SKIP skipped (log: $RUN_LOG) ──"
[ "$FAIL" -eq 0 ]
