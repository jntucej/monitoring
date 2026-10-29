#!/bin/bash
# monthly-readable-backup.sh — Monthly human-readable backup (plain SQL + CSVs)
set -uo pipefail

BACKUP_ROOT="/mnt/external-logs/gate-monitor/monthly"
mkdir -p "$BACKUP_ROOT"
TIMESTAMP=$(date +%Y-%m)
TARGET_DIR="$BACKUP_ROOT/$TIMESTAMP"
mkdir -p "$TARGET_DIR"

echo "[$(date -Iseconds)] Starting monthly readable backup for $TIMESTAMP..."

# 1. Plain SQL dump
docker exec gate_postgres pg_dump -U postgres -d gate_monitor --format=plain --inserts > "$TARGET_DIR/monthly-$TIMESTAMP.sql"

# 2. Key CSVs for human/legal review
docker exec gate_postgres psql -U postgres -d gate_monitor -c "\copy (SELECT id, unique_id, name, role, email, status, created_at FROM users) TO STDOUT WITH CSV HEADER" > "$TARGET_DIR/users.csv"
docker exec gate_postgres psql -U postgres -d gate_monitor -c "\copy (SELECT * FROM student_details) TO STDOUT WITH CSV HEADER" > "$TARGET_DIR/student_details.csv"
docker exec gate_postgres psql -U postgres -d gate_monitor -c "\copy (SELECT * FROM employee_details) TO STDOUT WITH CSV HEADER" > "$TARGET_DIR/employee_details.csv"
docker exec gate_postgres psql -U postgres -d gate_monitor -c "\copy (SELECT user_id, action, ip_address, timestamp FROM audit_logs ORDER BY timestamp DESC LIMIT 50000) TO STDOUT WITH CSV HEADER" > "$TARGET_DIR/audit_logs_last50k.csv"

# 3. Readme & Checksums
cat << README > "$TARGET_DIR/BACKUP-README.txt"
Gate Monitor Monthly Readable Backup
Date: $(date -Iseconds)
Period: $TIMESTAMP
Contents:
- monthly-$TIMESTAMP.sql (Plain SQL text dump)
- users.csv (User registry)
- student_details.csv (Student records)
- employee_details.csv (Employee records)
- audit_logs_last50k.csv (Recent audit logs)
README

cd "$TARGET_DIR" && sha256sum * > checksums.sha256

echo "[$(date -Iseconds)] Monthly readable backup completed at $TARGET_DIR"
