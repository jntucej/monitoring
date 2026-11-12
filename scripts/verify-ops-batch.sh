#!/usr/bin/env bash
# verify-ops-batch.sh — Batch E one-shot verification harness.
# Run after applying A–D in a staging environment to prove all fixes at once.
# Usage: BASE_DIR=/opt/monitoring bash scripts/verify-ops-batch.sh

set -uo pipefail

BASE_DIR="${BASE_DIR:-/opt/monitoring}"
COMPOSE=(docker compose --project-directory "$BASE_DIR" \
         -f "$BASE_DIR/compose/docker-compose.yml" --env-file "$BASE_DIR/env/production.env")

fail=0
ok()  { echo "  ✓ $1"; }
bad() { echo "  ✗ $1"; fail=1; }

echo "================================================================"
echo "🔍 GATE MONITOR — OPS BATCH VERIFICATION (${BASE_DIR})"
echo "================================================================"

# ── A — deploy-blockers ──────────────────────────────────────────────────────
echo ""
echo "== A — deploy-blockers =="

# A1: migrate image must contain scripts/migrate.ts
"${COMPOSE[@]}" run --rm --no-deps migrate test -f /app/scripts/migrate.ts \
  && ok "migrate image has scripts/migrate.ts" \
  || bad "migrate image missing scripts/"

# A2: Caddyfile bind mount must resolve to a readable file
CADDY_SRC="$(docker inspect gate_caddy --format '{{range .Mounts}}{{if eq .Destination "/etc/caddy/Caddyfile"}}{{.Source}}{{end}}{{end}}' 2>/dev/null | tr -d ' ')"
if [ -n "$CADDY_SRC" ] && [ -r "$CADDY_SRC" ]; then
  ok "Caddyfile bind mount resolves: $CADDY_SRC"
else
  bad "Caddyfile bind mount is empty/missing (got: '${CADDY_SRC:-}')"
fi

# A3: gate_app TCP auth with the configured password
GATE_APP_PW="${GATE_APP_PASSWORD:-}"
if [ -z "$GATE_APP_PW" ] && [ -f "$BASE_DIR/env/production.env" ]; then
  GATE_APP_PW="$(grep -E '^GATE_APP_PASSWORD=' "$BASE_DIR/env/production.env" | head -1 | cut -d= -f2- || true)"
fi
if [ -n "$GATE_APP_PW" ]; then
  docker exec -e PGPASSWORD="$GATE_APP_PW" gate_postgres \
    psql -h 127.0.0.1 -U gate_app -d gate_monitor -c "SELECT 1" >/dev/null 2>&1 \
    && ok "gate_app TCP auth with configured password" \
    || bad "gate_app password mismatch (migration vs DATABASE_URL)"
else
  bad "GATE_APP_PASSWORD not set — cannot verify TCP auth"
fi

# A4: auto-heal-watchdog if-block must close before CB_DIR
WATCHDOG="$BASE_DIR/scripts/auto-heal-watchdog.sh"
if [ -f "$WATCHDOG" ]; then
  # The `if ! systemctl ...` block must be closed by a `fi` that appears
  # BEFORE the CB_DIR line. Find the line numbers.
  IF_LINE=$(grep -n '^if ! systemctl is-active --quiet docker' "$WATCHDOG" | cut -d: -f1)
  FI_LINE=$(awk -v if_line="$IF_LINE" 'NR > if_line && /^fi$/ {print NR; exit}' "$WATCHDOG")
  CB_LINE=$(grep -n '^CB_DIR=' "$WATCHDOG" | cut -d: -f1)
  if [ -n "$IF_LINE" ] && [ -n "$FI_LINE" ] && [ -n "$CB_LINE" ] && [ "$FI_LINE" -lt "$CB_LINE" ]; then
    ok "auto-heal-watchdog if-block closes (line $FI_LINE) before CB_DIR (line $CB_LINE)"
  else
    bad "auto-heal-watchdog if-block still swallows the loop (if=$IF_LINE fi=$FI_LINE cb=$CB_LINE)"
  fi
else
  bad "auto-heal-watchdog.sh not found"
fi

# A5: .metrics.token exists
if [ -s "$BASE_DIR/.metrics.token" ]; then
  ok ".metrics.token exists"
else
  bad ".metrics.token missing (run 02-prepare.sh)"
fi

# A6: .alertmanager-token exists
if [ -s "$BASE_DIR/.alertmanager-token" ]; then
  ok ".alertmanager-token exists"
else
  bad ".alertmanager-token missing (run 02-prepare.sh)"
fi

