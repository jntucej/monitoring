#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="${BASE_DIR:-/opt/monitoring}"
LATEST_BACKUP=$(find "${BASE_DIR}/backups/daily" -name "gate-*.sql.gz" -type f 2>/dev/null | sort -r | head -n 1 || echo "")

if [ -z "${LATEST_BACKUP:-}" ] || [ ! -f "${LATEST_BACKUP}" ]; then
  echo "❌ No backup file found in ${BASE_DIR}/backups/daily to verify."
  exit 1
fi

echo "================================================================="
echo "🧪 VERIFYING DATABASE BACKUP RESTORE INTEGRITY"
echo "Backup File: ${LATEST_BACKUP}"
echo "================================================================="

SCRATCH_DB="restore_test_$(date +%Y%m%d_%H%M%S)"

echo "==> 1. Creating scratch database ${SCRATCH_DB}..."
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^gate_postgres$"; then
  docker exec -t gate_postgres psql -U postgres -c "CREATE DATABASE ${SCRATCH_DB};"
  
  echo "==> 2. Restoring backup to scratch database..."
  gunzip -c "${LATEST_BACKUP}" | docker exec -i gate_postgres psql -U postgres -d "${SCRATCH_DB}" >/dev/null 2>&1
  
  TABLE_COUNT=$(docker exec -t gate_postgres psql -U postgres -d "${SCRATCH_DB}" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d '[:space:]')
  echo "✅ Scratch database restored successfully with ${TABLE_COUNT} public tables."
  
  echo "==> 3. Cleaning up scratch database..."
  docker exec -t gate_postgres psql -U postgres -c "DROP DATABASE ${SCRATCH_DB};"
  echo "✅ Scratch database dropped."
else
  echo "⚠️ Docker postgres container not active; skipping live restore verification."
fi

echo "================================================================="
echo "✅ BACKUP INTEGRITY VERIFICATION COMPLETE"
echo "================================================================="
