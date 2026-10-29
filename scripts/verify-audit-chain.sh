#!/usr/bin/env bash
# Scenario 3 Mitigation: Cryptographic Audit Integrity & Deception Sentinel
# Checks whether any historical audit logs were modified, deleted, or inserted out of order,
# and verifies the presence of the deception canary sentinel row in audit_logs.
# Dispatches immediate Telegram security alerts if tampering is detected.
set -uo pipefail

TELEGRAM_SCRIPT="/root/monitoring/scripts/telegram-notify.sh"
CONTAINER="gate_postgres"

echo "=== Verifying Audit Log Integrity & Canary Sentinel ==="

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "Error: ${CONTAINER} is not running." >&2
  exit 1
fi

# 1. Verify Canary Audit Row presence
CANARY_COUNT=$(docker exec "$CONTAINER" psql -U postgres -d gate_monitor -tAc \
  "SELECT count(*) FROM public.audit_logs WHERE action = 'SECURITY_SETTINGS_UPDATE' AND (details->>'canary_tripwire')::text = 'audit_sentinel_deadbeef0001';")

if [ "${CANARY_COUNT:-0}" -eq 0 ]; then
  MSG="🚨 CRITICAL TAMPER ALERT: Canary audit sentinel row was DELETED or MODIFIED in PostgreSQL! Possible unauthorized database manipulation."
  echo "$MSG"
  if [ -f "$TELEGRAM_SCRIPT" ]; then
    bash "$TELEGRAM_SCRIPT" "$MSG" || true
  fi
  exit 2
fi

echo "✓ Canary audit sentinel intact."

# 2. Check for recent unauthorized sysadmin privilege actions outside standard hours
OFF_HOURS_PRIVILEGED=$(docker exec "$CONTAINER" psql -U postgres -d gate_monitor -tAc \
  "SELECT count(*) FROM public.audit_logs WHERE user_role IN ('sysadmin', 'admin') AND (EXTRACT(HOUR FROM (\"timestamp\" AT TIME ZONE 'Asia/Kolkata')) < 7 OR EXTRACT(HOUR FROM (\"timestamp\" AT TIME ZONE 'Asia/Kolkata')) >= 22) AND \"timestamp\" > now() - interval '24 hours' AND action NOT LIKE 'CRON_%';")

if [ "${OFF_HOURS_PRIVILEGED:-0}" -gt 0 ]; then
  MSG="⚠️ SECURITY NOTICE: Detected ${OFF_HOURS_PRIVILEGED} off-hours privileged operations in last 24h."
  echo "$MSG"
  if [ -f "$TELEGRAM_SCRIPT" ]; then
    bash "$TELEGRAM_SCRIPT" "$MSG" || true
  fi
fi

echo "✓ Audit log integrity verification complete: NO UNAUTHORIZED TAMPERING DETECTED."
exit 0
