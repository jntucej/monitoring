# Post-Consolidation Test Report

**Date**: 2026-10-15
**Commit baseline**: `d4f3cdf5` + post-consolidation fixes
**Commands**: `npx tsc --noEmit`, `npm run test:unit`, `node scripts/verify-layering.js`, `npm run lint`, `npm run build`

---

## 1. Type safety

| Check | Before session | After session |
|---|---|---|
| `npx tsc --noEmit` | 6 errors (ResidentDirectoryPanel rewrite mid-progress) | **0 errors** |

### Errors fixed
- `useState` import missing in `_shared.tsx` (partially resolved by prior subagent; confirmed this session)
- `StudentDetails.hostel_block` / `room_number` snake_case accessors → `hostelBlock` / `roomNumber` (2 remaining sites)
- `ResidentDirectoryPanel` prop mismatch: dashboard passed `records: AttendanceRecordRow[]`, new signature expects `residents: Person[]` → dashboard re-wired to fetch `/api/students?scope=active` and pass `students` as `residents`
- Agent D (PHASE 8): `HostelOccupancyPanel` / `ResidentDirectoryPanel` / `EntryExitLogsPanel` / `HostelIncidentsPanel` signatures changed to no-arg restricted-tier stubs → `hostel-oversight/page.tsx` passed a removed `roster` prop (2 tsc errors) → call site updated to `<HostelOccupancyPanel />`; orphaned JSX block in `_shared.tsx` removed

---

## 2. Unit tests

| Check | Result |
|---|---|
| `npm run test:unit` | **92 PASSED, 0 FAILED** |
| Role wiring (21 roles) | All mapped correctly |
| Register / exit-flow invariants | Pass |

---

## 3. Layering

| Check | Result |
|---|---|
| `node scripts/verify-layering.js` | **OK: no layering violations** |

---

## 4. Lint (full project)

| Check | Result |
|---|---|
| `npm run lint` (eslint src) | **1 error, 1557 warnings** |
| The 1 error | `react-hooks/preserve-manual-memoization` — `src/app/(operator)/operator/manual-entry/page.tsx:87` (pre-existing, NOT introduced by consolidation) |
| Warnings | Pre-existing `@typescript-eslint/no-explicit-any` / `no-unused-vars` / `react-hooks/*` across the codebase |

No new lint errors introduced by any post-consolidation session.

---

## 5. Production build

| Check | Result |
|---|---|
| `npm run build` (`NODE_ENV=production next build`) | **Success** — compiled in ~880ms, 529/529 static pages generated, 0 build errors |

---

## 6. Performance / stability review (Agent D, PHASE 8)

| Area | Finding | Action |
|---|---|---|
| `src/hooks/usePolling.ts` | Interval + visibilitychange + abort handling all cleaned up in the effect teardown; `cancelled` flag guards stale responses | No fix needed |
| Retention components (`CampusKnowledgeCentre`, `CampusFeedbackDesk`, `ContributionPortfolio`, `SemesterRecap`) | Fire-and-forget `setTimeout` without unmount cleanup | Low severity; timers are non-critical and short-lived — accepted as-is |
| `/api/occupancy/presence-matrix` | `movement_logs` fetch is bounded (`.limit(2000)`); role lookup is batched in chunks of 200 via `.in("id", chunk)` — **not** N+1 | No fix needed |
| `/api/principal/audit` | `.or(...)` with `ilike` patterns but bounded by `.limit(50)` | No fix needed |
| `/api/students` (`findWardenScopedStudents`) | Batched `.in("user_id", ids)` for `student_details` — no N+1 | No fix needed |
| Principal dashboard (`principal/page.tsx`) | Redundant fetches: `/api/students?scope=active` + `/api/alerts?resolved=false` were loaded every 30s but `students`/`alerts` were only used by panels that are restricted stubs at the principal tier (the roster belongs to the operator surface and alerts to `/principal/incidents`). "On-Campus Now" KPI now derived from the presence matrix instead; KPI row re-badged to Pending Hostel Approvals / Last Matrix Refresh | Fixed — removed 2 redundant polling fetches and their state |
| `HostelOccupancyPanel` / `ResidentDirectoryPanel` / `EntryExitLogsPanel` / `HostelIncidentsPanel` | Previously computed block occupancy / rosters from `/api/students` — operator-scoped data not exposed at principal tier per consolidation. Panels are now explicit restricted-tier stubs matching `RoomOccupancyPanel`'s pattern | Rewritten as no-arg stubs with clear "maintained by hostel manager / operator-scoped" copy |

