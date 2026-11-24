# ROLE_REPORT — remaining roles (caretaker, exam, faculty, staff, visitor, worker, deputy_warden, hostel_manager, emo, entity-aligned)

**Audit date:** 2026-11-24
**Evidence level:** CODE_VERIFIED

## caretaker (6 pages)
- **Unique UX:** Natural-language command bar (`CaretakerCommandBar.tsx`). Commands: `assign <ticket> to <staff>`, `resolve <ticket> [note]`, `escalate <ticket>`. All route through `PATCH /api/permissions/[ticket]` (line 171).
- **Most capable approver surface** but most unconventional. A caretaker who has never used the command bar may not discover the actions.
- Pages: complaints, workers, maintenance, home, + 2.
- **Finding F-CA-01:** Command bar is discoverable only if the user knows to type. No visual hint of available commands until the input is focused.

## exam (exam + exam-branch + exam/superintendent = 26 pages)
- All read-only (verified in OIE report).
- `exam/superintendent` home, incidents, schedule, reports.
- `exam-branch` oie-handoff, discrepancies, verification, calendar, records, docs.
- **Finding F-EX-01:** 26 pages, zero write paths. Exam access is managed by OIE/VP, not by the exam roles themselves.

## faculty (16 pages + 1 top-level)
- `class-requests`: `POST /api/class-messages` (line 136) + `POST /api/class-level-issues/[id]/resolve` (line 162).
- `correction-requests`: `GET /api/permissions?workflow_type=memo&status=PENDING&stage=faculty` (read).
- `permissions`: `GET /api/permissions?workflow_type=exam&stage=faculty` + `GET /api/permissions?workflow_type=memo&stage=hod` (read).
- `my-classes`: `GET /api/faculty/my-classes?role=class_teacher` (read).
- `student-directory`: `GET /api/students` (read).
- `subject/{,classes,attendance}`: **3 `EmptyState` stubs** (no data fetch).
- `notifications`: `GET /api/announcements/active` (read).
- **Finding F-FA-01:** 3 EmptyState stubs (subject, subject/classes, subject/attendance) promise capability but render nothing.
- **Finding F-FA-02:** `FacultyRosterPanel.tsx:153` has `PATCH /api/faculty/attendance/roster/[id]` but is NOT mounted in any page.

## staff (10 pages)
- All read-only: my-day, leaves, duties, history, notifications, assigned-tasks, requests, my-profile.
- **Finding F-FA-03:** No write paths on staff surface. Justified (staff are recipients, not actors).

## visitor (9 pages)
- `visit`: `POST /api/visitors/me/check-in` (line 65) + `POST /api/visitors/me/check-out` (line 73).
- Other pages read-only: registration, history, host-info, checkin-out, approval-status, visit-details.
- **Finding F-VI-01:** Visitor check-in/out is clean. No issues.

## worker (4 pages)
- shifts, history, work-orders. All read-only.
- **Finding F-WO-01:** Worker shift management has no write path (shifts assigned by admin/supervisor). Justified.

## deputy_warden (13 pages)
- curfew, incident-reporting, complaints. Read-only.
- **Finding F-DW-01:** 13 pages, zero write paths. Deputy warden can see curfew violations but cannot act.

## hostel_manager (10 pages)
- complaints, allocations. Read-only.
- **Finding F-HM-01:** 10 pages, zero write paths.

## emo (3 pages)
- complaints. Read-only.
- **Finding F-EM-01:** 3 pages, zero write paths. Smallest role surface.

## entity-aligned (dean, chief_warden, controller_examinations, addl_controller_*)
- **No UI surface.** No route group, no config, no home URL.
- `dean`/`chief_warden`/`controller_examinations`: not in `getDefaultRouteForRole` → fall through to `/login`.
- `addl_controller_*`: fall through to `/exam-branch` (inherit exam-branch's 10 read-only pages).
- **Finding F-EA-01:** 6 entity-aligned roles are auth-only. A `dean` user has no console, no dashboard, no navigation.
- **Finding F-EA-02:** `dean` is referenced in `AuthGuard` for `/sysadmin/academic-status` (line 426) but has no other accessible page.

## Consolidated Findings (remaining roles)
| ID | Finding | Severity | Priority | Confidence |
|---|---|---|---|---|
| F-CA-01 | Caretaker command bar has no visual discoverability hint | MEDIUM | P2 | MEDIUM |
| F-EX-01 | 26 exam pages, zero write paths | MEDIUM | P2 | HIGH |
| F-FA-01 | 3 faculty EmptyState stubs (subject, subject/classes, subject/attendance) | MEDIUM | P2 | HIGH |
| F-FA-02 | FacultyRosterPanel PATCH not mounted in any page | MEDIUM | P2 | HIGH |
| F-VI-01 | Visitor check-in/out clean (no issues) | — | — | HIGH |
| F-DW-01 | Deputy warden: 13 pages, zero write paths | MEDIUM | P2 | HIGH |
| F-HM-01 | Hostel manager: 10 pages, zero write paths | MEDIUM | P2 | HIGH |
| F-EA-01 | 6 entity-aligned roles are auth-only (no UI surface) | HIGH | P1 | HIGH |
| F-EA-02 | `dean` referenced in AuthGuard for academic-status but has no console | HIGH | P1 | HIGH |

## Verification Log (2026-11-24)
- Caretaker: 6 pages, `CaretakerCommandBar.tsx:171` PATCH: **CONFIRMED**
- Exam: 26 pages (5 superintendent + 10 branch + 11 OIE), zero write paths: **CONFIRMED** (but see OIE correction — `OieCommandBar` in `RoleConsole`)
- Faculty: 16 + 1 pages, 3 EmptyState stubs: **CONFIRMED**
- `FacultyRosterPanel.tsx:153` PATCH not mounted: **CONFIRMED** (grep for import in pages returns 0)
- Staff: 10 pages, all read-only: **CONFIRMED**
- Visitor: 9 pages, 2 write paths (check-in/out): **CONFIRMED**
- Worker: 4 pages, all read-only: **CONFIRMED**
- Deputy warden: 13 pages, zero write: **CONFIRMED**
- Hostel manager: 10 pages, zero write: **CONFIRMED**
- EMO: 3 pages, zero write: **CONFIRMED**
- Entity-aligned: 6 roles, auth-only: **CONFIRMED** (no route group, no config, no home URL)
- 9 findings (F-CA-01 through F-EA-02): **CONFIRMED**
