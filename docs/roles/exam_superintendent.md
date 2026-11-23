# Exam Superintendent — how it works

## Overview
The Exam Superintendent (often designated as the Chief Superintendent, a role traditionally held or assigned by the Principal) oversees on-ground examination conduct on test days at JNTUH CEJ. The role acts as the on-site command authority over examination halls, invigilators, candidate verification desks, and examination incident response.

While the Exam Branch handles pre-examination administrative setup and the OIE resolves desk-level candidate disputes, the Exam Superintendent commands live hall sessions. This includes monitoring room-by-room candidate attendance, invigilator deployment, confidential question packet distribution, and real-time incident logging (such as malpractice, medical emergencies, or unauthorized hall departures).

The Exam Superintendent workspace uses a red-orange theme (`#fff7ed` surface tint) with composed motion, built around the `ExamDayCommand` and `IncidentFeed` widgets.

## Pages & workflows

### 1. Live Exam Day Command
* **Exam Day Command Cockpit (`/exam/permissions`, `/exam/permissions/oie`):** Provides live countdown timers for active examination sessions, real-time hall occupancy tallies, and incident telemetry.
* **Examination Day Access (`/oie/examination-day-access`):** Monitors entry gate desks and hall doorways in real-time, verifying candidate transit times and flagging students arriving after the cutoff time.

### 2. Candidate Attendance & Hall Oversight
* **Candidate Attendance Verification (`/oie/candidate-attendance`):** Live dashboard tracking invigilator attendance reports, marked absentees, and D-form sign-offs across all examination halls.
* **Access Exceptions & Spot Clearances (`/oie/access-exceptions`, `/oie/queue`):** Allows reviewing candidate eligibility exceptions issued by the OIE and granting physical hall entry.
* **Decision History & Reports (`/oie/decision-history`, `/oie/examination-reports`, `/oie/records`):** Archives end-of-session attendance returns, incident logs, and invigilator reports.

## Key API endpoints

| Endpoint | Method(s) | What it does |
|---|---|---|
| `/exam/superintendent` | `GET` | Fetches active hall layout, assigned invigilator rosters, and live session status. |
| `/exam/candidate-attendance` | `GET` | Aggregates room-level candidate present/absent counts in real time. |
| `/exam/access` | `GET,POST` | Inspects or creates physical access records for candidates entering examination zones. |
| `/exam/access-exceptions` | `GET,PATCH,POST` | Evaluates spot exceptions granted by the OIE to admit candidates with irregularities. |
| `/exam/eligibility-rules` | `GET,POST` | Checks rule criteria governing late admissions and exam hall entry thresholds. |
| `/exam/hall-tickets/generate` | `POST` | Re-issues or validates hall tickets for candidates presenting corrupt credentials at the door. |
| `/exam/results/process` | `POST` | Dispatches session attendance reconciliation batches to the exam processing pipeline. |
| `/me/workspace` | `GET` | Fetches session context, active hall allocations, and urgent alerts. |
| `/auth/session` | `GET` | Verifies Superintendent authentication session and active role validity. |

## Data flow
1. **Hall Mobilization:** Invigilators report to halls; the Superintendent opens the session view via `/exam/superintendent`.
2. **Access & Verification:** Candidates enter examination halls. Entry checkpoints record scans against `/exam/access`.
3. **Discrepancy Triage:** Candidates with biometric failures or misplaced hall tickets are sent to the OIE for rapid clearance (`/exam/access-exceptions`), visible in real time on the Superintendent console.
4. **Attendance Finalization:** Invigilators submit D-form attendance into `/exam/candidate-attendance`. The Superintendent reviews and finalizes the attendance counts.
5. **Incident Reporting:** Any malpractice or emergency is documented in the incident feed and transmitted upward to the Controller of Examinations and Principal.

## Security notes
* **Authentication:** HttpOnly JWT cookie paired with Bearer access token; revalidated via `/api/auth/session`.
* **RBAC & Authorization:** Protected by `withAuthorization({ requiredRole: ['exam_superintendent', ...] })` and UI guarded by `AuthGuard allowedRoles={['exam_superintendent']}`.
* **Tamper Prevention:** Attendance records finalized by the Exam Superintendent cannot be updated after session closure without two-person authorization from the Controller of Examinations and Principal.
* **Session Integrity:** Exam-day access permissions are strictly time-bounded to the active examination schedule.


## Gaps & Research

### Institutional context
Per JNTUH convention, the Principal acts as Chief Superintendent of Examinations during exam days. The Chief Superintendent runs the exam-day command console, manages candidate attendance, controls hall access, and handles spot exceptions.

Per JNTUH exam office procedures, the Controller of Examinations oversees the exam branch office. The Chief Superintendent is the on-ground authority at the college level. Exam-day operations: candidate attendance, hall discipline, exception handling.

### Missing (not in app yet)
1. **Exam-day KPI dashboard** — no single view of all halls, candidates, and exceptions
2. **Candidate check-in** — no structured candidate check-in at gate
3. **Hall capacity tracking** — no tracking of hall capacity vs candidates
4. **Exception SLA** — no SLA timers for spot exception resolution
5. **Exam discipline log** — no structured log of exam rule violations
6. **Result processing view** — no view of result processing status (that's exam branch)
7. **Exam day schedule** — no visual exam day schedule
8. **Candidate communication** — no way to communicate with candidates on exam day

### Implementation notes
- Dashboard leads with exam-day KPIs: halls, candidates, exceptions
- Exam Superintendent agent is scoped to exam-day operations
- Attendance: real-time candidate check-in across all halls
- Hall access: controlled by Chief Superintendent, enforced in real time
- Exceptions: structured queue with severity and resolution tracking

### Agent persona
- Focus: exam-day operations, candidate attendance, hall access, spot exceptions
- Can: control hall access, log exceptions, track attendance
- Cannot: process results (exam branch), self-approve result publishing
- Escalation: to Principal for non-exam matters; to exam branch for result matters

