# Warden → Principal Consolidation — Audit & Migration Record

The "warden" role was permanently removed. Its hostel-management responsibilities were
consolidated into the "principal" role, which already rendered all these panels under
`src/app/(approver)/principal/`. This document is the reference inventory, migration
plan, and test report for the consolidation.

## 1. Original Warden References (Inventory)

| # | Area | Identifier / Reference | File | Action Taken |
|---|------|------------------------|------|--------------|
| 1 | Roles config | `WARDEN` entry in `ROLES` | `src/lib/roles.ts` | Removed |
| 2 | Scan service | `OVERRIDING_ROLES = ["admin","sysadmin","warden"]` | `src/server/services/scan/record.ts` | Now `["admin","sysadmin","principal"]` |
| 3 | DB constants | `GATE_OPERATOR_ROLES` (contained 'warden') | `src/lib/db.ts` | Now `['operator','supervisor']` (dropped 'warden') |
| 4 | Auth context | student-access allowlist contained 'warden' | `src/lib/authContext.ts` | Now `['admin','sysadmin','principal']` |
| 5 | Alert hierarchy | alert id `warden.overdue` | `src/lib/alert-hierarchy.ts` | Renamed to `principal.overdue` |
| 6 | Exit reasons manager | `APPROVAL_TARGETS` contained 'warden' | `src/components/admin/ExitReasonsManager.tsx` | Dropped 'warden' |
| 7 | Exit-reasons API | two description strings 'warden approved pass' | `src/app/api/config/exit-reasons/route.ts` | Now 'principal approved pass' |
| 8 | Users API | `VALID_ROLES` + staff-employee insert list contained 'warden' | `src/app/api/users/route.ts` | Dropped 'warden' |
| 9 | Warden hostel-scope API | two SQL role-IN lists 'warden' | `src/app/api/warden/hostel-scope/route.ts` | Now 'principal'; comments updated |
| 10 | User roles panel | `ALL_ROLES` contained 'warden' | `src/components/sysadmin/UserRolesPanel.tsx` | Dropped 'warden' |
| 11 | Warden approver pages (11 files) | `src/app/(approver)/warden/**` | `src/app/(approver)/warden/**` | Each page now does `next/navigation` `redirect("/principal")`; `layout.tsx` is a pass-through |
| 12 | Principal pages (19) + approver layout + hostel permissions | 'warden' in `AuthGuard allowedRoles` | `src/app/(approver)/principal/*.tsx`, `src/app/(approver)/layout.tsx`, `hostel/permissions/page.tsx` | Removed 'warden' from allowlists |
| 13 | Pass-approval test | `x-user-role` = 'warden' | `tests/pass-approval.spec.ts` | Now 'principal' |
| 14 | Admin admin tests | `waitForURL` regex 'warden' | `tests/admin-admin-test.spec.ts`, `tests/admin-admin-overview.spec.ts` | Now 'principal' |
| 15 | Seed SQL | demo WARDEN user role 'warden'; config_roles 'warden' row `is_active=true` | `scripts/seed-all.sql` | Role now 'hostel_manager'; warden row `is_active=false` |
| 16 | Seed roles JS | 'warden' seed entry | `scripts/seed-roles.js` | Removed |
| 17 | Provision script | `EXISTING_ROLES` contained "warden" | `scripts/provision-role-accounts.mts` | Dropped "warden" |
| 18 | DB: config_roles_registry | 'warden' row active | `public.config_roles_registry` | Deactivated (row kept for audit) |
| 19 | DB: users | single user with `role='warden'` | `public.users` | Reassigned to 'hostel_manager', preserving `assigned_hostel` |
| 20 | DB: config_exit_reasons | `approval_by` = 'warden' (home_out, day_pass rows) | `public.config_exit_reasons` | Reconciled to 'principal' |
| 21 | DB: is_warden() | function returning warden role check | DB function | Redefined as deprecation shim: `role IN ('principal','warden')` |
| 22 | DB: get_warden_hostel() | returns `users.assigned_hostel` | DB function | Unchanged (correct scoping source now that principal owns the hostel) |
| 23 | DB: users_role_check | CHECK constraint containing 'warden' | `public.users` | Dropped 'warden'; all other roles kept (principal, deputy_warden, hostel_manager, caretaker) |
| 24 | Narrative/help copy | 'warden' as a person (hostel warden) | `src/app/help/page.tsx`, student/leave, hostel-manager, guardian, person pages | Intentional, not a role reference — left as-is |
| 25 | Workflow stage string | `warden_or_principal` | permission-workflow stage | Kept (historical stage identifier) |
| 26 | Legacy redirect | `/warden/profile → /profile` | `next.config.mjs` | Kept (harmless legacy redirect) |