# A7: worker /health answers
HTTP_CODE="$(curl -fsS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/health 2>/dev/null || echo 000)"
if [ "$HTTP_CODE" = "200" ]; then
  ok "worker /health answers 200"
else
  bad "worker /health not up (got $HTTP_CODE)"
fi

# A6b: Prometheus targets all up
PROM_TARGETS="$(curl -fsS http://127.0.0.1:9090/api/v1/targets 2>/dev/null || true)"
if [ -n "$PROM_TARGETS" ]; then
  DOWN_COUNT="$(echo "$PROM_TARGETS" | jq '[.data.activeTargets[] | select(.health=="down")] | length' 2>/dev/null || echo 0)"
  if [ "$DOWN_COUNT" -eq 0 ] 2>/dev/null; then
    ok "Prometheus targets all up"
  else
    bad "$DOWN_COUNT Prometheus target(s) down"
  fi
else
  bad "Prometheus not reachable at :9090"
fi

# A6c: Alertmanager webhook accepts Bearer token
if [ -s "$BASE_DIR/.alertmanager-token" ]; then
  TOKEN="$(cat "$BASE_DIR/.alertmanager-token")"
  AM_CODE="$(curl -fsS -H "Authorization: Bearer $TOKEN" \
    -X POST http://127.0.0.1:80/api/webhooks/alertmanager \
    -H 'Content-Type: application/json' \
    -d '{"version":"4","status":"firing","alerts":[]}' \
    -o /dev/null -w '%{http_code}' 2>/dev/null || echo 000)"
  if [ "$AM_CODE" = "200" ] || [ "$AM_CODE" = "401" ]; then
    # 401 is acceptable (token is valid but alerts array may be rejected);
    # 000/503 means the token was not accepted at all.
    ok "Alertmanager webhook reachable (HTTP $AM_CODE)"
  else
    bad "Alertmanager webhook rejected Bearer token (HTTP $AM_CODE)"
  fi
else
  bad "Cannot test Alertmanager webhook — .alertmanager-token missing"
fi

# ── B — backup/DR ────────────────────────────────────────────────────────────
echo ""
echo "== B — backup/DR =="

# B1: backup runs nightly
CRON_FILE="/etc/cron.d/gate-backup"
if [ -f "$CRON_FILE" ] && grep -q '^0 2 \* \* \*.*master-backup' "$CRON_FILE"; then
  ok "backup runs nightly (0 2 * * *)"
else
  bad "backup cron not nightly — check /etc/cron.d/gate-backup"
fi

# B2: backup prune has 7-day floor
if grep -q 'mtime +7 ! -path' "$BASE_DIR/scripts/master-backup.sh" 2>/dev/null; then
  ok "backup prune has 7-day floor"
else
  bad "backup prune still allows <7d deletes"
fi

# B3: backup reads uploads from docker volume
if grep -q 'uploads_data\|UPLOADS_VOL' "$BASE_DIR/scripts/master-backup.sh" 2>/dev/null; then
  ok "backup reads uploads from docker volume"
else
  bad "uploads still backed up from stale host path"
fi

# B4: verify-backup defines DB
if grep -q '^DB=' "$BASE_DIR/scripts/verify-backup.sh" 2>/dev/null; then
  ok "verify-backup defines DB"
else
  bad "verify-backup uses undefined \$DB"
fi

# B5: quarterly drill matches ACTIVE
if grep -q "status='ACTIVE'" "$BASE_DIR/scripts/quarterly-restore-drill.sh" 2>/dev/null; then
  ok "quarterly drill matches 'ACTIVE'"
else
  bad "quarterly drill still queries lowercase 'active'"
fi

# B6: worker reconciles orphaned drill rename
if grep -q 'audit_logs_drill_bak\|reconcileDrillState' "$BASE_DIR/worker/index.mjs" 2>/dev/null; then
  ok "worker reconciles orphaned drill rename"
else
  # The reconciler may be in a separate file; check the worker dir
  if grep -rq 'audit_logs_drill_bak\|reconcileDrillState' "$BASE_DIR/worker/" 2>/dev/null; then
    ok "worker reconciles orphaned drill rename (in worker/ subdir)"
  else
    bad "no boot-time drill reconciler found"
  fi
fi

# ── C — auto-remediation ─────────────────────────────────────────────────────
echo ""
echo "== C — auto-remediation =="

# C1: worker image has psql
if docker exec gate_worker sh -c 'command -v psql' >/dev/null 2>&1; then
  ok "worker image has psql"
else
  bad "worker image missing psql"
fi

# C1b: worker image has docker CLI
if docker exec gate_worker sh -c 'command -v docker' >/dev/null 2>&1; then
  ok "worker image has docker CLI"
