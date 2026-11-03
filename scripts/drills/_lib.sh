#!/usr/bin/env bash
# ============================================================================
# scripts/drills/_lib.sh — shared harness for security chaos drills.
#
# Design rules (cookbook: "cheap engage, expensive re-enable"):
#   - Every drill is setup → inject → assert → evidence → rollback.
#   - A drill must be safe to run twice and must undo itself on ANY exit
#     path, including SIGINT. The trap is set up here; drill scripts
#     override `cleanup` before they finish.
#   - Evidence is written as evidence/<drill>-<stamp>.json and, when
#     DRILL_EVIDENCE_KEY_FILE is set, signed with the same ed25519 key
#     used for audit-head exports. Unsigned evidence is still written;
#     signing is additive, not a gate.
#
# Never run a drill marked DRILL_ALLOW_DESTRUCTIVE=1 against production
# without DRILL_PROD_OK=1.
# ============================================================================
set -uo pipefail

BASE_DIR="${BASE_DIR:-/opt/monitoring/compose}"
DB_URL="${DATABASE_URL:-postgres://postgres:***@localhost:5432/gate_monitor}"
# Default matches the path bind-mounted read-only into the web container
# (docker-compose.yml) so /api/sysadmin/drills can see the evidence without
# any extra configuration. Override per environment.
DRILL_DIR="${DRILL_DIR:-/opt/monitoring/drills}"
mkdir -p "$DRILL_DIR/evidence"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DRILL_ID="${DRILL_ID:-unknown}"
# Hosts the drills probe: APP (web/Next), DB (Postgres). Defaults match
# the compose stack; override per environment (staging box, CI runner…).
APP_URL="${DRILL_APP_URL:-http://localhost:3000}"
DB_CONTAINER="${DRILL_DB_CONTAINER:-gate_postgres}"
PG_CONTAINER_USER="${DRILL_PG_USER:-postgres}"

log()  { echo "[$(date -u +%H:%M:%SZ)] $*"; }
fail() { echo "❌ $DRILL_ID: $*" >&2; exit 1; }
pass() { echo "✅ $DRILL_ID: $*"; }

psql_q() { psql "$DB_URL" -v ON_ERROR_STOP=1 -tAc "$1"; }
# psql against the live gate_postgres container (admin-tier operations
# like renaming a table are NOT allowed over the app credential).
psql_admin() { docker exec -i "$DB_CONTAINER" psql -U "$PG_CONTAINER_USER" -d gate_monitor -v ON_ERROR_STOP=1 -tAc "$1"; }

# Default cleanup is a no-op; drill scripts must override before exit.
cleanup() { log "cleanup: (no drill-specific override — check the script)"; }
trap 'cleanup' EXIT INT TERM

# write_evidence <status:pass|fail> <details-json-object>
write_evidence() {
  local status="$1" details="${2:-{\}}"
  local unsigned signed
  unsigned="$DRILL_DIR/evidence/${DRILL_ID}-${STAMP}.unsigned.json"
  signed="$DRILL_DIR/evidence/${DRILL_ID}-${STAMP}.json"
  cat > "$unsigned" <<EOF
{"drill":"${DRILL_ID}","stamp":"${STAMP}","status":"${status}","details":${details},"host":"$(hostname -s)"}
EOF
  if [ -n "${DRILL_EVIDENCE_KEY_FILE:-}" ] && [ -f "$DRILL_EVIDENCE_KEY_FILE" ]; then
    # ed25519 signature over the exact JSON bytes; keep .sig.b64 next to it
    # so `openssl pkeyutl -verify` (with the public key) can prove provenance.
    openssl pkeyutl -sign -inkey "$DRILL_EVIDENCE_KEY_FILE" -rawin \
      -in "$unsigned" -out "${unsigned}.sig" 2>/dev/null \
      && base64 -w0 "${unsigned}.sig" > "${unsigned}.sig.b64" \
      && printf '%s\n' "{\"sig_b64\":\"$(cat "${unsigned}.sig.b64")\"}" > "${signed}.sig" \
      && mv "$unsigned" "$signed" \
      && rm -f "${unsigned}.sig"
  else
    mv "$unsigned" "$signed"
  fi
  echo "$STAMP $DRILL_ID $status $signed" >> "$DRILL_DIR/evidence/history.log"
  # Optional Pushgateway export: gate_drill_last_success{drill="…"} = 1/0.
  if [ -n "${PUSHGATEWAY_URL:-}" ]; then
    local val=0
    [ "$status" = "pass" ] && val=1
    curl -s --data-binary @- "${PUSHGATEWAY_URL}/metrics/job/gate_drill/drill/${DRILL_ID}" <<< \
      "gate_drill_last_success{drill=\"${DRILL_ID}\"} ${val}
gate_drill_last_run_unixtime{drill=\"${DRILL_ID}\"} $(date +%s)" || true
  fi
}

# require_prod_ok: destructive drills call this; refuses unless DRILL_PROD_OK=1
# on production environments. Staging/CI run freely.
require_prod_ok() {
  local env="${DRILL_ENV:-staging}"
  if [ "$env" = "production" ] && [ "${DRILL_PROD_OK:-0}" != "1" ]; then
    echo "❌ $DRILL_ID: refusing in production without DRILL_PROD_OK=1" >&2
    exit 1
  fi
}
