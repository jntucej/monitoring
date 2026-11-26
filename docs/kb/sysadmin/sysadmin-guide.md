# System Administrator Guide
Sysadmins have full access to database backups, RLS policies, audit logs, and user role management.
- Database operations use `src/lib/postgres.ts` (`query<T>` / `withTransaction` with `app.current_user_id` GUC for RLS); elevated system operations run via `postgres` / `withSystemTransaction` where explicitly authorized.
- Cache invalidation: All upserts or deletes in API handlers must invoke `await invalidateCache('pattern:*')`.
- MFA enrollment secret (`MFA_ENROLL_SECRET`) is mandatory in production for break-glass sysadmin 2FA bootstrap.
