# U10 — S3 Offsite Backup Setup

**Status:** Implemented & unit-tested; **disabled by default** (`OFFSITE_S3_ENABLED` unset).

## Required Environment Variables (Worker)

Add to `/opt/monitoring/compose/.env` (mode `600`, never committed) when AWS/S3 credentials are provisioned:

```env
OFFSITE_S3_ENABLED=1
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
# Optional for S3-compatible stores (Cloudflare R2 / MinIO):
# S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
```

## Database Policy Configuration

Enable offsite upload on a `public.backup_policies` row:

```sql
UPDATE public.backup_policies
   SET offsite_enabled = true,
       offsite_bucket  = 'your-backup-bucket',
       offsite_prefix  = 'gate-monitor/backups'
 WHERE name = 'daily-postgres';
```

## Behavior

- When `OFFSITE_S3_ENABLED !== "1"` or credentials are absent, `uploadBackupToS3()` returns `{ uploaded: false, reason }` without failing the local backup cycle.
- When enabled, uploads use `ServerSideEncryption: "AES256"` and attach `Metadata.sha256`.
