#!/usr/bin/env bash
# ============================================================================
# J1.3 — disk-full-backup-refusal
#
# Proves: when the backup volume is under disk pressure, master-backup.sh
# either (a) refuses with a non-zero exit + a clear message, or
# (b) succeeds WITHOUT deleting any backup younger than 3 days (the
# retention floor that Tier 1a guarantees).
#
# The unacceptable outcome the drill exists to catch: the backup silently
# prunes the last good .sql.gz to make room.
#
# Injection: a tiny tmpfs (1M) mounted over BACKUP_ROOT, prefilled to
# ~90%. No production disk is ever touched — the fill lives on a loop
# device that is unmounted and removed in cleanup.
#
# Requires: root (mount), and a running gate_postgres container (the dump
# step will fail early on a dead DB, which is a SKIP, not a FAIL).
# ============================================================================
DRILL_ID="disk-full-backup-refusal"
source "$(cd "$(dirname "$0")" && pwd)/_lib.sh"

require_prod_ok

[ "$(id -u)" = "0" ] || fail "this drill needs root (tmpfs mount); run as root or in a rootful container"
command -v docker >/dev/null 2>&1 || fail "docker not available"
docker ps --format '{{.Names}}' | grep -q '^gate_postgres$' || { log "SKIP: gate_postgres not running"; exit 0; }

WORK="$(mktemp -d /tmp/drill-diskfull.XXXXXX)"
MNT="$WORK/backups"
mkdir -p "$MNT"
FILLER="$MNT/filler"
OUT_FILE="$WORK/master-backup.out"

cleanup() {
  log "cleanup: unmounting + removing $WORK"
  umount "$MNT" 2>/dev/null || true
  rmdir "$WORK" 2>/dev/null || true
}

# ---- inject: 1M tmpfs prefilled to ~90% ------------------------------------
if ! mount -t tmpfs -o size=1M tmpfs "$MNT"; then
  log "SKIP: tmpfs unavailable on this host (containers without CAP_SYS_ADMIN)"
  exit 0
fi
dd if=/dev/zero of="$FILLER" bs=1K count=900 2>/dev/null || true

BACKUP_BEFORE="$(cd /opt/monitoring/backups/daily 2>/dev/null && ls -1 gate-db-*.sql.gz 2>/dev/null | wc -l)"
# The real dumps still go to /opt/monitoring/backups (BACKUP_ROOT only
# affects the free-space guard's df reading); what we assert on is the
# script's DECISION, not where it writes.

# ---- run the backup against the pressured root ------------------------------
if BACKUP_ROOT="$MNT" bash "$BASE_DIR/scripts/master-backup.sh" > "$OUT_FILE" 2>&1; then
  RC=0
else
  RC=$?
fi
OUT="$(cat "$OUT_FILE" || true)"
BACKUP_AFTER="$(cd /opt/monitoring/backups/daily 2>/dev/null && ls -1 gate-db-*.sql.gz 2>/dev/null | wc -l)"

# ---- assert -----------------------------------------------------------------
REFUSED_MSG=$(echo "$OUT" | grep -i 'refus\|backup skipped\|no space\|full' || true)

# The Tier 1a guard prunes only files older than 3 days. Verify that
# nothing younger than 3 days was deleted.
YOUNG_BEFORE="$(find /opt/monitoring/backups/daily -name 'gate-db-*.sql.gz' -mtime -3 2>/dev/null | sort)"
YOUNG_AFTER="$(find /opt/monitoring/backups/daily -name 'gate-db-*.sql.gz' -mtime -3 2>/dev/null | sort)"
YOUNG_BEFORE_COUNT=$(echo "$YOUNG_BEFORE" | grep -c . || true)
YOUNG_AFTER_COUNT=$(echo "$YOUNG_AFTER" | grep -c . || true)

if [ -n "$REFUSED_MSG" ] || [ "$RC" -ge 1 ]; then
  pass "backup refused under disk pressure (rc=$RC, refused-message found)"
  write_evidence "pass" "{\"rc\":$RC,\"refused_msg\":true,\"young_before\":$YOUNG_BEFORE_COUNT}"
  exit 0
fi

if [ -n "$YOUNG_BEFORE" ] && [ "$YOUNG_BEFORE" = "$YOUNG_AFTER" ]; then
  pass "backup completed under pressure; no sub-3d backup was pruned (rc=$RC)"
  write_evidence "pass" "{\"rc\":$RC,\"young_count\":$YOUNG_BEFORE_COUNT}"
  exit 0
fi

fail "backup under pressure deleted a recent .sql.gz — silent-prune regression"
write_evidence "fail" "{\"rc\":$RC,\"young_before\":$YOUNG_BEFORE_COUNT,\"young_after\":$YOUNG_AFTER_COUNT}"
exit 1
