# Warden → Principal Consolidation — Migration & Rollback Plan

Step-by-step, repeatable execution plan for the warden→principal consolidation
migration (DB + app). Full reference inventory and result records: see
`docs/quality/warden-principal-consolidation-audit.md` (the audit doc) and
`docs/quality/warden-principal-test-report.md`.

## 1. Prerequisites

- Backup the database before starting.
- Confirm exactly one user has `role='warden'` in `public.users`.
- Confirm no RLS policies reference `is_warden` / `get_warden_hostel`.
- Confirm no `hostels` or `kb_role_priority` table exists.

## 2. Execution Order

1. **Apply up-migration** `database/migrations/20261125000001_warden_principal_consolidation.sql`
   (registry deactivate; warden user → hostel_manager; exit_reasons
   approval_by → principal; `is_warden` shim; drop 'warden' from
   `users_role_check` CHECK constraint).
   - Verify: `SELECT count(*) FROM users WHERE role='warden'` = 0.
   - Verify: `config_roles_registry` warden row `is_active=false`.
   - Verify: `config_exit_reasons` `approval_by` values are only `('none','principal')`.

2. **Deploy the application code changes** (key files, per audit doc §3):
   - `src/lib/roles.ts`, `src/server/services/scan/record.ts`, `src/lib/db.ts`,
     `src/lib/authContext.ts`, `src/lib/alert-hierarchy.ts`
   - `src/components/admin/ExitReasonsManager.tsx`
   - `src/app/api/config/exit-reasons/route.ts`
   - `src/app/api/users/route.ts`
   - `src/app/api/warden/hostel-scope/route.ts`
   - `src/components/sysadmin/UserRolesPanel.tsx`
   - 11 `/warden` approver pages → `redirect("/principal")`; 19 principal
     pages + approver layout with 'warden' removed from `AuthGuard` allowlists
   - `tests/pass-approval.spec.ts`, `tests/admin-admin-test.spec.ts`,
     `tests/admin-admin-overview.spec.ts`
   - `scripts/seed-all.sql`, `scripts/seed-roles.js`,
     `scripts/provision-role-accounts.mts`

3. **Run static / unit / layering checks:**
   - `npx tsc --noEmit` → 0 errors
   - `npm run test:unit` → 92 passed
   - `node scripts/verify-layering.js` → OK

4. **Redeploy production:**
   - `cd /opt/monitoring/compose && docker compose up -d web worker`
   - Compose project is "compose". Do NOT use /root/monitoring docker project
     "monitoring" — separate tree.
   - Restart after schema change.

5. **Post-deploy smoke:**
   - Log in as the re-assigned `hostel_manager` account.
   - Hit `/api/warden/hostel-scope` — expect 200; `requestingUser` reflects the
     principal / `deputy_warden` set.
   - Confirm `/principal` panels render.
   - Confirm `/warden/*` URLs redirect to `/principal`.

## 3. Rollback Plan (explicit)

- Run `database/migrations/20261125000001_warden_principal_consolidation.down.sql`.
- Re-activate the `warden` row in `public.config_roles_registry`
  (`is_active=true`).
- Restore 'warden' to the `users_role_check` CHECK constraint.
- Restore the warden user's role to 'warden'. The down migration reassigns the
  1 `hostel_manager` user that originated from warden — **safe only if no new
  `hostel_manager` users were created after the up-migration**.
- Redeploy the previous application build.

> Warning: if the up-migration has been in production and principal has
> processed approvals, rollback of those approval rows is NOT covered by the
> down migration.

## 4. Validation Matrix

| # | Check | Command / Endpoint | Expected Result | Pass/Fail |
|---|-------|--------------------|-----------------|-----------|
| 1 | No warden users remain | `SELECT count(*) FROM users WHERE role='warden'` | 0 | |
| 2 | Registry warden deactivated | `config_roles_registry` warden row | `is_active=false` | |
| 3 | Exit reasons reconciled | `config_exit_reasons.approval_by` values | only `('none','principal')` | |
| 4 | Types | `npx tsc --noEmit` | 0 errors | |
| 5 | Unit tests | `npm run test:unit` | "92 PASSED, 0 FAILED", exit 0 | |
| 6 | Layering | `node scripts/verify-layering.js` | "OK: no layering violations." | |
| 7 | Production up | `docker compose up -d web worker` | services running | |
| 8 | Hostel-scope API | `GET /api/warden/hostel-scope` as hostel_manager | 200; `requestingUser` reflects principal / deputy_warden set | |
| 9 | Principal panels | browse `/principal` | panels render | |
| 10 | Warden redirects | browse any `/warden/*` URL | redirects to `/principal` | |
