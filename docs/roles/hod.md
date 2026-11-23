# HOD — how it works

## Overview
The HOD (Head of Department) role represents academic department heads (e.g. CSE, ECE, EEE, MECH, CIVIL) at JNTUH CEJ. HODs oversee department-wide academic operations, faculty teaching compliance, student attendance retention trends, curriculum schedules, and escalated academic disciplinary or status changes.

## Pages & workflows
The HOD role utilizes the faculty academic suite along with elevated departmental oversight and academic status routes (16 pages):

### 1. Departmental Oversight & Academic Status
- `/faculty`: Primary operational console, extended for HODs with department health metrics, attendance deficit warnings across batches, and unverified lecture alerts.
- `/sysadmin/academic-status`: Departmental review and flagging of student academic standing (e.g., flagging students for SUSPENDED, DEBARRED, or LATERAL_JOIN). Flags submitted by the HOD land in `pending_approvals` for Dean, Principal, or Vice Principal executive sign-off.
- `/faculty/reports`: Comprehensive departmental reports on student detention risks (<75% attendance threshold), faculty syllabus coverage, and midterm marks distributions.

### 2. Department Faculty & Class Timetable Governance
- `/faculty/my-classes`, `/faculty/class`, `/faculty/class/[id]`: Department course offerings, batch structures, and assigned faculty allocations.
- `/faculty/subject`, `/faculty/subject/classes`, `/faculty/subject/attendance`: Department syllabus progression, lecture delivery adherence, and section-by-section attendance parity.
  - *Timetable Adjustment Workflow*: HOD reviews departmental timetable conflicts or faculty absence -> accesses flexible class management -> invokes `PATCH /hod/flexible-class/[id]` to reassign classroom lecture slots or designate substitute faculty -> changes propagate to faculty schedules and student timetables.

### 3. Escalated Requests & Attendance Dispute Arbitration
- `/faculty/class-requests`, `/faculty/request-history`: Escalated student leave requests, on-duty (OD) event delegations involving inter-college competitions, and long-term medical absence clearances.
- `/faculty/correction-requests`: Second-tier approval for disputed attendance marks that exceed the faculty member's standard editing window.
  - *Dispute Arbitration Workflow*: Class teacher refers unresolved attendance dispute -> HOD reviews student audit log and class logs -> confirms rectification via departmental override or upholds faculty mark -> records audit entry.

### 4. Examinations, Student Directory & Institutional Comms
- Examination reviews: HOD reviews internal midterm question proposals, student eligibility lists, and marks submissions via `/api/hod/exam-review`.
- `/faculty/student-directory`: Department-wide student directory with complete academic, hostel, and contact histories.
- `/faculty/notifications`, `/faculty/permissions`: Official department-wide notifications, administrative circulars, and permissions for departmental technical symposiums.

## Key API endpoints

| Endpoint | Method(s) | What it does |
|---|---|---|
| `/hod/dashboard` | GET | Fetches high-level department KPIs (student count, faculty on duty, attendance alerts). |
| `/hod/faculty` | GET | Retrieves list of all department faculty members, workload allocations, and teaching bindings. |
| `/hod/pulse` | GET | Delivers real-time telemetry on active lectures, ongoing labs, and campus attendance rate. |
| `/hod/retention` | GET | Analyzes student retention, chronic absenteeism risks, and condonation lists. |
| `/hod/schedule` | GET | Fetches comprehensive department lecture and laboratory master timetable. |
| `/hod/exam-review` | GET, POST | Inspects, endorses, or returns internal examination marks submitted by department faculty. |
| `/hod/flexible-class/[id]` | PATCH | Modifies class session parameters, reallocates lecture rooms, or assigns substitute faculty. |
| `/complaints` | GET, POST | Reviews or manages academic grievances directed to the department head. |
| `/complaints/[id]/timeline` | GET | Inspects full audit history and action trail of department-related complaints. |
| `/complaints/analytics/summary` | GET | Delivers domain-level resolution metrics and SLA statistics for department complaints. |
| `/auth/session` | GET | Validates HOD authenticated credentials and returns role authorization context. |
| `/me/workspace` | GET | Retrieves workspace layout configurations and departmental action widgets. |

## Data flow
When the HOD accesses the console, the dashboard executes calls to `/api/hod/dashboard`, `/api/hod/pulse`, and `/api/hod/retention` to construct the departmental pulse view. When modifying a class schedule or assigning substitutes, the frontend issues a PATCH request to `/api/hod/flexible-class/[id]`. Academic status updates route through `/api/academic-status`. Session authentication is maintained via HttpOnly JWT cookies alongside Bearer token headers, verified on client transitions via `/api/auth/session` and refreshed seamlessly by `/api/auth/refresh`.

## Security notes
HOD operations are strictly bound by departmental tenancy: an HOD belongs to a specific department (e.g. CSE) and Postgres RLS restricts all modifications to students, faculty, and classes within that department. An HOD cannot alter records in other academic departments. An HOD cannot unilaterally issue gate exit passes for students (which belongs to hostel and gate management) or alter campus security gate devices. Marking a student as `DEBARRED` operates under fail-close governance: the HOD initiates the status flag, but the gate restriction is parked in `pending_approvals` until executive approval from the Principal or Dean is recorded.


## Gaps & Research

### Institutional context
The HOD is the academic head of a single department. There are 5 B.Tech departments (EEE, ME, ECE, CSE, IT) and 5 M.Tech specializations, each with its own HOD. The HOD role is scoped to a single department via auth.departmentId.

In real institutional life, the HOD:
- Convenes and presides over department meetings and Board of Studies
- Organizes teaching and research work
- Frames the time table
- Maintains discipline in classrooms and laboratories
- Assigns duties to teachers and exercises control over non-teaching staff
- Is responsible for department records, equipment, and library
- Operates the department budget

Per UGC / JNTUH ordinances, the HOD is the primary academic authority within the department. DEBARRED requires two-person approval (HOD + Dean/Principal).

### Missing (not in app yet)
1. **Department KPI dashboard** — no single view showing department performance, attendance, marks, and compliance
2. **Faculty workload heat map** — no visual representation of faculty workload distribution
3. **Marking entry workflow** — no structured workflow for faculty to enter marks and HOD to verify
4. **Board of Studies minutes** — no digital record of department council decisions
5. **Cross-department comparison** — no way for HOD to see how their department compares to others
6. **Student mentor tracking** — no structured mentor-mentee relationship tracking
7. **Lab mark integration** — no integration with lab practical marks entry
8. **CBT result tracking** — no view of Computer Based Test results per student

### Implementation notes
- Dashboard leads with department KPIs: attendance, marks, faculty workload, compliance
- HOD agent is scoped to a single department — always show the department name in the UI
- Academic status: DEBARRED requires two-person approval (HOD + Dean/Principal)
- Exam proposals: structured form with schedule, question paper reference, and CBT integration

### Agent persona
- Focus: department operations, faculty workload, academic status, exam proposals
- Scoped to: a single department (EEE/ME/ECE/CSE/IT)
- Can: flag academic status, approve faculty leave, submit exam proposals, view class analytics
- Cannot: self-approve DEBARRED (needs Dean/Principal), cross-department actions
- Escalation: to Principal/VP for department-level decisions; to OIE for exam matters

