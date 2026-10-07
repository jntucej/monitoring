#!/usr/bin/env bash
set -euo pipefail

echo "================================================================="
echo "🔍 GATE MONITOR SYSTEM DISCOVERY AUDIT (READ-ONLY)"
echo "================================================================="

echo "--- 1. Operating System & Kernel ---"
if [ -f /etc/os-release ]; then
  . /etc/os-release
  echo "OS: ${PRETTY_NAME:-$ID}"
fi
echo "Kernel: $(uname -srm)"
echo "Uptime: $(uptime -p 2>/dev/null || uptime)"

echo -e "\n--- 2. Hardware Resources ---"
CPU_CORES=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo "Unknown")
echo "CPU Cores: ${CPU_CORES}"
if command -v free >/dev/null 2>&1; then
  free -h
fi
echo "Disk Usage:"
df -h / /opt 2>/dev/null || df -h .

echo -e "\n--- 3. Container Runtimes ---"
if command -v docker >/dev/null 2>&1; then
  echo "Docker: $(docker --version)"
  echo "Docker Compose: $(docker compose version 2>/dev/null || docker-compose --version 2>/dev/null || echo 'Not installed')"
  echo "Docker Daemon Running: $(docker info >/dev/null 2>&1 && echo 'YES' || echo 'NO')"
else
  echo "Docker: NOT INSTALLED"
fi

echo -e "\n--- 4. Network & Port Bindings ---"
echo "Listening Ports (80, 443, 3000, 5432, 6379):"
if command -v ss >/dev/null 2>&1; then
  ss -tulpn | grep -E ':(80|443|3000|5432|6379)\b' || echo "No conflicting ports open."
elif command -v lsof >/dev/null 2>&1; then
  lsof -i :80 -i :443 -i :3000 -i :5432 -i :6379 2>/dev/null || echo "No conflicting ports open."
fi

echo -e "\n================================================================="
echo "✅ DISCOVERY AUDIT COMPLETE"
echo "================================================================="
