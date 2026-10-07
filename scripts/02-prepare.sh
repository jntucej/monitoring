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

echo "==> 4. Provisioning Docker Network & Volumes..."
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
