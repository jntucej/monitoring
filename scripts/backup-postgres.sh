#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="${BASE_DIR:-/opt/monitoring}"
BACKUP_DIR="${BASE_DIR}/backups/daily"
TIMESTAMP=$(date +"%Y-%m-%d_%H%M")
BACKUP_FILE="${BACKUP_DIR}/gate-${TIMESTAMP}.sql.gz"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

mkdir -p "${BACKUP_DIR}"

echo "==> [Backup] Starting PostgreSQL backup for gate_monitor..."

if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^gate_postgres$"; then
  docker exec -t gate_postgres pg_dump -U postgres -d gate_monitor | gzip > "${BACKUP_FILE}"
else
  echo "Container gate_postgres not running, checking DATABASE_URL..."
  if [ -n "${DATABASE_URL:-}" ]; then
    pg_dump "${DATABASE_URL}" | gzip > "${BACKUP_FILE}"
  fi
fi

if [ -f "${BACKUP_FILE}" ]; then
  FILE_SIZE=$(wc -c < "${BACKUP_FILE}" 2>/dev/null || stat -c%s "${BACKUP_FILE}" 2>/dev/null || echo "N/A")
  echo "✅ [Backup] Backup successful: ${BACKUP_FILE} (${FILE_SIZE} bytes)."
fi

echo "==> [Retention] Purging backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "gate-*.sql.gz" -type f -mtime +"${RETENTION_DAYS}" -delete 2>/dev/null || true
echo "✅ [Retention] Clean completed."
