# Runbook: `disk_free_low`

**Alert:** `disk_free_pct < 15` on the backup volume
**Severity:** warning → SEV-2 if < 5%
**Runbook URL:** /sysadmin/runbooks#disk-free-low
**Auto-response:** If free < 20%, prune backups > 7 days old (Tier 1).
                  If free < 5% after prune, escalate to Tier 3.

## What this means
The backup volume is filling. If it fills completely, backups fail and the
next disk write panics the container. Hourly dumps (RPO fix) make this
faster to hit — the free-space pre-check in master-backup.sh is the guard.

## Automated response (already in place)
1. `master-backup.sh` checks free space before each hourly run
2. If < 20%, prunes backups > 7 days old (keeps the 3-day retention floor)
3. If < 5% after prune, creates an `operator_actions` row (`request_hardware`)

## Manual steps (if auto-heal did not resolve)
```bash
# 1. Confirm the pressure
df -h /opt/monitoring/backups

# 2. Find the largest files
du -sh /opt/monitoring/backups/* | sort -rh | head -20

# 3. If a single backup is > 1 GB, re-compress it
gzip -9 /opt/monitoring/backups/gate-db-YYYY-MM-DD.sql

# 4. Delete the oldest non-floor backup (keep >= 3 days)
find /opt/monitoring/backups -name "gate-db-*.sql.gz" -mtime +14 -delete

# 5. If still full: approve the request_hardware card on /sysadmin/actions
# 6. Verify: df -h /opt/monitoring/backups — expect < 80% used
```

## Rollback
Deleted backups cannot be recovered. Re-run `bash scripts/master-backup.sh`
to create a fresh one (if disk allows).

## Escalation
- 15 min: sysadmin (Telegram)
- 1 hour: principal + Telegram emergency group
- 4 hours: emergency contact list (see RUNBOOK.md § Contacts)
