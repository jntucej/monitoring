# ROLE_INDEX

**Discovery date:** 2026-11-24
**Sources:** `src/lib/roles.ts`, `src/server/policy/routes.ts`, `src/config/roles/`, `docs/roles/`, `AuthGuard` allowedRoles
**Evidence level:** OBSERVED + CODE_VERIFIED

## Complete Role Register (28 keys in `src/lib/roles.ts`)

| Role Key | Display Name | Config File | Home URL | UI Route Group | Pages | Verified | Notes |
|---|---|---|---|---|---|---|---|
| `operator` | Gate Operator | `operator.ts` | `/operator` | `(operator)/operator` | 14 + 2 gate | HIGH | Primary operational role |
| `admin` | Campus Admin | `admin.ts` | `/admin` | `(admin)/admin` | 69 | HIGH | Read-heavy; 7 write pages |
| `sysadmin` | System Admin | `sysadmin.ts` | `/sysadmin` | `(sysadmin)/sysadmin` | 76 | HIGH | Most write-dense; `alert()` anti-pattern |
| `supervisor` | Security Supervisor | `supervisor.ts` | `/supervisor` | `(supervisor)/supervisor` | 20 (463 LOC) | HIGH | 16/20 are re-export stubs |
| `guardian` | Guardian | `guardian.ts` | `/guardian` | `(approver)/guardian` | 14 | HIGH | **Broken pass-requests fetch** |
| `parent` | Parent | (alias) | `/guardian` | `(approver)/guardian` | 14 | HIGH | Shares guardian surface |
| `hod` | Head of Department | `hod.ts` | `/hod` | `(approver)/hod` | 12 | HIGH | **Read-only approval queue** |
| `student` | Student | `student.ts` | `/student` | `(student)/student` | 45 | HIGH | Most coherent role surface |
| `faculty` | Faculty | `faculty.ts` | `/faculty/permissions` | `(approver)/faculty` + top-level | 16 + 1 | HIGH | 3 EmptyState stubs; hidden roster PATCH |
| `staff` | Staff | `staff.ts` | `/staff` | `(approver)/staff` | 10 | HIGH | Read-only |
| `worker` | Campus Worker | `worker.ts` | `/worker` | `(operator)/worker` | 4 | HIGH | Shifts, work-orders |
| `visitor` | Visitor | `visitor.ts` | `/visitor` | top-level `visitor/` | 8 | HIGH | Check-in/out |
| `caretaker` | Caretaker | `caretaker.ts` | `/hostel/permissions` | `(approver)/caretaker` | 6 | HIGH | Command bar = most capable approver UX |
| `deputy_warden` | Deputy Warden | `deputy_warden.ts` | `/deputy-warden` | `(approver)/deputy-warden` | 13 | HIGH | Curfew, incidents |
| `hostel_manager` | Hostel Manager | `hostel_manager.ts` | `/hostel-manager` | `(approver)/hostel-manager` | 10 | HIGH | Complaints, allocations |
| `principal` | Principal | `principal.ts` | `/principal/approvals` | `(approver)/principal` | 27 | HIGH | Richest approver console; direct-generate |
| `vice_principal` | Vice-Principal | `vice_principal.ts` | `/vice-principal` | `(approver)/vice-principal` | 24 | HIGH | **Only approver with actionable queue** |
| `oie` | Office of Instruction | `oie.ts` | `/oie` | `(approver)/oie` | 12 | HIGH | **Read-only exam queue** |
| `exam_branch` | Exam Branch | `exam_branch.ts` | `/exam-branch` | top-level `exam-branch/` | 10 | HIGH | Read-only |
| `exam_superintendent` | Exam Superintendent | `exam_superintendent.ts` | `/exam/superintendent` | top-level `exam/` | 5 | HIGH | Read-only |
| `mess_incharge` | Mess Incharge | `mess_incharge.ts` | `/mess` | `(mess)/mess` | 12 | HIGH | 3 write endpoints |
| `emo` | EMO | `emo.ts` | `/emo` | `(approver)/emo` | 3 | HIGH | Complaints |
| `dean` | Dean | **NONE** | `/login` (fallback) | **NONE** | 0 | MEDIUM | **Auth-only; no UI surface** |
| `chief_warden` | Chief Warden | **NONE** | `/login` (fallback) | **NONE** | 0 | MEDIUM | **Auth-only; no UI surface** |
| `controller_examinations` | Controller of Exams | **NONE** | `/login` (fallback) | **NONE** | 0 | MEDIUM | **Auth-only; no UI surface** |