## 2. Features Moved into Principal

All warden dashboard sections now live under `/principal` (`src/app/(approver)/principal/`):

1. Entry/exit — entry & exit management
2. Escalated requests
3. Hostel attendance
4. Hostel reports
5. Incidents
6. Leave
7. Outpass
8. Resident directory
9. Room occupancy
10. Hostel oversight

Approval centre is also part of the consolidated principal scope.

## 3. Role & Authorization Changes

Application code changes:

- `src/lib/roles.ts`: removed `WARDEN` entry from `ROLES`.
- `src/server/services/scan/record.ts`: `OVERRIDING_ROLES` now `["admin","sysadmin","principal"]` (was `["admin","sysadmin","warden"]`).
- `src/lib/db.ts`: `GATE_OPERATOR_ROLES` now `['operator','supervisor']` (dropped 'warden').
- `src/lib/authContext.ts`: student-access allowlist now `['admin','sysadmin','principal']` (dropped 'warden').
- `src/lib/alert-hierarchy.ts`: alert id `warden.overdue` → `principal.overdue`.
- `src/components/admin/ExitReasonsManager.tsx`: `APPROVAL_TARGETS` dropped 'warden'.
- `src/app/api/config/exit-reasons/route.ts`: two description strings 'warden approved pass' → 'principal approved pass'.
- `src/app/api/users/route.ts`: `VALID_ROLES` dropped 'warden'; staff-employee insert list dropped 'warden'.
- `src/app/api/warden/hostel-scope/route.ts`: two SQL role-IN lists 'warden' → 'principal'; comments updated.
- `src/components/sysadmin/UserRolesPanel.tsx`: `ALL_ROLES` dropped 'warden'.
- `src/app/(approver)/warden/**` (11 files): each page now does `next/navigation` `redirect("/principal")`; `layout.tsx` is a pass-through.
- 19 `src/app/(approver)/principal/*.tsx` + `src/app/(approver)/layout.tsx` + `hostel/permissions/page.tsx`: removed 'warden' from `AuthGuard` allowedRoles arrays.
- `tests/pass-approval.spec.ts`: `x-user-role` 'warden' → 'principal'.
- `tests/admin-admin-test.spec.ts` + `admin-admin-overview.spec.ts`: `waitForURL` regex 'warden' → 'principal'.
- `scripts/seed-all.sql`: demo WARDEN user role 'warden' → 'hostel_manager'; config_roles 'warden' row `is_active` true → false.
- `scripts/seed-roles.js`: removed the 'warden' seed entry.
- `scripts/provision-role-accounts.mts`: `EXISTING_ROLES` dropped "warden".

DB changes (via migration):

- Deactivated the 'warden' row in `public.config_roles_registry` (row kept for audit).
- Reassigned the single existing `role='warden'` user to 'hostel_manager' (NOT auto-promoted to principal), preserving `assigned_hostel`.
- Reconciled `config_exit_reasons.approval_by` 'warden' → 'principal' (home_out, day_pass rows).
- Redefined `is_warden()` as a deprecation shim returning `role IN ('principal','warden')`.
- Kept `get_warden_hostel()` unchanged (still returns `users.assigned_hostel`).
- Dropped 'warden' from the `users_role_check` CHECK constraint (kept principal, deputy_warden, hostel_manager, caretaker).

## 4. Database Changes & Migration Order

