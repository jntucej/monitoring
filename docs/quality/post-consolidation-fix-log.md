# Post-Consolidation Fix Log

**Session**: 2026-10-15
**Trigger**: `d4f3cdf5` warden→principal consolidation
**Baseline**: 6 tsc errors, 0 test failures

---

## Fix 1 — ResidentDirectoryPanel rewrite completion

**File**: `src/app/(approver)/principal/_shared.tsx` + `src/app/(approver)/principal/page.tsx`

**Problem**: Subagent task left `ResidentDirectoryPanel` mid-rewrite. 6 tsc errors:
- `useState` import missing (partially resolved)
- `StudentDetails.hostel_block` / `room_number` snake_case accessors (2 sites)
- Dashboard passed `records: AttendanceRecordRow[]` where new signature expects `residents: Person[]`

**Fix**:
- Added `import { useMemo, useState } from "react"` at top of `_shared.tsx`
- Changed `s.hostel_block` → `s.hostelBlock`, `s.room_number` → `s.roomNumber` in filter `useMemo` and table cell
- Removed `AttendanceRecordRow` interface export (orphaned after stub removal)
- Dashboard: removed `attendanceRecords`/`attendanceRecordsError` state + `/api/attendance_records?limit=50` fetch
- Dashboard: passes `students` (from `/api/students?scope=active`) as `residents` prop

**Result**: `tsc --noEmit` = 0 errors.

---

## Fix 2 — `/hostel/permissions` AuthGuard

**File**: `src/app/(approver)/hostel/permissions/page.tsx:319`

**Problem**:
- `allowedRoles` included `'hostel'` — not a valid `Role` value in `src/lib/roles.ts`
- `'principal'` was not in the list — Principal dashboard CTA "Open Hostel Approvals Desk" would be blocked
- `'caretaker'` was not in the list

**Fix**: `['principal', 'hostel_manager', 'deputy_warden', 'caretaker', 'admin', 'sysadmin']`

---

## Fix 3 — `/warden/*` layout redirect

**File**: `src/app/(approver)/warden/layout.tsx`

**Problem**: Layout was a pass-through (`<>{children}</>`); 10 sub-pages each had their own
`redirect("/principal")` but unauthenticated/wrong-role users could reach the sub-page
component tree before the redirect fired.

**Fix**: Layout now calls `redirect("/principal")` at top level.
Removed unused `React` import and `children` parameter.

