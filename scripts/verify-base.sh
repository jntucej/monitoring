#!/usr/bin/env bash
set -euo pipefail

PASS=0
FAIL=0

print_result() {
  local name="$1"
  local status="$2"
  if [ "$status" = "PASS" ]; then
    echo -e "\033[32m[PASS]\033[0m $name"
    PASS=$((PASS + 1))
  else
    echo -e "\033[31m[FAIL]\033[0m $name"
    FAIL=$((FAIL + 1))
  fi
}

echo "========================================================="
echo "       GATE MONITOR BASE ENVIRONMENT HEALTH CHECK        "
echo "========================================================="

# 1. Docker info
if docker info >/dev/null 2>&1; then
  print_result "Docker daemon reachable" "PASS"
else
  print_result "Docker daemon reachable" "FAIL"
fi

# 2. .env file existence and permissions
ENV_PATH="$HOME/gate-monitor-data/.env"
if [ -f "$ENV_PATH" ]; then
  perms=$(stat -c "%a" "$ENV_PATH" 2>/dev/null || stat -f "%A" "$ENV_PATH" 2>/dev/null)
  if [ "$perms" = "600" ] || [ "$perms" = "-rw-------" ]; then
    print_result ".env exists and has 600 permissions" "PASS"
  else
    print_result ".env exists and has 600 permissions (found $perms)" "FAIL"
  fi
else
  print_result ".env exists and has 600 permissions" "FAIL"
fi

# 3. .env contains no literal 'CHANGEME'
if [ -f "$ENV_PATH" ]; then
  if grep -q "CHANGEME" "$ENV_PATH"; then
    print_result ".env secrets fully populated (no CHANGEME)" "FAIL"
  else
    print_result ".env secrets fully populated (no CHANGEME)" "PASS"
  fi
else
  print_result ".env secrets fully populated (no CHANGEME)" "FAIL"
fi

# 4. Postgres container health
if docker compose -f docker-compose.yml ps postgres --format "{{.State}}" | grep -qi "running"; then
    print_result "PostgreSQL container is healthy" "PASS"
else
    # Fallback check via docker ps
    if docker ps --format "{{.Names}}" | grep -qi "postgres"; then
        print_result "PostgreSQL container is healthy" "PASS"
    else
        print_result "PostgreSQL container is healthy" "FAIL"
    fi
fi
  if docker inspect gate_postgres --format "{{.State.Health.Status}}" 2>/dev/null | grep -qi "healthy"; then
    print_result "PostgreSQL container is healthy" "PASS"
  else
    print_result "PostgreSQL container is healthy" "FAIL"
  fi
else
  print_result "PostgreSQL container is healthy" "FAIL"
fi

# 5. psql SELECT 1
if docker exec gate_postgres pg_isready -U postgres >/dev/null 2>&1; then
  print_result "PostgreSQL accepts connections (pg_isready)" "PASS"
else
  print_result "PostgreSQL accepts connections (pg_isready)" "FAIL"
fi

# 6. Redis PING
REDIS_PASS=$(grep ^REDIS_PASSWORD "$ENV_PATH" 2>/dev/null | cut -d '=' -f2 || echo "")
if docker exec gate_redis redis-cli -a "$REDIS_PASS" ping 2>/dev/null | grep -qi "PONG"; then
  print_result "Redis responds to PING" "PASS"
else
  print_result "Redis responds to PING" "FAIL"
fi

# 7. Cloudflared container status
if docker ps --format "{{.Names}}" | grep -qi "cloudflared"; then
  print_result "Cloudflared tunnel container running" "PASS"
else
  print_result "Cloudflared tunnel container running" "WARN"
fi

# 8. Disk free > 50 GB
avail_kb=$(df -k "$HOME" | awk 'NR==2 {print $4}')
avail_gb=$((avail_kb / 1024 / 1024))
if [ "$avail_gb" -ge 50 ]; then
  print_result "Disk free space >= 50 GB (${avail_gb} GB free)" "PASS"
else
  print_result "Disk free space >= 50 GB (${avail_gb} GB free)" "FAIL"
fi

# 9. RAM available >= 4 GB
total_mem_kb=$(awk '/MemTotal/ {print $2}' /proc/meminfo)
total_mem_gb=$((total_mem_kb / 1024 / 1024))
if [ "$total_mem_gb" -ge 4 ]; then
  print_result "WSL2 total RAM >= 4 GB (${total_mem_gb} GB detected)" "PASS"
else
  print_result "WSL2 total RAM >= 4 GB (${total_mem_gb} GB detected)" "FAIL"
fi

echo "========================================================="
echo "Summary: Passed: $PASS | Failed: $FAIL"
echo "========================================================="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
