# Disaster Recovery & High Availability Runbook

## Overview
This runbook provides step-by-step procedures for disaster recovery, database restoration, and high availability failover for the Gate Monitor campus security platform.

---

## 1. Automated Backup Verification
- Backups are dumped in JSON format with integrity checksums.
- Automatic daily verification runs simulate staging database restoration, schema validation, and foreign key constraint checks.
- Verification status is logged to audit logs and visible at `/sysadmin/backup`.

### Manual Trigger:
```bash
curl -X POST https://your-domain.com/api/admin/backup/verify \
  -H "Authorization: Bearer <SYSADMIN_TOKEN>"
```

---

## 2. Emergency Backup Restoration Procedure
In the event of database corruption or data loss:

1. **Step 1: Quarantining Traffic**
   Enable maintenance mode via feature flag or WAF rule to block incoming write requests.

2. **Step 2: Retrieve Target Backup Snapshot**
   Locate the target JSON backup file from `/sysadmin/backup` or S3 storage.

3. **Step 3: Trigger Restore API**
   ```bash
   curl -X POST https://your-domain.com/api/admin/backup \
     -H "Authorization: Bearer <SYSADMIN_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{
       "action": "restore",
       "truncate": true,
       "backupData": <BACKUP_JSON_PAYLOAD>
     }'
   ```

4. **Step 4: Re-Index & Cache Warmup**
   Re-apply database indexes:
   ```sql
   \i supabase/migrations/20260907000000_phase4_performance_indexes.sql
   ```
   Clear Redis/Memory cache to ensure fresh state:
   ```bash
   curl -X POST https://your-domain.com/api/admin/retention/run
   ```

5. **Step 5: Operational Verification**
   Execute `/api/health` and `/api/gate/devices` pings to confirm all gate turnstiles and microservices are operating normally.

---

## 3. Multi-Region Failover (Read Replicas)
- If primary DB experiences latency spikes, `getReadOnlyClient()` automatically redirects GET queries to `SUPABASE_READ_REPLICA_URL`.
- Verify replica lag via `/api/health` monitoring endpoints.
