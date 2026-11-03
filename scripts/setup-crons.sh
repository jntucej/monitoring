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
CRON_TELEGRAM_TOKEN="${TELEGRAM_BOT_TOKEN:-}"

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

# Full backup every hour — RPO target is 1h (RUNBOOK.md). The 6h cadence
# gave RPO of up to 6h; hourly dumps close that gap. master-backup.sh's
# free-space pre-check keeps the volume from filling up.
0 * * * *     root  bash ${BASE_DIR}/scripts/master-backup.sh >> ${BASE_DIR}/backups/cron.log 2>&1

# Restore-test the latest backup nightly at 03:15. On a non-zero exit
# (failed restore drill) notify the operator directly — a failed backup
# drill that only lands in verify.log is invisible until the next real
# restore attempt, so the failure is pushed to Telegram (when configured)
# instead of waiting for the log to be read.
15 3 * * *   root  bash -c 'LOG='${BASE_DIR}'/backups/verify.log; bash '${BASE_DIR}'/scripts/verify-backup.sh >> "$LOG" 2>&1; RC=$?; if [ $RC -ne 0 ]; then TAIL=$(tail -n 20 "$LOG" 2>/dev/null || true); MSG="⚠️ Backup restore drill FAILED (exit $RC) at $(date -Iseconds)\\nLast log lines:\\n$TAIL"; TELEGRAM_BOT_TOKEN='${CRON_TELEGRAM_TOKEN}' bash '${BASE_DIR}'/scripts/telegram-notify.sh "$MSG" 2>/dev/null || true; fi; exit $RC'

# Monthly chaos test (DR §6): Sunday 2am. Stops gate_worker + gate_web,
# confirms auto-heal restarts them, verifies the kill switch holds, then
# re-enables. Writes a status_updates row.
0 2 * * 0    root  bash ${BASE_DIR}/scripts/monthly-chaos-test.sh >> ${BASE_DIR}/backups/chaos-cron.log 2>&1

# Quarterly DR restore drill (DR §6): first Tuesday of the month at 3am.
# Restores the latest backup into a scratch DB, times it against the
# 240-min RTO target. Writes a status_updates row.
0 3 1 * 2    root  bash ${BASE_DIR}/scripts/quarterly-restore-drill.sh >> ${BASE_DIR}/backups/drill-cron.log 2>&1

# P5 §5: off-host cold backup — 3-2-1-1-0. sync-cold-backup.sh exits 2
# when no off-host destination is configured, so this cron line FAILS LOUD
# (visible in cold-cron.log + the nightly verify) instead of silently
# leaving every backup on the same disk as the DB.
30 2 * * *    root  bash ${BASE_DIR}/scripts/sync-cold-backup.sh >> ${BASE_DIR}/backups/cold-cron.log 2>&1

# Monthly readable (pg_dump + COPY) backup for the human-restorable copy.
0 4 1 * *     root  bash ${BASE_DIR}/scripts/monthly-readable-backup.sh >> ${BASE_DIR}/backups/readable-cron.log 2>&1
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

# Retention policy sweep — daily 04:30 (purges expired records per
# retention_policies table: api_metrics 30d, sessions 30d, notifications
# 90d, mess_reviews 7d, email_queue 30d. audit_logs auto_delete=FALSE,
# so it is retained — legal obligation under CERT-In Directions 2022.)
30 4 * * *    root  curl -sk -X POST -H "x-cron-secret: ${CRON_SECRET}" \
                ${CRON_BASE}/api/admin/retention/run >> /var/log/gate-cron.log 2>&1

# Alert-rule evaluation + webhook dispatch — every 5 min. Evaluates every
# enabled alert_rules row; on breach persists an alerts row and POSTs to
# every enabled endpoint in system_settings id='webhooks' (closes the
# "webhooks configured but nothing fires" gap).
*/5 * * * *   root  curl -sk -X POST -H "x-cron-secret: ${CRON_SECRET}" \
                ${CRON_BASE}/api/cron/alerts-eval >> /var/log/gate-cron.log 2>&1
EOF
  chmod 600 /etc/cron.d/gate-jobs
  echo "✓ Installed /etc/cron.d/gate-jobs (mode 600 — contains CRON_SECRET)"
else
  echo "⚠ CRON_SECRET not set (checked env var + ${BASE_DIR}/env/production.env); /etc/cron.d/gate-jobs skipped."
fi

# ----------------------------------------------------------------------------
# J6 — Security-chaos drill rotation: weekly non-destructive suite on
# staging, quarterly restore-to-separate-host drill. Destructive drills
# (audit-tamper, kill-switch) run on demand by named humans only.
# Safe on hosts without docker: set DRILL_SKIP_DOCKER=1 to skip the
# container-injection drills.
# ----------------------------------------------------------------------------
cat > /etc/cron.d/gate-drills <<EOF
# Security-chaos drills (Batch J):
#   weekly 03:00 — full non-destructive suite
#   quarterly 04:00 — restore-to-separate-host (pulls postgres:17, decrypts
#                      the latest .enc cold backup into a disposable
#                      container, validates data, records RTO)
# DRILL_ENV=staging: the production-gate inside _lib.sh refuses
# destructive drills without DRILL_PROD_OK=1, so this file is safe on
# production hosts as well (non-destructive drills still run).
0 3 * * 0    root  cd ${BASE_DIR}/compose && DRILL_ENV=staging DRILL_SKIP_DOCKER=0 \
  env \$(cat ${BASE_DIR}/compose/env/production.env 2>/dev/null | xargs) \
  bash scripts/drills/run-all.sh >> /var/log/gate-drills.log 2>&1
0 4 1 */3 *   root  cd ${BASE_DIR}/compose && DRILL_ENV=staging \
  env \$(cat ${BASE_DIR}/compose/env/production.env 2>/dev/null | xargs) \
  bash scripts/drills/drill-restore-to-separate-host.sh >> /var/log/gate-drills.log 2>&1
EOF
chmod 600 /etc/cron.d/gate-drills
echo "✓ Installed /etc/cron.d/gate-drills (mode 600)"

# ----------------------------------------------------------------------------
# Ensure cron is running (idempotent; no-op if already active).
# ----------------------------------------------------------------------------
if command -v systemctl >/dev/null 2>&1; then
  systemctl enable cron 2>/dev/null || true
  systemctl start cron  2>/dev/null || true
fi

echo "=== done. Check with: crontab -l && ls -l /etc/cron.d/gate-* ==="
