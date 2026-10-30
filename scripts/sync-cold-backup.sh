#!/usr/bin/env bash
# Scenario 1 Mitigation: Off-host Cold Backup Sync & Encrypted Shipping
# Encrypts the latest PostgreSQL dump using AES-256-CBC and uploads it to
# remote off-host cold storage (S3 / Cloudflare R2 / remote SSH target)
# to survive complete single-NVMe host loss.
set -euo pipefail

BASE="/opt/monitoring"
BACKUP_DIR="${BASE}/backups/daily"
if [ ! -d "$BACKUP_DIR" ]; then
  BACKUP_DIR="${BASE}/backups-local/daily"
fi

LATEST_DUMP=$(find "${BACKUP_DIR}" -name "gate-db-*.sql.gz" -printf "%T@ %p\n" | sort -nr | head -n 1 | awk '{print $2}')

if [ -z "$LATEST_DUMP" ]; then
  echo "[cold-backup] ERROR: No daily dump found in ${BACKUP_DIR} to sync."
  exit 1
fi

ENCRYPTION_KEY="${COLD_BACKUP_ENCRYPTION_KEY:-${POSTGRES_PASSWORD:-gate_monitor_cold_vault_key}}"
ENCRYPTED_OUT="${LATEST_DUMP}.enc"

echo "[cold-backup] Encrypting ${LATEST_DUMP} with AES-256..."
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
  -in "$LATEST_DUMP" -out "$ENCRYPTED_OUT" -pass pass:"$ENCRYPTION_KEY"

echo "[cold-backup] Encrypted payload ready: $(ls -lh "$ENCRYPTED_OUT" | awk '{print $5}')"

# Remote Destination (S3 / R2 or Remote SCP / RSYNC)
if [ -n "${COLD_BACKUP_S3_BUCKET:-}" ]; then
  echo "[cold-backup] Uploading encrypted backup to S3 bucket: ${COLD_BACKUP_S3_BUCKET}..."
  if command -v aws >/dev/null 2>&1; then
    aws s3 cp "$ENCRYPTED_OUT" "s3://${COLD_BACKUP_S3_BUCKET}/backups/$(basename "$ENCRYPTED_OUT")"
    echo "[cold-backup] ✓ S3 sync completed successfully."
  else
    echo "[cold-backup] aws CLI not installed; encrypted file preserved locally."
  fi
elif [ -n "${COLD_BACKUP_REMOTE_HOST:-}" ]; then
  echo "[cold-backup] Syncing via scp to ${COLD_BACKUP_REMOTE_HOST}..."
  scp -o StrictHostKeyChecking=accept-new "$ENCRYPTED_OUT" "${COLD_BACKUP_REMOTE_HOST}:/backups/cold/"
  echo "[cold-backup] ✓ Remote scp sync completed."
else
  echo "[cold-backup] Note: Set COLD_BACKUP_S3_BUCKET or COLD_BACKUP_REMOTE_HOST to ship off-host automatically."
  echo "[cold-backup] ✓ Encrypted cold archive prepared at: ${ENCRYPTED_OUT}"
fi