Up migration: `database/migrations/20261125000001_warden_principal_consolidation.sql`
Down migration (rollback): `database/migrations/20261125000001_warden_principal_consolidation.down.sql`

Steps performed (in order):

1. Deactivate 'warden' row in `public.config_roles_registry` (set `is_active=false`, row kept).
2. Reassign single `role='warden'` user to 'hostel_manager' (preserve `assigned_hostel`; no auto-promotion to principal).
3. Reconcile `config_exit_reasons.approval_by` 'warden' → 'principal' for home_out and day_pass rows.
4. Redefine `is_warden()` as deprecation shim: `role IN ('principal','warden')`.
5. Drop 'warden' from `users_role_check` CHECK constraint (all other roles retained).

Preserved (not modified/deleted):

- `student_details.warden_id` column
- `audit_logs`, `stage_history`, `delegation_logs` rows
- `warden_or_principal` workflow stage string
- `deputy_warden` / `hostel_manager` / `caretaker` roles
- Warden-specific SQL functions `is_warden()` / `get_warden_hostel()` (kept as shims; resolve to principal semantics)

Notes: No RLS policy in production called `is_warden`/`get_warden_hostel`; no `hostels` or `kb_role_priority` table exists.

## 5. Affected Endpoints & Routes

- `/warden/*` (11 pages under `src/app/(approver)/warden/`): each now redirects via `next/navigation` to `/principal`.
- `/warden/hostel-scope` API (`src/app/api/warden/hostel-scope/route.ts`): SQL role-IN lists changed 'warden' → 'principal'; comments updated.
- `/warden/profile → /profile` redirect kept in `next.config.mjs` (harmless legacy redirect).
- `src/app/api/users/route.ts`: `VALID_ROLES` + staff-employee insert list dropped 'warden'.
- `src/app/api/config/exit-reasons/route.ts`: description strings updated to 'principal approved pass'.

## 6. Existing-Account Handling

- Exactly one user had `role='warden'`.
- Migrated to `role='hostel_manager'`, preserving `assigned_hostel`.
- No auto-promotion to principal: the user retains hostel-manager scope only. Promotion to principal (if needed) is a manual/administrative action, not part of this migration.

## 7. Tests & Results

Commands and verbatim results:

- `npx tsc --noEmit` → 0 errors.
- `npm run test:unit` → "92 PASSED, 0 FAILED", exit 0.
- `node scripts/verify-layering.js` → "OK: no layering violations."
- Live DB check after migration: 0 users with `role='warden'` remain; `config_roles_registry` warden row `is_active=false`; `config_exit_reasons` approval_by values now `('none','principal')`.

## 8. Rollback Instructions

1. Run the down migration: `database/migrations/20261125000001_warden_principal_consolidation.down.sql`.
2. Re-activate the warden row in `public.config_roles_registry` (`is_active=true`).
3. Restore 'warden' to the `users_role_check` CHECK constraint.
4. Re-seed warden-related config (restore demo warden role in seed data if needed; restore `config_roles` warden row `is_active`).
5. Revert the application-code changes listed in §3 (role constants, allowlists, redirects, tests, seed scripts).
6. The reassignment of the single warden user → hostel_manager is data; restore `role='warden'` for that user (preserving `assigned_hostel`) to complete rollback.

## 9. Deployment Considerations & Remaining Risks

Known out-of-scope / intentionally-kept items:

- 'warden' still appears in narrative/help copy (`src/app/help/page.tsx`, student/leave, hostel-manager, guardian, person pages) describing the warden as a person (hostel warden) — intentional, not a role reference; left as-is.
- `warden_or_principal` permission-workflow stage string kept (historical stage identifier).
- `is_warden()` / `get_warden_hostel()` kept as deprecation shims for any external caller; safe to drop in a future cleanup migration.
- The `/warden/profile → /profile` redirect in `next.config.mjs` kept (harmless legacy redirect).
- Warden-specific SQL functions kept (not dropped) to avoid breaking any external/legacy caller; they now resolve to principal semantics.