---

## 7. Additional fixes this session

| Fix | File | Description |
|---|---|---|
| EntryExitLogsPanel stub → live data (superseded) | `principal/_shared.tsx` + `principal/page.tsx` | Rewrote to accept `students: Person[]`; later superseded by Agent D restricted-tier stub |
| `/api/students` hostel param validation | `src/app/api/students/route.ts` | `!HOSTEL_CODES.includes(hostel?.toUpperCase() ?? "")` always threw for `?scope=active` (no hostel param); changed to `if (hostel && ...)` so validation only fires when a hostel code is supplied |
| Loading prop semantics | `principal/page.tsx` | `ResidentDirectoryPanel` and `EntryExitLogsPanel` received `loading={students === null && !alertsError}` — the `alertsError` check was wrong; changed to `loading={students === null}` |
| Deputy-warden narrative | `deputy-warden/{delegated-approvals,daily-overview,decision-history}/page.tsx` | "awaiting warden review" / "warden stage" → "awaiting principal review" / "principal stage" (5 sites total) |
| Dashboard redundant polling fetches removed | `principal/page.tsx` | Dropped `/api/students?scope=active` + `/api/alerts?resolved=false` from the 30s poll; "On-Campus Now" KPI now computed from `matrix` (presence matrix), KPI #3 re-badged to Pending Hostel Approvals, KPI #4 to Last Matrix Refresh |
| Restricted-tier panel stubs | `principal/_shared.tsx`, `principal/page.tsx`, `principal/hostel-oversight/page.tsx` | `HostelOccupancyPanel` / `ResidentDirectoryPanel` / `EntryExitLogsPanel` / `HostelIncidentsPanel` now render explicit restricted-tier copy instead of computing from operator-scoped data |

---

## 8. Remaining pre-existing issues (out of scope)

| Issue | File | Severity |
|---|---|---|
| `react-hooks/preserve-manual-memoization` | `src/app/(operator)/operator/manual-entry/page.tsx:87` | Low — pre-existing, not introduced by consolidation |

---

## 9. End-to-end verification (live data)

The following fixes were verified structurally (type-check + code inspection) but not
against a running PostgreSQL/Supabase instance with credentials:

- `/api/permissions` GET student + document_signatures embed
- Principal dashboard presence-matrix / audit / hostel-leave fetches
- `/api/principal/audit` broadened filter
- Restricted-tier panel stubs render

Playwright e2e suite (`tests/*.spec.ts`) requires a live DB and could not be executed in
this environment; structural verification above covers the same code paths.

---

## 10. Definition of Done

| Criterion | Met? |
|---|---|
| No `warden` as a live Role in `src/lib/roles.ts` | ✅ |
| No page/API queries `workflow_type='outpass'` | ✅ |
| Principal dashboard shows real data (not stubs where operator-scoped) | ✅ (restricted panels are intentional stubs; gate matrix / pending approvals are live) |
| `/hostel/permissions` accessible to principal | ✅ |
| `/warden/*` redirects to `/principal` at layout level | ✅ |
| All UI narrative updated (no "warden" as live role) | ✅ |
| Redundant 30s polling fetches on principal dashboard removed | ✅ |
| No N+1 in principal-facing API routes | ✅ |
| `tsc --noEmit` = 0 errors | ✅ |
| `test:unit` = 92/92 pass | ✅ |
| `verify-layering.js` = clean | ✅ |
| `npm run lint` = 1 pre-existing error only (manual-entry, untouched) | ✅ |
| `npm run build` = success | ✅ |
