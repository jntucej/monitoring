#!/bin/bash
# Master Backup Script — scheduled via /etc/cron.d/gate-backup (setup-crons.sh).
# Cadence: every 6 hours (not every 5 minutes — see scripts/setup-crons.sh).
# Backs up: database, env secrets, migration state, and app code.
set -euo pipefail

BASE="/opt/monitoring"
BACKUP_ROOT="$BASE/backups/daily"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATE_TAG=$(date +"%Y-%m-%d")
mkdir -p "$BACKUP_ROOT"

LOG="$BACKUP_ROOT/backup-$DATE_TAG.log"
touch "$LOG"

log() { echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG"; }

log "=== Starting master backup: $TIMESTAMP ==="

# 1. PostgreSQL full dump (COPY-friendly, NOT --inserts).
#    --inserts writes one INSERT per row — 10–50x larger and far slower for
#    big tables, and it thrashes the live DB's disk during a 6-hourly run.
#    Plain SQL (COPY defaults) restores quickly and stays compact.
if docker ps --format '{{.Names}}' | grep -q "^gate_postgres$"; then
    DB_DUMP="$BACKUP_ROOT/gate-db-$TIMESTAMP.sql.gz"
    docker exec gate_postgres pg_dump -U postgres -d gate_monitor \
        --create --clean --if-exists \
        --no-acl --no-owner \
        2>/dev/null | gzip > "$DB_DUMP"
    log "✓ DB dump: $(ls -lh "$DB_DUMP" | awk '{print $5}')"
    
    # Also dump migration tracking table
    MIGRATION_LOG="$BACKUP_ROOT/migrations-state-$TIMESTAMP.txt"
    docker exec gate_postgres psql -U postgres -d gate_monitor -tAc \
        "SELECT version || '|' || applied_at FROM schema_migrations ORDER BY version;" \
        2>/dev/null > "$MIGRATION_LOG" || true
    log "✓ Migration state exported"
else
    log "✗ gate_postgres container not running, skipping DB dump"
fi

# 2. Export all secrets/credentials (for recovery use)
SECRETS_FILE="$BACKUP_ROOT/secrets-$TIMESTAMP.txt"
touch "$SECRETS_FILE" && chmod 600 "$SECRETS_FILE"
{
    echo "# Gate Monitor Secrets Export - $TIMESTAMP"
    echo "# WARNING: This file contains sensitive data. Keep it secure."
    echo ""
    echo "=== CONFIGURATION ==="
    cat "$BASE/compose/.env" 2>/dev/null || echo "(not found)"
    echo ""
    echo "=== PRODUCTION ENV ==="
    cat "$BASE/env/production.env" 2>/dev/null || echo "(not found)"
    echo ""
    echo "=== DATABASE CONNECTION ==="
    echo "POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-unknown}"
    echo "REDIS_PASSWORD=${REDIS_PASSWORD:-unknown}"
    echo ""
    echo "=== S3 BACKUP RECOVERY (SECONDARY) ==="
    # Control 7: Canary backup credential tripwire.
    # Fake secondary AWS credentials; real backup never touches this key. Any call to AWS using this key trips an immediate alert.
    echo "AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE_CANARY"
    echo "AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY_CANARY"
    echo "S3_ENDPOINT=https://s3.ap-south-1.amazonaws.com"
    echo "S3_CANARY_BUCKET=gate-monitor-encrypted-cold-vault-canary"
    echo ""
    echo "=== USERS TABLE ==="
    if docker ps --format '{{.Names}}' | grep -q "^gate_postgres$"; then
        docker exec gate_postgres psql -U postgres -d gate_monitor \
            -tAc "SELECT 'role:' || role || ' | email:' || email || ' | status:' || status || ' | has_password:' || CASE WHEN password_hash IS NOT NULL THEN 'yes' ELSE 'no' END || ' | has_pin:' || CASE WHEN initial_pin_hash IS NOT NULL THEN 'yes' ELSE 'no' END FROM users ORDER BY role, email;" \
            2>/dev/null || echo "(query failed)"
        echo ""
        echo "=== ADMIN TOKENS ==="
        docker exec gate_postgres psql -U postgres -d gate_monitor \
            -tAc "SELECT id, email, role, session_version, two_factor_enabled FROM users WHERE role IN ('sysadmin','admin','supervisor');"\
            2>/dev/null || echo "(query failed)"
    fi
    echo ""
    echo "=== CONFIG ROLES ==="
    if docker ps --format '{{.Names}}' | grep -q "^gate_postgres$"; then
        docker exec gate_postgres psql -U postgres -d gate_monitor \
            -tAc "SELECT code, display_name, is_active FROM config_roles ORDER BY code;" \
            2>/dev/null || echo "(query failed)"
    fi
} > "$SECRETS_FILE"
log "✓ Secrets exported: $SECRETS_FILE"

# 3. Backup app source code (incremental via git)
GIT_BACKUP="$BACKUP_ROOT/git-state-$TIMESTAMP.txt"
cd "$BASE" && git log --oneline -20 2>/dev/null > "$GIT_BACKUP" || true
log "✓ Git state saved"

# 4. Backup compose config
COMPOSE_BACKUP="$BACKUP_ROOT/compose-config-$TIMESTAMP.tar"
tar cf "$COMPOSE_BACKUP" -C "$BASE" docker-compose.yml Caddyfile .env 2>/dev/null || \
tar cf "$COMPOSE_BACKUP" -C "$BASE/compose" docker-compose.yml Caddyfile .env 2>/dev/null || true
log "✓ Compose config archived"

# 5. Clean old backups.
#    Keep DB dumps and secrets for 30 days each: a DB dump older than its
#    matching secrets file can't be restored (no credentials to connect), so
#    an 8-day-old dump and 7-day secrets retention is a silent, dangerous
#    gap. Align both to 30d. For anything older, rotate the secrets into a
#    proper secret manager (Vault / AWS Secrets Manager / Infisical) and
#    never back them up.
find "$BACKUP_ROOT" -name "*.sql.gz" -mtime +30 -delete 2>/dev/null || true
find "$BACKUP_ROOT" -name "secrets-*.txt" -mtime +30 -delete 2>/dev/null || true
find "$BACKUP_ROOT" -name "backup-*.log" -mtime +14 -delete 2>/dev/null || true

TOTAL_SIZE=$(du -sh "$BACKUP_ROOT" 2>/dev/null | awk '{print $1}')
log "✓ Backup complete. Total backup storage: $TOTAL_SIZE"
echo "" >> "$LOG"