**Also**: Renamed all 10 sub-page function exports from `Page` to `WardenRedirectPage`
for consistency (Next.js doesn't care about the function name, only the default export).

---

## Fix 4 — Warden narrative cleanup (UI copy)

| File | Change |
|---|---|
| `src/app/help/page.tsx` | "warden" → "principal" / "hostel manager" throughout; removed `warden: 60` from `getRoleTier()` map; fixed all 5 `visibleToRoles` arrays that listed `"warden"` |
| `src/app/(approver)/guardian/pass-leave-submission/page.tsx` | "caregiver → warden → principal" → "caregiver → principal" |
| `src/app/(sysadmin)/sysadmin/people/page.tsx` | "wardens" → "hostel managers" |
| `src/app/(approver)/hostel-manager/page.tsx` | "warden/principal chain" → "hostel-manager/principal chain" |
| `src/app/(approver)/hostel-manager/resource-management/page.tsx` | same |
| `src/app/(operator)/operator/manual-entry/page.tsx` | "escalate to warden/admin" → "escalate to principal/admin" |
| `src/app/(approver)/deputy-warden/delegated-approvals/page.tsx` | "awaiting warden review" → "awaiting principal review" |
| `src/app/(approver)/deputy-warden/daily-overview/page.tsx` | same |
| `src/app/(approver)/deputy-warden/decision-history/page.tsx` | "warden stage" → "principal stage" (3 sites) |
| `src/server/policy/gate-access.ts` | comment: "wardens are exempt" → "principals are exempt" |
| `src/app/api/students/route.ts` | comment: "wardens only get scoped listings" → "scoped roles only get scoped listings" |
| `src/lib/db.ts` | comment: "operator/supervisor/warden" → "operator/supervisor"; "warden/admin" → "principal/admin" |
| `src/lib/rag/workflows.ts` | `stage: "warden_approval"` → `stage: "principal_approval"` |

---

## Pre-session fixes (by subagent, verified this session)

| File | Fix |
|---|---|
| `src/app/(approver)/principal/hostel-oversight/page.tsx` | `workflow_type=outpass` → `hostel` |
| `src/app/(approver)/principal/gate-activity/page.tsx` | same |
| `src/app/(approver)/principal/permissions/page.tsx` | same |
| `src/app/(approver)/principal/permission-management/page.tsx` | same |
| `src/app/(approver)/principal/all-pass-requests/page.tsx` | same + removed dead "Outpass" filter tab from `WORKFLOW_LABELS` |
| `src/app/(approver)/principal/page.tsx` | two `outpass` queries → `hostel` |
| `src/app/api/permissions/route.ts` | GET: source → `permissions` table; added `student:requester_user_id(...)` + `document_signatures(...)` embeds |
| `src/app/api/principal/audit/route.ts` | Broadened `.or()` filter to hostel/outpass/approval/override/escalation/delegation actions |
| `src/app/(approver)/principal/audit/page.tsx` | `actor_name`/`actor_role` → `user_name`/`user_role`; `fmtDetails()` for JSONB rendering |

---

## Fix 5 — EntryExitLogsPanel stub → live data

**File**: `src/app/(approver)/principal/_shared.tsx` + `src/app/(approver)/principal/page.tsx`

**Problem**: `EntryExitLogsPanel` rendered a "restricted at the principal tier" stub instead
of showing real entry/exit activity for the active roster.

**Fix**:
- Rewrote to accept `students: Person[] | null` with optional `loading` prop
- Filters to students with `checkedInAt` or `checkedOutAt`, sorts most-recent-first
- Renders IN/OUT badge + last timestamp per student
- Dashboard passes `students` (from `/api/students?scope=active`) and `loading={students === null}`

---

## Fix 6 — `/api/students` hostel param validation bug

**File**: `src/app/api/students/route.ts`

**Problem**: `findWardenScopedStudents` rejected any request where `hostel` was not in
`HOSTEL_CODES` — including `?scope=active` with no hostel param (the normal dashboard
call). `!HOSTEL_CODES.includes(hostel?.toUpperCase() ?? "")` evaluated `""` which is
never in the list, so it always threw.

**Fix**: Changed to `if (hostel && !HOSTEL_CODES.includes(hostel.toUpperCase()))` so the
validation only fires when a hostel code is actually supplied.

---

## Fix 7 — `ResidentDirectoryPanel` / `EntryExitLogsPanel` loading prop semantics

**File**: `src/app/(approver)/principal/page.tsx`

**Problem**: Both panels received `loading={students === null && !alertsError}` — the
`alertsError` check was wrong; these panels are driven by the students fetch, not alerts.

**Fix**: Changed to `loading={students === null}` for both panels.

---

## Fix 8 — Deputy-warden decision-history / daily-overview narrative

**Files**: `src/app/(approver)/deputy-warden/{delegated-approvals,daily-overview,decision-history}/page.tsx`

**Problem**: Copy said "awaiting warden review" / "warden stage" — the post-consolidation
stage is `warden_or_principal` but the copy still referenced the old role name.

**Fix**: Updated to "awaiting principal review" / "principal stage" (3 sites in
decision-history, 1 in daily-overview, 1 in delegated-approvals).

---

## Agent D — Performance & stability review (PHASE 8)

**Scope**: Polling intervals, unbounded fetches, N+1 query patterns on principal-facing routes.

### Findings (no fix required)

| Area | Finding |
|---|---|
| `src/hooks/usePolling.ts` | Cleanup is correct: interval cleared, `visibilitychange` listener removed, aborted flag set, `cancelled` guard prevents setState after unmount. No leak. |
| `/api/occupancy/presence-matrix` | `movement_logs` is bounded by `.limit(2000)`; role resolution is **batched** in chunks of 200 via `.in("id", chunk)` — not N+1. |
| `/api/principal/audit` | `ilike` patterns in `.or(...)` but bounded by `.limit(50)`. Acceptable. |
| `/api/students` | `findWardenScopedStudents` fetches `users` then `student_details` via one batched `.in("user_id", ids)` call. No N+1. |
| Retention components (`CampusKnowledgeCentre`, `CampusFeedbackDesk`, `ContributionPortfolio`, `SemesterRecap`) | Fire-and-forget `setTimeout` without unmount cleanup. Low severity — timers are short-lived and non-critical; accepted as-is. |

### Fixes applied

#### Fix 9 — Principal dashboard redundant 30s polling fetches

**File**: `src/app/(approver)/principal/page.tsx`

**Problem**: The dashboard polled `/api/students?scope=active` and `/api/alerts?resolved=false`
every 30 s, but the consuming panels (`HostelOccupancyPanel` roster, `AlertsPanel`,
`ResidentDirectoryPanel`, `EntryExitLogsPanel`) render restricted-tier stubs at the
principal tier — the roster and alerts belong to the operator surface and
`/principal/incidents`.

**Fix**:
- Removed `students` / `alerts` / `alertsError` state and the two fetches from `refresh`
- "On-Campus Now" KPI now derived from the presence matrix (`onCampusNow` = sum of all
  gate×role counts) instead of roster length
- KPI #3 re-badged "Active Alerts" → "Pending Hostel Approvals" (outpasses + leaves, both already fetched)
- KPI #4 re-badged "Last Curfew Breach" → "Last Matrix Refresh" (from `matrix.lastUpdated`)
- `anyError` no longer includes the removed `alertsError`

#### Fix 10 — Restricted-tier panel stubs (principal-facing, operator data)

**Files**: `src/app/(approver)/principal/_shared.tsx`, `principal/page.tsx`, `principal/hostel-oversight/page.tsx`

**Problem**: `HostelOccupancyPanel`, `ResidentDirectoryPanel`, `EntryExitLogsPanel` and
`HostelIncidentsPanel` computed block occupancy / rosters / scan logs from `/api/students`
data — operator-scoped information that is not exposed at the principal tier post-consolidation
(consistent with the existing `RoomOccupancyPanel` restricted-stub pattern).

**Fix**:
- All four panels rewritten as no-arg components rendering explicit restricted-tier copy
  ("maintained by the hostel manager" / "operator-scoped" / "admin-scoped"), matching
  `RoomOccupancyPanel`
- Removed now-unused `Person` type import, `useMemo`/`useState` import, and `Users`
  icon from `_shared.tsx`; `LogIn`/`MapPin`/`Users` consolidated into the top import
- `principal/page.tsx`: removed `Alert`/`Person` type imports and `AlertsPanel` import;
  panels render with no props
- `hostel-oversight/page.tsx`: `HostelOccupancyPanel` call site updated to no-arg

---

## Verification (final, post Agent D)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | 0 errors |
| `npm run test:unit` | 92 PASSED, 0 FAILED |
| `node scripts/verify-layering.js` | OK: no layering violations |
| `npm run lint` | 1 pre-existing error (`manual-entry/page.tsx:87`, untouched), 1557 pre-existing warnings |
| `npm run build` | Success (529/529 static pages, 0 errors) |
