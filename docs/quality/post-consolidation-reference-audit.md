# Warden → Principal Consolidation — Reference Audit

**Date**: 2026-10-15
**Scope**: Full repo sweep for residual `warden` references following the `d4f3cdf5` consolidation commit.
**Status**: All code-path bugs fixed; remaining references are intentional.

---

## 1. Method

Grepped all `.ts`, `.tsx`, `.sql`, `.mjs`, `.js` files under `src/`, `database/`, `scripts/`, and `next.config.mjs` for `warden` (case-insensitive). Each hit classified as:

- **BUG** — a code path that still treats `warden` as a live role or queries the dead `outpass` workflow type
- **INTENTIONAL** — historical comment, preserved DB column, legacy redirect, or narrative copy
- **FIXED** — was a bug, now corrected in this session

---

## 2. Bugs found and fixed

### 2.1 `workflow_type='outpass'` queries (dead — no such type exists)

`outpass` is NOT a valid `WorkflowType` (valid set: `hostel | exam | memo | staff_leave | lab_access`).
The hostel outpass/leave flow uses `workflow_type='hostel'` with stages
`caretaker → deputy_warden → hostel_manager → warden_or_principal → completed`.

| File | Bug | Fix |
|---|---|---|
| `principal/hostel-oversight/page.tsx` | `workflow_type=outpass` → always empty | `workflow_type=hostel` |
| `principal/gate-activity/page.tsx` | same | same |
| `principal/permissions/page.tsx` | same | same |
| `principal/permission-management/page.tsx` | same | same |
| `principal/all-pass-requests/page.tsx` | same + dead "Outpass" filter tab in `WORKFLOW_LABELS` | `workflow_type=hostel`; removed dead tab |
| `principal/page.tsx` (dashboard) | two `outpass` queries | `hostel` |

### 2.2 `/api/permissions` GET — no `student` embed

The GET list handler returned flat `permissions` rows. Principal approval UIs accessed
`request.student.name` → always `undefined`.

**Fix** (`src/app/api/permissions/route.ts`): source changed from the `permission_requests`
view to the `permissions` table; PostgREST embed added:
`student:requester_user_id(...)` and `document_signatures(...)`.
Additive change; safe for all roles.

### 2.3 `AuditRecord` interface mismatched real `audit_logs` schema

`_shared.tsx` defined `AuditRecord` with `actor_name`/`actor_role` fields, but the DB has
`user_name`/`user_role`. The `details` column is JSONB but the interface typed it as `string`.

**Fix** (`src/app/(approver)/principal/_shared.tsx`):
- Interface now uses `user_name`, `user_role`, `details?: Record<string,unknown> | string | null`
- Added `fmtDetails()` helper for safe JSON-string rendering
- `audit/page.tsx` render sites updated to use `user_name` + `fmtDetails()`

### 2.4 `/api/principal/audit` filter too narrow

The `.or()` filter only matched `EXAM_APPROVAL` audit actions; hostel/outpass/override/
escalation/delegation audit rows were invisible to the principal dashboard.

**Fix** (`src/app/api/principal/audit/route.ts`): broadened filter to include
hostel, outpass, approval, override, escalation, and delegation audit actions.

### 2.5 `ResidentDirectoryPanel` was a stub

The panel rendered "Resident directory is managed by the hostel manager" instead of
showing the active roster.

**Fix** (`src/app/(approver)/principal/_shared.tsx`):
- Rewrote to accept `residents: Person[] | null` (active roster)
- Client-side search over name / roll / block / room
- Removed old `records: AttendanceRecordRow[]` wiring
- Dashboard `page.tsx` now passes `students` (from `/api/students?scope=active`) as `residents`

### 2.6 `AttendanceRecordRow` interface orphaned

After removing the stub wiring, `AttendanceRecordRow` was no longer used anywhere.

**Fix**: removed the interface export from `_shared.tsx` and the import from `page.tsx`.

### 2.7 `/hostel/permissions` AuthGuard — invalid role + missing principal

```ts
// Before
allowedRoles: ['hostel', 'hostel_manager', 'deputy_warden', 'admin', 'sysadmin']
// 'hostel' is not a valid Role value (ROLES in src/lib/roles.ts)
// 'principal' was not included — the Principal dashboard CTA "Open Hostel Approvals Desk"
// would land here and be blocked.
```

**Fix**: `['principal', 'hostel_manager', 'deputy_warden', 'caretaker', 'admin', 'sysadmin']`

### 2.8 `/warden/*` pages — no redirect in layout

`src/app/(approver)/warden/layout.tsx` was a pass-through; the 10 sub-pages each had
their own `redirect("/principal")` but the layout allowed unauthenticated/wrong-role
users to reach the sub-pages before the redirect fired.

**Fix**: `warden/layout.tsx` now calls `redirect("/principal")` at the top level;
all sub-page redirects retained for direct-URL access.

### 2.9 Warden narrative in UI copy

