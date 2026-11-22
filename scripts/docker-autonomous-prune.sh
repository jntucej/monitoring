#!/bin/bash
# ============================================================================
# Autonomous disk maintenance — keeps root disk under control.
#
# Runs via cron: /etc/cron.d/gate-autonomous
#
# Strategy:
#   1. Check free space on root filesystem.
#   2. If below 15% free → prune dangling images + build cache + unused volumes.
#   3. Vacuum journald to stay under its 20 GB cap (external disk).
#   4. Log every action to /var/log/docker-autonomous.log.
#   5. Never touches running containers or their images.
# ============================================================================

set -euo pipefail

LOG="/var/log/docker-autonomous.log"
THRESHOLD_PCT=85   # trigger when USED space is above 85%

ts() { date '+%Y-%m-%d %H:%M:%S'; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

# ── Check free space ─────────────────────────────────────────────────────────
# df -P / returns: Filesystem 1024-blocks Used Available Capacity Mounted-on
used_pct=$(df -P / | awk 'NR==2 { print $5 }' | tr -d '%')

log "Root disk: ${used_pct}% used"

# ── Journald vacuum (always runs, keeps it under 20 GB cap) ─────────────────
journalctl --vacuum-size=15G 2>&1 | tail -1 | tee -a "$LOG"

if [ "${used_pct}" -ge "${THRESHOLD_PCT}" ]; then
  log "Above threshold (${THRESHOLD_PCT}% used). Running autonomous prune."

  # 1. Dangling images only — never touches running-container images.
  docker image prune -f 2>&1 | tail -1 | tee -a "$LOG"

  # 2. Build cache — safe, no effect on running containers.
  docker builder prune -f 2>&1 | tail -1 | tee -a "$LOG"

  # 3. Dangling volumes only — never removes named volumes in use.
  docker volume prune -f 2>&1 | tail -1 | tee -a "$LOG"

  # 4. Prune Docker container logs older than 7 days
  find /var/lib/docker/containers -name "*-json.log" -mtime +7 -delete 2>/dev/null \
    && log "Pruned container logs >7d" || true

  # 5. Re-check
  new_used_pct=$(df -P / | awk 'NR==2 { print $5 }' | tr -d '%')
  log "After prune: ${new_used_pct}% used"

  if [ "${new_used_pct}" -ge 95 ]; then
    log "WARNING: Disk still ${new_used_pct}% full after prune. Manual intervention needed."
  fi
else
  log "Below threshold. No Docker prune needed."
fi
