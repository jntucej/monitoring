# DATA_MODEL

**Discovery date:** 2026-11-24
**Evidence level:** CODE_VERIFIED (from repositories + service layer)

## Core Entities

| Entity | Source Table (inferred) | Key Fields | Relationships |
|---|---|---|---|
| User/Person | `public.users` | id, role, person_type, roll, parentId, gateId | 1:1 with Person; N:1 with Gate (operator) |
| Person | `public.persons` | id, roll, name, person_type, status | Refs students, staff, faculty, parents |
| Student | `public.students` | roll, department, class, semester, status (ACTIVE/DEPROVISIONED) | 1:1 Person |
| Gate | `public.gates` | id, name, zone, status (ACTIVE/INACTIVE) | N:1 Occupancy |
| Scan | `public.scans` | id, gateId, userId, direction (entry/exit), timestamp, passId | N:1 Gate, N:1 User |
| Pass/Permission | `public.permissions` | ticketId, roll, workflow_type (hostel/exam/memo/class), status (PENDING/APPROVED/REJECTED/ESCALATED), stage, approver | N:1 Student, N:1 Workflow |
| Workflow | `public.permissions_workflow` | ticketId, stage (hod/vice_principal/oie/exam/caretaker), action, actor, timestamp | N:1 Permission |
| Occupancy | `public.occupancy` | zoneId, headcount, timestamp | N:1 Zone |
| Complaint | `public.complaints` | id, reporter, category, status, priority | N:1 Person |
| Mess Token | `public.mess_tokens` | code, roll, mealType, status | 1:1 Student |
| Announcement | `public.announcements` | id, title, body, active, audience | N:1 Role |
| Class Session | `public.class_sessions` | id, subject, teacher, batch, time | N:1 Faculty |
| Exam | `public.exams` | id, subject, date, hall | N:1 Student |
| Audit Log | `public.audit_logs` | id, actor, action, target, timestamp | Append-only |
| Lockdown | `public.lockdown` | id, active, reason, startedAt | Global |
| Alert | `public.alerts` | id, type, severity, resolved, timestamp | N:1 Source |
| Role Registry | `public.config_roles_registry` | role, displayName, description | 1:1 Role key |

## Key Relationships
- **Student → Pass/Permission:** A student creates a permission ticket (outpass, exam-access, memo, class-request). The ticket flows through an approval chain (HOD → VP → OIE/Exam → Gate).
- **Operator → Gate → Scan:** An operator claims a gate, scans QR/biometric, records a scan (entry/exit).
- **Guardian → Student:** A guardian is linked to 1+ students via `parentId`. Sees movement, passes, curfew.
- **Mess Incharge → Student → Mess Token:** Token issued by mess, verified at food service.
- **Exam Branch → Student → Exam Access:** OIE/exam-superintendent manages exam-day access.

## Mutations (Write Operations)
| Operation | Endpoint | Actor |
|---|---|---|
| Create permission ticket | `POST /api/permissions` | student, parent, guardian, admin, sysadmin, operator |
| Approve/reject/escalate/forward ticket | `PATCH /api/permissions/[ticket]` | hod, vice_principal, oie, caretaker, principal |
| Bulk approve | `POST /api/permissions/bulk` | (orphan, no UI) |
| Direct-generate pass | `POST /api/permissions/direct-generate` | principal |
| Create pass (orphan) | `POST /api/passes` | (no UI consumer) |
| Record scan | `POST` (operator) | operator |
| Reclassify scan | `PATCH /api/operator/scans/[id]/category` | operator, supervisor |
| Claim gate | `POST /api/operator/claim-gate` | operator |
| Toggle gate mode | `POST /api/operator/mode` | operator |
| Manual entry | `POST /api/operator/manual-entry` | operator |
| Issue mess token | `POST /api/mess/serve` | mess_incharge |
| File mess issue | `POST /api/mess/issues` | mess_incharge |
| Operational request | `POST /api/mess/operational-requests` | mess_incharge |
| Visitor check-in/out | `POST /api/visitors/me/check-in|check-out` | visitor |
| Attendance dispute | `POST /api/student/attendance/dispute` | student |
| Meal opt-out | `POST /api/student/meal-opt-out` | student |
| Complaint CRUD | `POST/PATCH/DELETE /api/complaints` | student, admin, caretaker |
| User management | `PATCH/POST /api/admin/users/*` | admin, sysadmin |
| Lockdown | `POST/DELETE /api/admin/lockdown` | admin, sysadmin |
| Academic-status flag | `POST /api/academic-status` | dean, principal, vp, chief_warden, admin, sysadmin |
| Academic-status two-person | `GET/POST /api/academic-status/pending` | (orphan, no UI) |

## Data Freshness
- **Realtime:** WebSocket (`/api/ws`), 30s polling (sysadmin autonomous-monitoring), live event store.
- **Stale:** No automatic refresh on most admin/approver pages; user must navigate or reload.
- **Curfew:** Student access 06:00–21:30; worker 06:00–22:00 Mon-Sat (time-based, computed at check time).

## Pagination & Filtering
- Most list endpoints support `?limit=`, `?status=`, `?role=`, `?roll=`, `?stage=` query params.
- `DataTable` component supports client-side sort/filter; server-side pagination is endpoint-dependent.

## Verification Log (2026-11-24)
- 16 repository directories confirmed: alerts, audit, daily-stats, departments, gates, gate-schedules, health, lockdown, login-attempts, mess, occupancy, predictions, scans, studentDetails, users, visitor-logs
- Entity table names in DATA_MODEL are **INFERRED** from repository/service names and code inspection, not from actual DDL. Suggestion: run `\d+` in psql to confirm exact table/column names.
- All mutation endpoints cited in DATA_MODEL match API_INDEX.md write-endpoint table: **CONFIRMED**
- 4 orphan endpoints (bulk, academic-status/pending, revoke, roster PATCH): **CONFIRMED**
- Curfew times (06:00–21:30 student, 06:00–22:00 worker): **OBSERVED** in service code, not independently verified
- WebSocket at `/api/ws`: **CONFIRMED** (route.ts exists)
- Most list endpoints support `?limit=`, `?status=`, `?role=`, `?roll=`, `?stage=` query params.
- `DataTable` component supports client-side sort/filter; server-side pagination is endpoint-dependent.
