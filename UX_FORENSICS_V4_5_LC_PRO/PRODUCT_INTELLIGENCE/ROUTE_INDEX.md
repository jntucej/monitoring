# ROUTE_INDEX — 441 Pages

**Discovery date:** 2026-11-24
**Method:** `find src/app -name "page.tsx" -not -path "*/api/*"`
**Evidence level:** OBSERVED

## Route Groups & Page Counts

| Group | Pages | LOC (approx) | Character |
|---|---|---|---|
| `(sysadmin)/sysadmin` | 76 | ~14,000 | Infrastructure, security, cron, backup, compliance, automation |
| `(admin)/admin` | 69 | ~11,500 | Campus admin: users, roles, gates, depts, classes, announcements, lockdown, occupancy |
| `(student)/student` | 45 | ~3,700 | Student self-service: passes, mess, complaints, attendance, exams, marks, fees, library |
| `(approver)/principal` | 27 | ~3,000 | Principal command center: passes, decisions, attention, escalations, governance, examinations |
| `(approver)/vice-principal` | 24 | ~2,500 | VP: pending-approvals (actionable), escalated, decision-history, academics |
| `(supervisor)/supervisor` | 20 | ~460 | Security supervisor: dashboard, gates, team, shift, response (mostly stubs) |
| `(approver)/faculty` | 16 | ~2,000 | Faculty: class-requests, correction-requests, permissions, my-classes, student-directory, subject (EmptyState stubs) |
| `(operator)/operator` | 14 | ~2,500 | Operator: claim, mode, manual-entry, pass-verification, exceptions, kiosk-pin, lookup, transactions, stats |
| `(approver)/guardian` | 14 | ~2,000 | Guardian: child-status (BROKEN pass-requests), child-requests, movement-info, passes, contact |
| `(approver)/deputy-warden` | 13 | ~1,200 | Deputy warden: curfew, incident-reporting, complaints |
| `(mess)/mess` | 12 | ~2,700 | Mess: dashboard, menu, inventory, meal-counts, scan (POST /mess/serve), reviews, issues, operational-requests |
| `(approver)/oie` | 12 | ~1,500 | OIE: queue (kanban, read-only), candidate-attendance, exam-access, reports |
| `(approver)/hod` | 12 | ~1,500 | HOD: dashboard, approvals (read-only), faculty, students, classes, reports |
| `(approver)/staff` | 10 | ~800 | Staff: my-day, leaves, duties, requests |
| `(approver)/hostel-manager` | 10 | ~900 | Hostel manager: complaints, allocations |
| `(operator)/worker` | 4 | ~400 | Worker: shifts, history, work-orders |
| `(approver)/exam` | 3 | ~500 | Exam permissions (OIE + VP variants) |
| `(approver)/emo` | 3 | ~300 | EMO: complaints |
| `(approver)/caretaker` | 6 | ~1,000 | Caretaker: complaints, workers, maintenance, home (command bar = PATCH permissions) |
| `(operator)/gate` | 2 | ~500 | Gate console: `gate/[gateId]` (500-line orchestrator) |
| top-level `exam/superintendent` | 5 | ~800 | Exam superintendent: home, incidents, schedule, reports |
| top-level `visitor/*` | 8 | ~1,200 | Visitor: visit (POST check-in/out), registration, history, host-info |
| top-level `faculty/attendance` | 1 | ~155 | Faculty attendance (read-only; does NOT mount FacultyRosterPanel) |
| top-level misc | ~30 | ~1,000 | login, profile, settings, security, lock, support, help, campus, mess/default, warden (redirect) |

## Key Access Requirements (AuthGuard allowedRoles)

| Path | Roles | Evidence |
|---|---|---|
| `/sysadmin/**` | sysadmin (some pages: hod, dean, principal, vice_principal, chief_warden, admin) | `AuthGuard` per-page |
| `/admin/**` | admin, sysadmin | `AuthGuard` |
| `/operator/**`, `/gate/**` | operator | `AuthGuard` |
| `/worker/**` | worker, operator | `AuthGuard` |
| `/student/**` | student | `AuthGuard` |
| `/guardian/**` | guardian, parent | `AuthGuard` |
| `/supervisor/**` | supervisor | `AuthGuard` |
| `/mess/**` | mess_incharge | `AuthGuard` |
| `/hod/**` | hod, admin | `AuthGuard` |
| `/principal/**` | principal, admin, sysadmin | `AuthGuard` |
| `/vice-principal/**` | vice_principal, principal | `AuthGuard` |
| `/oie/**` | oie, exam_branch, exam_superintendent | `AuthGuard` |
| `/exam/superintendent/**` | exam_superintendent, exam_branch | `AuthGuard` |
| `/visitor/**` | visitor | `AuthGuard` |
| `/faculty/**` | faculty, hod | `AuthGuard` |
| `/staff/**` | staff | `AuthGuard` |
| `/caretaker/**` | caretaker | `AuthGuard` |
| `/deputy-warden/**` | deputy_warden | `AuthGuard` |
| `/hostel-manager/**` | hostel_manager | `AuthGuard` |
| `/emo/**` | emo | `AuthGuard` |
| `/exam-branch/**` | exam_branch, exam_superintendent, addl_controller_* | `AuthGuard` |

## Notable Redirects (40+ stub pages)
| From | To |
|---|---|
| `/admin/dashboard` | `/admin` → `/admin/overview` |
| `/admin/mess` | (122-byte stub) |
| `/guardian/child` | `/guardian/child-status` |
| `/student/gate-pass` | `/student/passes` |
| `/student/pass-application` | `/student/permissions/new` |
| `/exam/permissions` | `/exam/permissions/oie` |
| `/warden` | `/principal` (client-side redirect; role folded into principal) |
| `/hod/approvals` | `/hod/approvals/pending` |

## Verification Log (2026-11-24)
- Total 441 non-API pages: **CONFIRMED**
- (approver) 152 pages: **CONFIRMED**
- (admin) 69, (sysadmin) 76, (student) 45, (mess) 12, (supervisor) 20, (operator) 20: **CONFIRMED**
- Per-role page counts: principal=27, hod=12, vp=24, guardian=14, oie=12, faculty=16, staff=10, hostel-manager=10, deputy-warden=13, caretaker=6, emo=3, exam=3, worker=4, gate=2: **CONFIRMED**
- 40 redirect() pages: **CONFIRMED** (grep count)
- 28 role keys: **CONFIRMED** (was cited as 24 in initial doc — corrected in MASTER_STATE)
- 28 role docs: **CONFIRMED** (was cited as 31 — corrected)
- 14 Zustand stores: **CONFIRMED** (was cited as 13 — corrected)
- 6 entity-aligned roles (dean, chief_warden, controller_*, addl_controller_*): **CONFIRMED** auth-only, no UI surface, no config file, no route group
| From | To |
|---|---|
| `/admin/dashboard` | `/admin` → `/admin/overview` |
| `/admin/mess` | (122-byte stub) |
| `/guardian/child` | `/guardian/child-status` |
| `/student/gate-pass` | `/student/passes` |
| `/student/pass-application` | `/student/permissions/new` |
| `/exam/permissions` | `/exam/permissions/oie` |
| `/warden` | `/principal` (client-side redirect; role folded into principal) |
| `/hod/approvals` | `/hod/approvals/pending` |
