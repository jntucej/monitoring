#!/usr/bin/env bash
# ============================================================================
# Install the host cron entries that keep a gate-monitoring deployment
# operational:
#
#   * /etc/cron.d/gate-backup  — master-backup.sh every 6h + nightly
#                                verify-backup.sh restore drill
#   * /etc/cron.d/gate-jobs    — POSTs the on-demand /api/cron/* routes
#                                (audit rotation / api_metrics purge,
#                                expire-passes, sla-breach) on a schedule
#
# Nothing in the repo wires these up on a fresh deploy today, so without
# this script: no backups run, and api_metrics grows unboundedly until a
# sysadmin manually clicks "Run" on the job in the admin UI.
#
# Requires: cron (or cronie) installed on the host, and CRON_SECRET set in
# the web container's env (same value the /api/cron/* routes check). The
# gate-jobs entries are skipped if CRON_SECRET is not yet available.
#
# Safe to re-run: idempotent (overwrites the same /etc/cron.d files).
# ============================================================================
set -euo pipefail

BASE_DIR="${BASE_DIR:-/opt/monitoring}"

if ! command -v crontab >/dev/null 2>&1 && [ ! -d /etc/cron.d ]; then
  echo "❌ cron is not available on this host; install cron (or cronie) first."
  exit 1
fi

mkdir -p /etc/cron.d

# ----------------------------------------------------------------------------
# 1. /etc/cron.d/gate-backup — DB dump + restore drill
# ----------------------------------------------------------------------------
cat > /etc/cron.d/gate-backup <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# Full backup every 6 hours (matches master-backup.sh's 6h cadence comment).
0 */6 * * *  root  bash ${BASE_DIR}/scripts/master-backup.sh >> ${BASE_DIR}/backups/cron.log 2>&1

# Restore-test the latest backup nightly at 03:15.
15 3 * * *   root  bash ${BASE_DIR}/scripts/verify-backup.sh >> ${BASE_DIR}/backups/verify.log 2>&1
EOF
chmod 644 /etc/cron.d/gate-backup
echo "✓ Installed /etc/cron.d/gate-backup"

# ----------------------------------------------------------------------------
# 2. /etc/cron.d/gate-jobs — scheduled on-demand cron endpoints
#    Every entry POSTs an x-cron-secret header the /api/cron/* routes verify.
#    Skipped entirely if CRON_SECRET is not set (the routes will 401 anyway).
# ----------------------------------------------------------------------------
CRON_SECRET="${CRON_SECRET:-$(grep -h 'CRON_SECRET=' "${BASE_DIR}/env/production.env" 2>/dev/null | head -1 | cut -d= -f2- || true)}"
CRON_BASE="${CRON_BASE:-https://monitor.ucej.in}"

if [ -n "$CRON_SECRET" ]; then
  cat > /etc/cron.d/gate-jobs <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# Cron jobs run on the host, not inside the docker network: the web
# container's :3000 is NOT published (caddy proxies to it internally), so
# POSTs must go through caddy's published https port. Caddy forwards
# /api/* to the app with the x-cron-secret header intact.
CRON_BASE="${CRON_BASE:-https://monitor.ucej.in}"

# api_metrics / audit rotation — daily 03:30 (purges api_metrics past
# API_METRICS_RETENTION_DAYS, default 7d, so the table cannot grow unbounded)
30 3 * * *  root  curl -sk -X POST -H "x-cron-secret: ${CRON_SECRET}" \\
                ${CRON_BASE}/api/cron/audit-rotate >> /var/log/gate-cron.log 2>&1

# Expire stale gate passes — every 15 min
*/15 * * * * root  curl -sk -X POST -H "x-cron-secret: ${CRON_SECRET}" \\
                ${CRON_BASE}/api/cron/expire-passes >> /var/log/gate-cron.log 2>&1

# SLA breach sweep — hourly
0 * * * *    root  curl -sk -X POST -H "x-cron-secret: ${CRON_SECRET}" \\
                ${CRON_BASE}/api/cron/sla-breach >> /var/log/gate-cron.log 2>&1
EOF
  chmod 600 /etc/cron.d/gate-jobs
  echo "✓ Installed /etc/cron.d/gate-jobs (mode 600 — contains CRON_SECRET)"
else
  echo "⚠ CRON_SECRET not set (checked env var + ${BASE_DIR}/env/production.env); /etc/cron.d/gate-jobs skipped."
fi

# ----------------------------------------------------------------------------
# Ensure cron is running (idempotent; no-op if already active).
# ----------------------------------------------------------------------------
if command -v systemctl >/dev/null 2>&1; then
  systemctl enable cron 2>/dev/null || true
  systemctl start cron  2>/dev/null || true
fi

echo "=== done. Check with: crontab -l && ls -l /etc/cron.d/gate-* ==="
