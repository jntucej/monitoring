# Gate Monitor — Phase-2 Fix Cookie Cutter Report

**Generated:** 2026-10-12T11:23:10.278Z  
**Mode:** applied  
**Summary:** 11 ok · 0 warning · 0 error

| Step | Status | Detail |
|------|--------|--------|
| 101 | ✅ | .dockerignore already hardened |
| 102 | ✅ | web uploads volume already present |
| 103 | ✅ | worker healthcheck already uses pgrep or was manually fixed |
| 104 | ✅ | watchdog schema_migrations shape already reconciled |
| 105 | ✅ | in([]) guard already present |
| 106 | ✅ | rate-limit prune already scheduled |
| 107 | ✅ | no-op banner already present |
| 108 | ✅ | sentinel-gate protection migration already exists |
| 109 | ✅ | handle lower-case index migration already exists |
| 110 | ✅ | build script already clean |
| 111 | ✅ | login_attempts compat migration already exists |

## Manual follow-ups

1. **Redis-backed rate limiting.** `rate-limiter-flexible` + a running
   Redis container are already available, but `src/lib/rate-limit.ts`
   still uses the in-memory Map. Multi-instance deployments will have
   per-replica limits until this is wired up.
2. **`getAllLogs({ personType })`** filters on a nonexistent column.
   Either remove the filter from the API surface or add a join to
   `users` in the query builder.
3. **`config_roles` vs `config_roles_registry`.** Two parallel role
   tables remain. Pick one and delete the other; update `/api/config/roles`,
   `useRoles.ts`, `/api/roles-graph`, and `20260916000000`'s policies.
4. **`20261020000000`'s `trg_reject_privileged_mfa` on `sessions`.** The
   comment in `src/lib/db.ts` says session lifecycle is owned by Supabase
   Auth and the custom sessions table functions were removed. If the
   `sessions` table is dead, this trigger is dead code; if it's still
   populated by refresh-token rotation, the trigger now blocks admin
   session creation whenever `two_factor_enabled = FALSE`.

## Verification

```bash
npm run typecheck
bash scripts/check-migrations.sh
node scripts/scaffold-fixes-2.mjs --dry-run  # idempotence check
```
