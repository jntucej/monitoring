# System Administrator Guide
Sysadmins have full access to database backups, RLS policies, audit logs, and user role management.
- Database operations requiring elevated privileges must use the service role client (`getSupabaseServiceClient()`) to bypass RLS securely.
- Cache invalidation: All upserts or deletes in API handlers must invoke `await invalidateCache('pattern:*')`.
- MFA enrollment secret (`MFA_ENROLL_SECRET`) is mandatory in production for break-glass sysadmin 2FA bootstrap.
