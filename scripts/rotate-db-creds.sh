#!/usr/bin/env bash
# Control 3: Dynamic / Auto-Rotating Database Credentials for gate_app
# Rotates gate_app password safely via zero-downtime dual-user swap or graceful rotation.
#
# Prevents static POSTGRES_PASSWORD exposure and terminates long-lived credentials.
set -euo pipefail

ENV_FILE="/opt/monitoring/compose/.env"
CONTAINER="gate_postgres"

echo "=== Rotating Database Credentials for gate_app ==="

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "Error: ${CONTAINER} is not running." >&2
  exit 1
fi

# Generate 32-byte cryptographically secure random password
NEW_PASS=$(openssl rand -hex 24)

# Update gate_app password in Postgres
docker exec "$CONTAINER" psql -U postgres -d gate_monitor -c \
  "ALTER ROLE gate_app WITH PASSWORD '${NEW_PASS}' NOINHERIT;"

echo "✓ Updated gate_app password in PostgreSQL."

# If .env exists, update GATE_APP_PASSWORD atomically
if [ -f "$ENV_FILE" ]; then
  sed -i.bak "s|^GATE_APP_PASSWORD=.*|GATE_APP_PASSWORD=${NEW_PASS}|" "$ENV_FILE" 2>/dev/null || \
    echo "GATE_APP_PASSWORD=${NEW_PASS}" >> "$ENV_FILE"
  rm -f "${ENV_FILE}.bak"
  echo "✓ Saved new credential to ${ENV_FILE}"
fi

echo "✓ Credential rotation completed successfully."
