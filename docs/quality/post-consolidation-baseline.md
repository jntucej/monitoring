# Post-Consolidation Baseline Audit

**Date**: 2026-10-15
**Trigger**: `d4f3cdf5` — warden role removal / principal consolidation
**Command**: `cd /root/monitoring && git log --oneline -1 && npx tsc --noEmit && npm run test:unit`

---

## 1. Baseline test results (pre-fix session)

| Check | Result |
|---|---|
| `git status` | Clean (worktree in sync with origin/main) |
| `npx tsc --noEmit` | 0 errors |
| `npm run test:unit` | 92 PASSED, 0 FAILED |
| `node scripts/verify-layering.js` | OK: no layering violations |
| `npx eslint src` | 1 pre-existing React Compiler lint error (`react-hooks/preserve-manual-memoization` in `src/app/(operator)/operator/manual-entry/page.tsx:87`), 1555 warnings — not introduced by the consolidation |

---

## 2. Issues discovered during audit

### 2.1 Principal dashboard — dead `outpass` workflow queries
Six principal pages queried `workflow_type=outpass`.
`outpass` is NOT in the valid `WorkflowType` set (`hostel | exam | memo | staff_leave | lab_access`).
All queries returned empty results; the dashboard showed "no records" when hostel-flow
outpass/leave requests actually existed.

### 2.2 `/api/permissions` GET — missing `student` embed
The GET list handler returned flat rows. Principal approval UIs accessed
`request.student.name` → always `undefined`.

### 2.3 `AuditRecord` interface mismatch
`_shared.tsx` defined fields `actor_name`/`actor_role`; the DB has `user_name`/`user_role`.
`details` column is JSONB but the interface typed it as `string`.

### 2.4 `/api/principal/audit` filter too narrow
Only `EXAM_APPROVAL` audit actions matched; hostel/outpass/override/escalation/delegation
audit rows were invisible.

### 2.5 `ResidentDirectoryPanel` stub
Rendered "managed by hostel manager" instead of showing the active roster.

### 2.6 `/hostel/permissions` AuthGuard
- `allowedRoles` included `'hostel'` — not a valid `Role` value
- `'principal'` was not in the list — the Principal dashboard CTA would be blocked

### 2.7 `/warden/*` layout
`warden/layout.tsx` was a pass-through; sub-pages redirected individually but
unauthenticated/wrong-role users could reach them before the redirect fired.

### 2.8 Warden narrative in UI copy
Help page, guardian copy, sysadmin people page, hostel-manager pages, operator manual-entry,
gate-access.ts, db.ts comments, and rag/workflows.ts all still referenced "warden" as a live role.

### 2.9 Principal dashboard polled operator-scoped data every 30 s (Agent D, PHASE 8)
`/api/students?scope=active` + `/api/alerts?resolved=false` were refetched on every poll even
though their panels (`HostelOccupancyPanel` roster, `AlertsPanel`, `ResidentDirectoryPanel`,
`EntryExitLogsPanel`) render restricted-tier stubs at the principal tier. Roster/alerts data
belongs to the operator surface and `/principal/incidents`.
**Fix**: removed both fetches; "On-Campus Now" KPI now derives from the presence matrix.
Also confirmed no N+1 in principal-facing routes (presence-matrix role lookup is batched in
chunks of 200; `movement_logs` bounded by `.limit(2000)`).

---

## 3. Files changed in this session

| File | Change |
|---|---|
| `src/app/(approver)/principal/page.tsx` | Removed `attendanceRecords` state + `/api/attendance_records` fetch; passes `students` as `residents` to `ResidentDirectoryPanel` |
| `src/app/(approver)/principal/_shared.tsx` | Removed `AttendanceRecordRow` interface; `ResidentDirectoryPanel` now accepts `residents: Person[]` with client-side search |
| `src/app/(approver)/principal/hostel-oversight/page.tsx` | `workflow_type=outpass` → `hostel` |
| `src/app/(approver)/principal/gate-activity/page.tsx` | same |
| `src/app/(approver)/principal/permissions/page.tsx` | same |
| `src/app/(approver)/principal/permission-management/page.tsx` | same |
| `src/app/(approver)/principal/all-pass-requests/page.tsx` | same + removed dead "Outpass" filter tab |
| `src/app/api/permissions/route.ts` | GET handler: source → `permissions` table; added `student:requester_user_id(...)` + `document_signatures(...)` embeds |
| `src/app/api/principal/audit/route.ts` | Broadened `.or()` filter to hostel/outpass/approval/override/escalation/delegation audit actions |
| `src/app/(approver)/principal/audit/page.tsx` | Render sites updated to `user_name` + `fmtDetails()` |
| `src/app/(approver)/hostel/permissions/page.tsx` | `allowedRoles` fixed: `['principal', 'hostel_manager', 'deputy_warden', 'caretaker', 'admin', 'sysadmin']` |
| `src/app/(approver)/warden/layout.tsx` | Now calls `redirect("/principal")` at top level; removed unused `children`/`React` imports |
| `src/app/(approver)/warden/page.tsx` | Function renamed to `WardenRedirectPage` |
| `src/app/(approver)/warden/{escalated-requests,outpass-leave,leave-requests,resident-directory,entry-exit,incidents,hostel-attendance,room-occupancy,hostel-reports}/page.tsx` | Function renamed to `WardenRedirectPage` |
| `src/app/help/page.tsx` | All "warden" narrative → "principal"; removed `warden: 60` from tier map; fixed all `visibleToRoles` lists |
| `src/app/(approver)/guardian/pass-leave-submission/page.tsx` | "caregiver → warden → principal" → "caregiver → principal" |
| `src/app/(sysadmin)/sysadmin/people/page.tsx` | "wardens" → "hostel managers" |
| `src/app/(approver)/hostel-manager/page.tsx` | "warden/principal chain" → "hostel-manager/principal chain" |
| `src/app/(approver)/hostel-manager/resource-management/page.tsx` | same |
| `src/app/(operator)/operator/manual-entry/page.tsx` | "escalate to warden/admin" → "escalate to principal/admin" |
| `src/server/policy/gate-access.ts` | comment: "wardens are exempt" → "principals are exempt" |
| `src/app/api/students/route.ts` | comment: "wardens only get scoped listings" → "scoped roles only get scoped listings" |
| `src/lib/db.ts` | Two comment fixes: "operator/supervisor/warden" → "operator/supervisor"; "warden/admin" → "principal/admin" |
| `src/lib/rag/workflows.ts` | `stage: "warden_approval"` → `stage: "principal_approval"` |
| `src/app/(approver)/principal/page.tsx` (Agent D) | Removed redundant 30 s polling of `/api/students` + `/api/alerts`; "On-Campus Now" KPI now from presence matrix; KPI row re-badged |
| `src/app/(approver)/principal/_shared.tsx` (Agent D) | `HostelOccupancyPanel` / `ResidentDirectoryPanel` / `EntryExitLogsPanel` / `HostelIncidentsPanel` → no-arg restricted-tier stubs; removed unused `Person`/`useMemo`/`useState` imports |
| `src/app/(approver)/principal/hostel-oversight/page.tsx` (Agent D) | `HostelOccupancyPanel` call site → no-arg |

---

## 4. Post-fix verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | 0 errors |
| `npm run test:unit` | 92 PASSED, 0 FAILED |
| `node scripts/verify-layering.js` | OK: no layering violations |
| `npm run lint` | 1 pre-existing error (`manual-entry/page.tsx:87`), 1557 pre-existing warnings |
| `npm run build` | Success |
