#!/bin/bash
# Quick recovery: restore DB from latest backup
set -euo pipefail

BASE="/opt/monitoring"
BACKUP_ROOT="$BASE/backups/daily"

echo "=== Gate Monitor Recovery Tool ==="
echo ""

# Find latest DB backup
LATEST=$(ls -t "$BACKUP_ROOT"/gate-db-*.sql.gz 2>/dev/null | head -1)
if [ -z "$LATEST" ]; then
    echo "ERROR: No database backup found in $BACKUP_ROOT"
    echo "Run master-backup.sh first to create one."
    exit 1
fi

echo "Latest backup: $LATEST ($(ls -lh "$LATEST" | awk '{print $5}'))"
echo ""

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^gate_postgres$"; then
    echo "Starting gate_postgres..."
    cd "$BASE/compose" && docker compose up -d postgres redis 2>&1 | tail -3
    echo "Waiting for DB to be healthy..."
    for i in $(seq 1 30); do
        if docker exec gate_postgres pg_isready -U postgres -d gate_monitor 2>/dev/null; then
            break
        fi
        sleep 2
    done
fi

echo "Restoring database from backup..."
zcat "$LATEST" | docker exec -i gate_postgres psql -U postgres -v ON_ERROR_STOP=1 2>&1

echo ""
echo "Running migrations to ensure completeness..."
cd "$BASE/compose" && bash scripts/gate-watchdog.sh 2>&1 | tail -5

echo ""
echo "=== Recovery complete ==="
echo "Backup used: $(basename "$LATEST")"
echo ""
echo "Next steps:"
echo "  1. Check secrets file: $(ls -t $BACKUP_ROOT/secrets-*.txt 2>/dev/null | head -1)"
echo "  2. Verify login at: http://$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
echo "  3. Run seed scripts to recreate demo users if needed"