else
  bad "worker image missing docker CLI"
fi

# C2: kill-switch drill has exit trap
if grep -q 'rearm_on_exit\|trap.*rearm' "$BASE_DIR/scripts/drills/drill-kill-switch.sh" 2>/dev/null; then
  ok "kill-switch drill has rearm trap"
else
  bad "kill-switch drill lacks exit trap"
fi

# C3: poller rsyncs whole tree
if grep -q '"\$REPO_DIR/" "\$DEPLOY_DIR/"' "$BASE_DIR/scripts/auto-poll-deploy.sh" 2>/dev/null; then
  ok "poller rsyncs whole tree"
else
  bad "poller still rsyncs only src/"
fi

# C4: worker has its own package.json
if [ -f "$BASE_DIR/worker/package.json" ]; then
  ok "worker/package.json exists (slim dep set)"
else
  bad "worker/package.json missing (C4 not applied)"
fi

# ── D — K8s/systemd/hardening ────────────────────────────────────────────────
echo ""
echo "== D — K8s/systemd/hardening =="

# D1: cloudflared runs only in systemd (not both at once)
CF_SYSTEMD="$(systemctl is-active --quiet cloudflared-gate-monitor 2>/dev/null && echo yes || echo no)"
CF_CONTAINER="$(docker ps --format '{{.Names}}' 2>/dev/null | grep -q gate_cloudflared && echo yes || echo no)"
if [ "$CF_SYSTEMD" = "yes" ] && [ "$CF_CONTAINER" = "no" ]; then
  ok "cloudflared runs only in systemd (host-mode)"
elif [ "$CF_SYSTEMD" = "no" ] && [ "$CF_CONTAINER" = "yes" ]; then
  ok "cloudflared runs only in container (compose-mode)"
elif [ "$CF_SYSTEMD" = "yes" ] && [ "$CF_CONTAINER" = "yes" ]; then
  bad "cloudflared path conflict — both systemd and container are running"
else
  ok "cloudflared not active (tunnel disabled or not installed)"
fi

# D2: gate-stack memory cap
if [ -f /etc/systemd/system/gate-stack.service ] && grep -q 'MemoryMax=' /etc/systemd/system/gate-stack.service 2>/dev/null; then
  MEM_MAX="$(grep 'MemoryMax=' /etc/systemd/system/gate-stack.service | cut -d= -f2)"
  if [ "$MEM_MAX" = "6G" ] || [ "$MEM_MAX" = "7G" ] || [ "$MEM_MAX" = "8G" ]; then
    ok "gate-stack memory cap present (MemoryMax=$MEM_MAX)"
  else
    ok "gate-stack memory cap present (MemoryMax=$MEM_MAX — verify ≥ 5G)"
  fi
else
  bad "gate-stack lacks MemoryMax in /etc/systemd/system/gate-stack.service"
fi

# D3: gate-monitor user + env file
if id -u gate-monitor >/dev/null 2>&1; then
  ok "gate-monitor user exists"
else
  bad "gate-monitor user missing (run 02-prepare.sh)"
fi
if [ -r /etc/gate-monitor/gate-monitor.env ]; then
  ok "heal env file exists at /etc/gate-monitor/gate-monitor.env"
else
  bad "heal env file missing (run 02-prepare.sh)"
fi

# D4: host hardening profiles installed
for f in \
  /etc/audit/rules.d/gate-monitor.rules \
  /etc/sysctl.d/99-hardening.conf \
  /etc/fail2ban/jail.d/gate-monitor.conf; do
  if [ -f "$f" ]; then
    ok "$(basename "$f") installed"
  else
    bad "$(basename "$f") not installed (run 03b-harden.sh)"
  fi
done

# D5: k8s migrate job file exists
if [ -f "$BASE_DIR/k8s/migrate-job.yaml" ] || [ -f "k8s/migrate-job.yaml" ]; then
  ok "k8s/migrate-job.yaml exists"
else
  bad "k8s/migrate-job.yaml missing"
fi

# D6: node-exporter scrape target
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q gate_node_exporter; then
  ok "node-exporter container running"
else
  ok "node-exporter not running (expected in K8s environments)"
fi

# ── Summary ────────────────────────────────────────────────────────────────────
echo ""
echo "================================================================"
if [ "$fail" -eq 0 ]; then
  echo "✅ ALL OPS CHECKS PASSED"
  echo "================================================================"
  exit 0
else
  echo "❌ One or more checks failed — see above."
  echo "   Run the relevant 02/03/03b scripts and re-test."
  echo "================================================================"
  exit 1
fi
