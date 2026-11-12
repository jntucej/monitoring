#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="${BASE_DIR:-/opt/monitoring}"

echo "================================================================="
echo "🛠️  IDEMPOTENT SERVER PREPARATION (${BASE_DIR})"
echo "================================================================="

echo "==> 1. Creating Directory Hierarchy..."
mkdir -p "${BASE_DIR}"/{compose,config,env,backups/daily,backups/weekly,logs/caddy,scripts,releases,data}

echo "==> 2. Setting Secure Directory Permissions..."
chmod 755 "${BASE_DIR}"
chmod 700 "${BASE_DIR}/env"
chmod 700 "${BASE_DIR}/backups"
chmod 755 "${BASE_DIR}/scripts"
chmod 755 "${BASE_DIR}/compose"

echo "==> 3. Creating Production Environment Placeholder if missing..."
if [ ! -f "${BASE_DIR}/env/production.env" ]; then
  if [ -f .env.example ]; then
    cp .env.example "${BASE_DIR}/env/production.env"
    chmod 600 "${BASE_DIR}/env/production.env"
    echo "Created ${BASE_DIR}/env/production.env from template."
  fi
fi

echo "==> 3b. Ensuring ${BASE_DIR}/.metrics.token exists..."
if [ ! -s "${BASE_DIR}/.metrics.token" ]; then
  _mst="${METRICS_SCRAPE_TOKEN:-}"
  if [ -z "$_mst" ] && [ -f "${BASE_DIR}/env/production.env" ]; then
    _mst="$(grep -E '^METRICS_SCRAPE_TOKEN=' "${BASE_DIR}/env/production.env" | head -1 | cut -d= -f2-)"
  fi
  if [ -z "$_mst" ]; then
    _mst="$(openssl rand -hex 32)"
    echo "METRICS_SCRAPE_TOKEN=${_mst}" >> "${BASE_DIR}/env/production.env"
  fi
  printf '%s' "$_mst" > "${BASE_DIR}/.metrics.token"
  chmod 600 "${BASE_DIR}/.metrics.token"
  echo "   Created ${BASE_DIR}/.metrics.token"
fi

echo "==> 3c. Ensuring ${BASE_DIR}/.alertmanager-token exists..."
if [ ! -s "${BASE_DIR}/.alertmanager-token" ]; then
  _at="$(openssl rand -hex 32)"
  printf '%s' "$_at" > "${BASE_DIR}/.alertmanager-token"
  chmod 600 "${BASE_DIR}/.alertmanager-token"
  grep -q '^ALERTMANAGER_WEBHOOK_TOKEN=' "${BASE_DIR}/env/production.env" 2>/dev/null \
    || echo "ALERTMANAGER_WEBHOOK_TOKEN=${_at}" >> "${BASE_DIR}/env/production.env"
  echo "   Created ${BASE_DIR}/.alertmanager-token"
fi

echo "==> 4b. Provisioning heal-service user and env file..."
if ! id -u gate-monitor >/dev/null 2>&1; then
  useradd --system --home "${BASE_DIR}" --shell /usr/sbin/nologin gate-monitor
fi
install -d -m 0750 -o root -g gate-monitor /etc/gate-monitor
if [ ! -f /etc/gate-monitor/gate-monitor.env ]; then
  cp "${BASE_DIR}/env/production.env" /etc/gate-monitor/gate-monitor.env
  chown root:gate-monitor /etc/gate-monitor/gate-monitor.env
  chmod 0640 /etc/gate-monitor/gate-monitor.env
fi

echo "==> 5. Provisioning Docker Network & Volumes..."
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  docker network create gate-net 2>/dev/null || true
  docker volume create gate_pgdata 2>/dev/null || true
  docker volume create gate_redisdata 2>/dev/null || true
  docker volume create gate_caddy_data 2>/dev/null || true
  docker volume create gate_caddy_config 2>/dev/null || true
  echo "Docker network 'gate-net' and storage volumes verified."
fi

echo "================================================================="
echo "✅ SERVER PREPARATION SUMMARY: ALL CHECKS READY"
echo "================================================================="