| File | Before | After |
|---|---|---|
| `src/app/help/page.tsx` | "the warden contacts…", "warden walks the block map…", `visibleToRoles` lists `"warden"`, `warden: 60` in tier map | "the principal…", `visibleToRoles` uses `hostel_manager`/`deputy_warden`; `warden: 60` entry removed |
| `src/app/(approver)/guardian/pass-leave-submission/page.tsx` | "caregiver → warden → principal" | "caregiver → principal" |
| `src/app/(sysadmin)/sysadmin/people/page.tsx` | "students, faculty, staff, wardens" | "students, faculty, staff, hostel managers" |
| `src/app/(approver)/hostel-manager/page.tsx` | "warden/principal chain" | "hostel-manager/principal chain" |
| `src/app/(approver)/hostel-manager/resource-management/page.tsx` | same | same |
| `src/app/(operator)/operator/manual-entry/page.tsx` | "escalate to warden/admin" | "escalate to principal/admin" |
| `src/server/policy/gate-access.ts` (comment) | "wardens are exempt" | "principals are exempt" |
| `src/app/api/students/route.ts` (comment) | "wardens only get scoped listings" | "scoped roles only get scoped listings" |
| `src/lib/db.ts` (comments) | "operator/supervisor/warden" / "escalated to a warden/admin" | "operator/supervisor" / "escalated to a principal/admin" |
| `src/lib/rag/workflows.ts` | `stage: "warden_approval"` | `stage: "principal_approval"` |

### 2.10 Principal dashboard polled operator-scoped data (Agent D, PHASE 8)

`/api/students?scope=active` + `/api/alerts?resolved=false` were refetched on every 30 s
poll on the principal dashboard even though the consuming panels render restricted-tier
stubs at the principal tier. Not a `warden` reference, but the same class of bug —
principal-tier surfaces consuming data that belongs to the operator surface.

**Fix**: removed both fetches; "On-Campus Now" KPI now derived from the presence matrix.
`HostelOccupancyPanel` / `ResidentDirectoryPanel` / `EntryExitLogsPanel` /
`HostelIncidentsPanel` converted to explicit no-arg restricted-tier stubs (consistent with
`RoomOccupancyPanel`).

---

## 3. Intentional remaining references

These are **not bugs** and are preserved by design:

| Location | Reference | Reason |
|---|---|---|
| `src/lib/roles.ts` | `HOSTEL: "hostel"` (legacy role, comment notes it is folded) | Kept for approver-surface compatibility |
| `src/lib/roles.ts` | `DEPUTY_WARDEN: "deputy_warden"` | Role still exists post-consolidation |
| `src/lib/roles.ts` | comment "WARDEN removed 2026-11" | Documentation |
| `src/server/policy/routes.ts` | `warden: "/principal"` | Legacy warden users fold to principal |
| `next.config.mjs` | `/warden/profile` → `/profile` redirect | Legacy URL compat |
| `src/app/(approver)/warden/**` | 10 redirect pages + layout | Legacy URL compat |
| `src/app/api/warden/hostel-scope/route.ts` | API path name; queries `role IN ('principal','deputy_warden')` | Read-only scope endpoint; role list is correct post-consolidation |
| `src/lib/db.ts` line 101/203 | `wardenId: r.student_details.warden_id` | DB column `student_details.warden_id` preserved for audit |
| `src/app/api/passes/[passId]/{route,action}/route.ts` | `const wardenHostel = approverProfile?.assigned_hostel` | Variable name is historical; logic is correct (scoped hostel access) |
| `src/lib/authContext.ts` line 382 | comment "and its former warden responsibilities, now consolidated into it" | Documentation |
| `database/schema.sql` line 43/500/828/983 | `warden` in CHECK constraint / `is_warden()` / COMMENT | Baseline CI schema; overridden by migrations |
| `database/migrations/20261010000000_role_registry.sql` | `'warden'` seed row | Historical migration; `is_active` set to `false` by consolidation migration |
| `database/migrations/20260101000001_baseline_helper_functions.sql` | `is_warden()` / `get_warden_hostel()` definitions | Historical; redefined by consolidation migration |
| `database/migrations/20261112000001_mess_system_full.sql` | `warden` in role list / seed | Historical |
| `scripts/seed-all.sql` line 32/60 | `'WARDEN'` user / `'warden'` config_roles row with `is_active=false` | Seed data; `is_active=false` is correct post-consolidation |
| `src/app/(approver)/deputy-warden/**` | `deputy-warden` page titles / "warden stage" copy | Role still exists; copy describes the delegation chain |

---

## 4. Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | 0 errors |
| `npm run test:unit` | 92 PASSED, 0 FAILED |
| `node scripts/verify-layering.js` | OK: no layering violations |
| `npm run lint` | 1 pre-existing error (`manual-entry/page.tsx:87`), 1557 pre-existing warnings |
| `npm run build` | Success |
