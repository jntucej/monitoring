# Runbook: Audit Log Tampering & Hash Chain Trip

## Symptoms & Detection
- Alert: `AuditChainBroken`
- Scheduled job `verify-audit-chain.sh` exits non-zero
- Notification in Telegram / Slack indicating cryptographic hash mismatch in audit sequence

## Verification
1. Run verification script manually:
   ```bash
   bash scripts/verify-audit-chain.sh
   ```
2. Identify the first broken sequence record:
   ```sql
   SELECT id, performed_at, action, actor_id, hash, prev_hash
   FROM audit_logs
   ORDER BY performed_at DESC
   LIMIT 10;
   ```

## Immediate Mitigation
1. **Quarantine Active Connections**:
   If unauthorized writes were made directly to Postgres, freeze external traffic:
   ```bash
   docker compose pause web
   ```
2. **Export Forensics**:
   Dumping state for legal / security investigation:
   ```bash
   bash scripts/master-backup.sh
   ```
3. **Database Restore**:
   Restore up to the last verified cryptographic checkpoint using:
   ```bash
   bash scripts/quick-recover.sh
   ```
