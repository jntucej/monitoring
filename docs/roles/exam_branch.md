# Exam Branch — how it works

## Overview
The Exam Branch represents the administrative examination cell at JNTUH CEJ. It coordinates overall examination lifecycle management: student eligibility validation, hall ticket generation, center jumbling, seating/nominal roll generation, attendance processing, discrepancy detection, and results publication.

In the institutional hierarchy, the Exam Branch operates under the Controller of Examinations and works in tandem with the Additional Controllers (Academic, Results, Automation). While individual faculty enter internal marks and proctors record attendance, the Exam Branch runs automated validation pipelines to detect discrepancies (such as marks entering after cutoff dates, unmapped candidates, or attendance deficits). Discrepancies that cannot be settled automatically are handed off to the OIE or escalated to the Vice-Principal.

The Exam Branch workspace features an amber theme (`#fffbeb` surface tint) with swift motion, centered on the `ExamCalendar` and `DiscrepancyRadar` widgets.

## Pages & workflows

### 1. Examination Planning & Discrepancies
* **Exam Branch Dashboard & Discrepancy Radar (`/exam/permissions`, `/exam-branch`):** Tracks upcoming sessions, hall capacities, and real-time alerts flagging anomalies between student rosters and hall ticket registrations.
* **OIE Handoff & Coordination (`/oie/exam-branch-coordination`, `/exam/permissions/oie`):** Surfaces issues that require operational adjudication by the OIE, such as attendance shortage appeals or late registrations.
* **VP Escalations (`/exam/permissions/vice-principal`, `/vice-principal/examinations`):** Reviews exam policy discrepancies or malpractice cases requiring Vice-Principal authorization.

### 2. Candidate Administration & Hall Operations
* **Candidate Attendance Reconciliation (`/oie/candidate-attendance`):** Consolidates attendance feeds from physical halls into master examination session rosters.
* **Access Exceptions & Emergency Passes (`/oie/access-exceptions`, `/oie/examination-day-access`):** Configures rules under which students with pending dues or minor biometric faults are granted examination gate passes.
* **Decision History & Records (`/oie/decision-history`, `/oie/records`):** Maintains permanent archival records of attendance rosters, nominal rolls, and hall ticket issuances.

## Key API endpoints

| Endpoint | Method(s) | What it does |
|---|---|---|
| `/exam/access` | `GET,POST` | Retrieves and creates candidate examination hall access permits. |
| `/exam/access-exceptions` | `GET,PATCH,POST` | Manages exception records for candidates flagged during pre-exam gate checks. |
| `/exam/candidate-attendance` | `GET` | Compiles attendance returns from examination halls across sessions. |
| `/exam/eligibility-rules` | `GET,POST` | Configures and evaluates eligibility criteria (minimum attendance, fee clearances). |
| `/exam/hall-tickets/generate` | `POST` | Triggers bulk batch generation or re-generation of candidate hall tickets. |
| `/exam/results/process` | `POST` | Initiates marks compilation, grade calculation, and discrepancy validation. |
| `/exam/results/publish` | `POST` | Signs off and publishes final processed examination results to student portals. |
| `/exam/superintendent` | `GET` | Fetches examination hall allocations, assigned invigilators, and superintendent roster data. |
| `/me/workspace` | `GET` | Retrieves active workspace state, exam session context, and notifications. |
| `/auth/session` | `GET` | Revalidates Exam Branch staff session and active RBAC credentials. |

## Data flow
1. **Pre-Exam Configuration:** Exam Branch configures eligibility parameters (`/exam/eligibility-rules`) and ingests attendance/fee rosters from departments.
2. **Hall Ticket Generation:** The branch runs `/exam/hall-tickets/generate`, generating barcoded/QR-coded hall tickets for eligible candidates.
3. **Session Execution:** During exams, attendance is captured live (`/exam/candidate-attendance`). Any gate or seating discrepancy is flagged to the Discrepancy Radar.
4. **Handoff & Resolution:** Discrepancies are resolved by the OIE (`/oie/access-exceptions`) or escalated to the Vice-Principal.
5. **Result Processing & Publication:** Internal marks from faculty and scanned external marks are processed (`/exam/results/process`) and published (`/exam/results/publish`).

## Security notes
* **Authentication:** JWT access tokens (HttpOnly cookie + Bearer) coupled with rotating refresh tokens; revalidated via `/api/auth/session`.
* **Separation of Duties:** Enforces rigid segregation:
  - Faculty input internal marks but cannot process results.
  - Exam Branch processes results but cannot arbitrarily alter raw marks memos without Addl. Controller (Academic) audit reasoning.
  - Final results publication (`POST /exam/results/publish`) requires elevated authorization.
* **RBAC Enforcement:** Secured by server-side `withAuthorization({ requiredRole: ['exam_branch', ...] })`. UI components are protected by `AuthGuard allowedRoles={['exam_branch']}`.
* **Audit Trail:** Every hall ticket reissuance, exception grant, and result processing run is logged with an immutable audit hash.


## Gaps & Research

### Institutional context
Per JNTUH examination branch (jntuh.ac.in), the exam branch is led by the Controller of Examinations with Additional Controllers for academic, results, and automation. At the constituent college level, the exam branch office handles: examination planning, hall ticket generation, center jumbling, observer allotment, seating arrangement, encrypted question papers, spot valuation, evaluator registration, project panels, notifications, results processing, results publishing, convocation services, certificate verification.

Per Indian university exam standards, no single exam role can both enter and publish a result:
- Marks entry (faculty) ≠ result processing (Addl. Ctrl Results) ≠ result sign-off (Controller)

### Missing (not in app yet)
1. **Exam planning dashboard** — no visual exam planning calendar
2. **Hall ticket tracking** — no tracking of hall ticket distribution
3. **Result processing pipeline** — no visual pipeline for result processing
4. **Discrepancy detection** — no automatic detection of result discrepancies
5. **Exam notification management** — no structured notification management
6. **Center jumbling view** — no visual view of center jumbling
7. **Observer allotment** — no structured observer allotment tracking
8. **Convocation management** — no online convocation management

### Implementation notes
- Dashboard leads with exam planning, scheduling, result processing
- Exam Branch agent is the operational authority for exam matters
- Hall tickets: generated and distributed electronically
- Results: processing follows separation of duties chain
- Notifications: structured with priority and delivery tracking

### Agent persona
- Focus: exam planning, scheduling, hall tickets, result processing
- Can: plan exams, generate hall tickets, process results, publish notifications
- Cannot: self-approve result publishing (needs Controller sign-off), control hall access (Chief Superintendent)
- Escalation: to Controller for result matters; to Chief Superintendent for exam-day matters



## Cross-Role Dependencies

### Exam Branch should see (read-only)
- **exam_superintendent**: candidate attendance, hall status → Exam-day data
- **faculty**: internal marks, CBT results → Input for result processing
- **oie**: exam queue, exceptions → What OIE is triaging
- **principal**: result sign-off, exam policy → Final authority

### Exam Branch should NOT see
- **sysadmin**: infra, MFA, RLS → not EB's concern

### Exam Branch escalates to
- **principal**: result publishing (after Controller sign-off)
- **vc**: exam policy, compliance matters

### Exam Branch borrows from
- **faculty**: marks entry (faculty enters, eb aggregates)
- **oie**: exception data (oie triages, eb processes)
- **exam_superintendent**: candidate attendance (cs collects, eb verifies)

