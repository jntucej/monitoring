#!/bin/bash
# Gate Monitor Watchdog - ensures containers stay running and DB stays healthy
# Run via cron every 5 minutes

set -e

COMPOSE_DIR="/opt/monitoring/compose"
LOG_FILE="/opt/monitoring/logs/gate-watchdog.log"
MIGRATIONS_DIR="$COMPOSE_DIR/supabase/migrations"
POSTGRES_CONTAINER="gate_postgres"
DATABASE="gate_monitor"
USER="postgres"

mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') $1" | tee -a "$LOG_FILE"
}

# 1. Ensure all gate containers are running
log "=== Watchdog check $(date) ==="

MISSING=$(docker compose -f "$COMPOSE_DIR/docker-compose.yml" ps --format "{{.Name}}\t{{.Status}}" 2>/dev/null | grep -v "Up" | awk '{print $1}' || true)
if [ -n "$MISSING" ]; then
    log "WARNING: Some containers not running: $MISSING"
    log "Restarting missing containers..."
    docker compose -f "$COMPOSE_DIR/docker-compose.yml" up -d --remove-orphans 2>&1 | tee -a "$LOG_FILE"
fi

# 2. Ensure DB has required roles (supabase compatibility)
log "Ensuring Supabase-compatible roles exist..."
docker exec "$POSTGRES_CONTAINER" psql -U "$USER" -d "$DATABASE" -c "
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'admin') THEN CREATE ROLE admin; END IF;
END \$\$;
GRANT USAGE ON SCHEMA public TO service_role, authenticated, anon, admin;
" 2>&1 | tee -a "$LOG_FILE"

# 3. Ensure auth.uid() function exists
log "Ensuring auth.uid() function exists..."
docker exec "$POSTGRES_CONTAINER" psql -U "$USER" -d "$DATABASE" -c "
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS 'SELECT null::uuid;' LANGUAGE sql;
" 2>&1 | tee -a "$LOG_FILE"

# 4. Check schema_migrations table exists (track which migrations ran)
log "Checking schema_migrations table..."
docker exec "$POSTGRES_CONTAINER" psql -U "$USER" -d "$DATABASE" -c "
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
" 2>&1 | tee -a "$LOG_FILE"

# 5. Replay any missed migrations (idempotent - safe to re-run)
log "Checking for missed migrations..."
MISSED_MIGRATIONS=""
for f in "$MIGRATIONS_DIR"/*.sql; do
    fname=$(basename "$f")
    ver="${fname%%_*}"
    # Skip placeholder files
    [[ "$fname" == _* ]] && continue
    # Check if already applied
    applied=$(docker exec "$POSTGRES_CONTAINER" psql -U "$USER" -d "$DATABASE" -tAc "SELECT 1 FROM schema_migrations WHERE version='$ver';" 2>/dev/null)
    if [ "$applied" != "1" ]; then
        log "  Applying missed migration: $fname"
        if docker exec -i "$POSTGRES_CONTAINER" psql -U "$USER" -d "$DATABASE" -v ON_ERROR_STOP=0 < "$f" 2>&1 | tee -a "$LOG_FILE"; then
            docker exec "$POSTGRES_CONTAINER" psql -U "$USER" -d "$DATABASE" -c "INSERT INTO schema_migrations (version) VALUES ('$ver') ON CONFLICT DO NOTHING;" 2>/dev/null
        else
            log "  WARNING: Migration $fname had errors (non-fatal, may be idempotent)"
        fi
        MISSED_MIGRATIONS="$MISSED_MIGRATIONS $fname"
    fi
done

if [ -n "$MISSED_MIGRATIONS" ]; then
    log "Replayed${MISSED_MIGRATIONS} migrations"
else
    log "All migrations up to date"
fi

# 6. Final health check
log "Final status:"
docker compose -f "$COMPOSE_DIR/docker-compose.yml" ps 2>&1 | tee -a "$LOG_FILE"
log "=== Watchdog check complete ==="