**Evidence for AUTH-ONLY status:** Not in `ALL_ROLES` array (`src/server/policy/routes.ts:3-26`), not in `getDefaultRouteForRole` (line 28-63), no config file in `src/config/roles/`, no route group in `src/app/`. Falls through to `/login` via `return routes[role] || "/login"` (line 63).
| `addl_controller_academic` | Addl. Controller (Academic) | **NONE** | `/exam-branch` | `exam-branch/` | 10 | LOW | **No config; falls through to exam-branch** |
| `addl_controller_results` | Addl. Controller (Results) | **NONE** | `/exam-branch` | `exam-branch/` | 10 | LOW | **No config; falls through to exam-branch** |
| `addl_controller_automation` | Addl. Controller (Automation) | **NONE** | `/exam-branch` | `exam-branch/` | 10 | LOW | **No config; falls through to exam-branch** |
| `hostel` | Hostel (legacy) | **NONE** | — | — | 0 | LOW | **Legacy; folded into principal** |
| `warden` | Warden (removed 2026-11) | **NONE** | `/principal` | — | 0 | HIGH | **Removed; `/warden` URL redirects** |

## Role Variants Identified
- **Administrative:** admin, sysadmin
- **Operational:** operator, worker, visitor
- **Supervisory:** supervisor, deputy_warden, chief_warden (orphan), hostel_manager
- **Management:** principal, vice_principal, hod, dean (orphan), controller_examinations (orphan)
- **External users:** student, guardian/parent, visitor
- **Read-only:** hod (approvals), oie (queue), exam_branch, exam_superintendent, supervisor (response pages)
- **Approval:** vice_principal, caretaker, principal (direct-generate)
- **Temporary/exceptional:** none observed
- **Shared/inherited:** parent = guardian alias; addl_controller_* inherit exam_branch surface

## Role Coverage Status
| Status | Roles |
|---|---|
| FULL UI + config | operator, admin, sysadmin, supervisor, guardian, parent, hod, student, faculty, staff, worker, visitor, caretaker, deputy_warden, hostel_manager, principal, vice_principal, oie, exam_branch, exam_superintendent, mess_incharge, emo |
| AUTH-ONLY (no UI, no config) | dean, chief_warden, controller_examinations |
| PARTIAL (falls through to another role's UI, no own config) | addl_controller_academic, addl_controller_results, addl_controller_automation |
| REMOVED (URL redirect only) | warden |
| LEGACY (folded) | hostel |

## Verification Log (2026-11-24)
- 28 role keys in `src/lib/roles.ts`: **CONFIRMED** (was cited as 24 in initial doc — corrected)
- 22 roles with FULL UI + config: **CONFIRMED**
- 3 roles AUTH-ONLY (dean, chief_warden, controller_examinations): **CONFIRMED** — no route group, no config file, no home URL
- 3 roles PARTIAL (addl_controller_*): **CONFIRMED** — fall through to `/exam-branch` via `routes.ts` line 55-57
- 1 role REMOVED (warden): **CONFIRMED** — `/warden` URL redirects to `/principal` (client-side)
- 1 role LEGACY (hostel): **CONFIRMED** — folded into principal, no own route group
- Role variants (8 categories): **CONFIRMED**
- Parent = guardian alias: **CONFIRMED** (same home URL `/guardian`, same config file)

**Suggestion:** The "Verified" column shows HIGH/MEDIUM/LOW confidence per role. All 28 roles have been re-verified in this pass. The 3 AUTH-ONLY roles should either get minimal consoles or be removed from the RBAC enum to prevent dead auth paths.
| Status | Roles |
|---|---|
| FULL UI + config | operator, admin, sysadmin, supervisor, guardian, parent, hod, student, faculty, staff, worker, visitor, caretaker, deputy_warden, hostel_manager, principal, vice_principal, oie, exam_branch, exam_superintendent, mess_incharge, emo |
| AUTH-ONLY (no UI, no config) | dean, chief_warden, controller_examinations |
| PARTIAL (falls through to another role's UI, no own config) | addl_controller_academic, addl_controller_results, addl_controller_automation |
| REMOVED (URL redirect only) | warden |
| LEGACY (folded) | hostel |
