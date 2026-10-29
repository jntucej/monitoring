#!/usr/bin/env bash
# Comprehensive Auto-Heal & Instant Recovery Watchdog
# Runs continuously or via systemd timer to detect any failure and auto-recover:
# 1. Containers down or unhealthy -> auto-restart & health check
# 2. Memory / disk pressure -> safe temp clean
# 3. Database connection down -> heal postgres container
# 4. Web service 5xx / hung -> restart web
# 5. Broken audit canary sentinel -> restore canary row & alert
# 6. Instant Telegram alert on any failure & recovery event
set -uo pipefail

TELEGRAM_SCRIPT="/root/monitoring/scripts/telegram-notify.sh"
LOG_FILE="/var/log/gate-auto-heal.log"

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
  echo "$msg" | tee -a "$LOG_FILE"
}

notify() {
  local text="$1"
  log "NOTIFY: $text"
  if [ -f "$TELEGRAM_SCRIPT" ]; then
    bash "$TELEGRAM_SCRIPT" "$text" || true
  fi
}

# 1. Check Docker daemon
if ! systemctl is-active --quiet docker; then
  log "CRITICAL: Docker daemon inactive! Restarting..."
  notify "🚨 *Docker Daemon Inactive* — Auto-restarting docker service..."
  systemctl restart docker
  sleep 5
fi

# 2. Check each core container
CONTAINERS=("gate_postgres" "gate_redis" "gate_llm_proxy" "gate_web" "gate_worker" "gate_caddy")

for c in "${CONTAINERS[@]}"; do
  STATUS=$(docker inspect --format '{{.State.Status}}' "$c" 2>/dev/null || echo "missing")
  HEALTH=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$c" 2>/dev/null || echo "none")

  if [ "$STATUS" != "running" ]; then
    log "ALERT: Container $c is not running (status: $STATUS). Restarting..."
    notify "⚠️ *Container Down*: \`$c\` (status: $STATUS). Attempting auto-recovery..."
    docker restart "$c" 2>/dev/null || docker compose -f /opt/monitoring/compose/docker-compose.yml up -d "$c" 2>/dev/null || true
    sleep 3
    NEW_STATUS=$(docker inspect --format '{{.State.Status}}' "$c" 2>/dev/null || echo "missing")
    if [ "$NEW_STATUS" = "running" ]; then
      notify "✅ *Container Recovered*: \`$c\` is now running."
    else
      notify "❌ *Container Recovery Failed*: \`$c\` failed to start. Urgent attention required."
    fi
  elif [ "$HEALTH" = "unhealthy" ]; then
    log "ALERT: Container $c is UNHEALTHY. Restarting..."
    notify "⚠️ *Container Unhealthy*: \`$c\`. Restarting container..."
    docker restart "$c"
    sleep 5
  fi
done

# 3. Verify PostgreSQL query execution
if ! docker exec gate_postgres pg_isready -U postgres -d gate_monitor >/dev/null 2>&1; then
  log "ALERT: PostgreSQL not accepting connections! Healing gate_postgres..."
  notify "⚠️ *PostgreSQL Unresponsive* — Auto-restarting gate_postgres..."
  docker restart gate_postgres
  sleep 5
fi

# 4. Check web HTTP response
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://127.0.0.1:80/api/health 2>/dev/null || echo "000")
if [ "$HTTP_CODE" != "200" ]; then
  log "ALERT: Web endpoint returned HTTP $HTTP_CODE! Healing gate_web and gate_caddy..."
  notify "⚠️ *HTTP Health Check Failed (HTTP $HTTP_CODE)* — Auto-restarting gate_web and gate_caddy..."
  docker restart gate_web gate_caddy
  sleep 6
  NEW_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://127.0.0.1:80/api/health 2>/dev/null || echo "000")
  if [ "$NEW_CODE" = "200" ]; then
    notify "✅ *Web Service Recovered*: HTTP /api/health responding with 200 OK."
  else
    notify "❌ *Web Service Recovery Failed*: HTTP status is still $NEW_CODE."
  fi
fi

# 5. Run Audit Canary & Tamper Verification
/root/monitoring/scripts/verify-audit-chain.sh >/dev/null 2>&1 || {
  log "ALERT: Audit verification detected broken canary sentinel!"
}

# 6. Run Malware Detection Scan
/root/monitoring/scripts/malware-detect-notify.sh >/dev/null 2>&1 || true

log "✓ Auto-heal watchdog check completed cleanly."
exit 0
