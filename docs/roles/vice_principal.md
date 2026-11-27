# Vice-Principal — how it works

## Overview
The Vice-Principal (VP) serves as the chief operational deputy at JNTUH CEJ, reporting directly to the Principal. The VP oversees academic departmental performance, acts as the primary triage authority for approvals flowing upstream from departments and hostels, and bridges campus operations to the executive office.

The Vice-Principal plays a pivotal role in the institutional approval and escalation ladder. Standard leave requests, gate exceptions, academic disputes, and examination permissions escalate from HODs, Deputy Wardens, and the Exam Branch to the Vice-Principal. The VP can either resolve approvals directly or flag complex/high-impact issues up to the Principal via the dedicated **Principal Bridge**. In the absence of the Principal, delegated responsibilities allow the Vice-Principal to discharge administrative duties without modifying underlying database roles.

The Vice-Principal interface utilizes a royal-purple theme (`#faf5ff` surface tint) with composed motion, featuring `ApprovalsQueue`, `DepartmentPerformance`, and `PrincipalBridge`.

## Pages & workflows

### 1. Operations & Decision Triage
* **VP Command Center (`/vice-principal`, `/vice-principal/home`):** Real-time command center showing pending approvals, department KPI health, and active upstream items flagged to the Principal.
* **Approval Pipeline (`/vice-principal/approvals`, `/vice-principal/approvals/pending`, `/vice-principal/approvals/escalated`, `/vice-principal/approvals/all`):** Central desk for acting on permission requests, leave passes, and student gate exceptions that require institutional deputy sign-off.
* **Principal Bridge & Delegations (`/vice-principal/delegated-responsibilities`, `/vice-principal/decision-history`):** Tracks incoming delegations assigned by the Principal, alongside outgoing flags and formal annotations routed upward to the Principal.

### 2. Academic & Departmental Performance
* **Department Oversight (`/vice-principal/academics`, `/vice-principal/academics/departments`, `/vice-principal/department-performance`):** Monitors syllabus completion, class conduction, live class states across B.Tech departments, and attendance anomalies.
* **Academic Exceptions (`/vice-principal/academics/exceptions`, `/vice-principal/attendance-exceptions`):** Reviews attendance threshold exemptions, internal exam clashes, and faculty-escalated academic discrepancies.

### 3. Examination & Hostel Synchronization
* **Examination Coordination (`/vice-principal/examinations`, `/vice-principal/examination-coordination`, `/oie/*`):** Synchronizes with the Office of the Controller of Examinations and OIE regarding examination scheduling, malpractice reviews, and candidate hall access.
* **Hostel & Security Summaries (`/vice-principal/hostel-security-summaries`):** Aggregated, non-PII operational view of hostel block curfews, mess operations, and campus perimeter integrity.
* **Analytics & Escalation (`/vice-principal/analytics`, `/vice-principal/escalated-requests`):** Department performance analytics and escalated request tracking requiring VP intervention.
* **Pending Approvals & History (`/vice-principal/pending-approvals`, `/vice-principal/history`, `/vice-principal/history/7-days`, `/vice-principal/history/30-days`, `/vice-principal/history/90-days`):** Central pending approval queue and time-bounded decision history views.
* **Profile (`/vice-principal/profile`):** VP personal profile and notification preferences.

## Key API endpoints

| Endpoint | Method(s) | What it does |
|---|---|---|
| `/vp/dashboard` | `GET` | Fetches operational metrics: pending approval count, department status, and system alerts. |
| `/vp/bridge` | `GET,POST` | Retrieves or creates escalation items flagged directly to the Principal's executive queue. |
| `/vp/academics` | `GET` | Compiles academic metrics, live class tracking, and departmental performance indicators. |
| `/vp/history` | `GET` | Queries historical approval actions, decisions, and annotations made by the VP. |
| `/vp/hostel-summary` | `GET` | Retrieves aggregate hostel occupancy, curfew statistics, and security breach summaries. |
| `/vp/retention` | `GET` | Gathers engagement metrics, morning brief status, and operational streak telemetry. |
| `/permissions/[ticket]` | `GET,PATCH` | Evaluates permission details and records approve, reject, or comment actions. |
| `/permissions/[ticket]/amend` | `POST` | Modifies parameters (validity, times, conditions) of an in-flight gate pass or leave request. |
| `/permissions/[ticket]/forward` | `POST` | Reroutes an approval ticket to another officer or specific committee. |
| `/permissions/[ticket]/escalate` | `POST` | Escalates an unresolved or high-consequence request to the Principal. |
| `/permissions/[ticket]/sign` | `POST` | Authorizes and applies official digital sign-off to a pass or leave approval. |
| `/academic-status` | `GET,POST` | Reviews pending academic sanctions (`DEBARRED`, `SUSPENDED`) and submits approvals. |
| `/complaints/[id]/cosign` | `POST` | Co-signs or endorses an escalated disciplinary or grievance resolution. |

## Data flow
1. **Submission & Inflow:** Department HODs, Hostel Managers, and OIE escalate unapproved tickets or high-risk requests to the VP approval queue (`/vice-principal/approvals/pending`).
2. **Review & Action:** The Vice-Principal reviews evidence and selects one of four pathways:
   - **Approve/Sign:** Dispatches `/permissions/[ticket]/sign`, unlocking gate entry or academic standing.
   - **Amend:** Updates parameters via `/permissions/[ticket]/amend` before signing.
   - **Bridge/Escalate:** Uses `/vp/bridge` or `/permissions/[ticket]/escalate` to route the item to the Principal.
   - **Reject/Revoke:** Disapproves the request with recorded audit reasoning.
3. **Audit Trail:** Actions update the ticket timeline, trigger audit logging, and reflect on the Principal's strategic scorecard.

## Security notes
* **Session & Token Architecture:** Authenticated using rotating JWT tokens in HttpOnly cookies, verified on every request through `/api/auth/session`.
* **Server-Side RBAC:** Gated strictly via `withAuthorization({ requiredRole: ['vice_principal', ...] })`.
* **Audit Compliance:** All actions via the Principal Bridge are stamped with the VP's user ID, timestamp, and justification.
* **Delegation Boundaries:** When acting under a delegated Principal role, the user's base identity remains `vice_principal`, operating under verified time-bound delegation rules stored in the database.


## Gaps & Research

### Institutional context
The Vice-Principal is the second-highest authority at JNTUH CEJ, reporting directly to the Principal. Discharges the Principal's duties during leave and handles the exam office queue, OIE duties, academic exceptions, and department-level academic review.

In the Gate Monitor system, the VP has a capability-gated view: the Principal Bridge widget shows what the Principal has delegated or flagged. The VP can view live class state, confirm a faculty's class on their behalf, view exam coordination, and view hostel aggregate (no PII).

### Operational standards
- The Vice-Principal acts as Principal's delegate with time-boxed authority
- Exam office queue: OIE handles candidate attendance reconciliation, hall access, and exceptions
- Academic exceptions: the VP reviews and signs off on late submissions, re-sits, and grade disputes
- Department review: the VP reviews HOD reports and curriculum proposals
- The VP can confirm a faculty's class on their behalf if the faculty is absent
- Hostel aggregate: the VP sees occupancy and curfew compliance but no individual student PII

### Missing (not in app yet)
1. **Exam-day command center** — no dedicated view for exam-day operations (candidate attendance, hall access, exceptions)
2. **OIE queue management** — no structured queue for candidate attendance reconciliation
3. **Academic exception workflow** — no formal process for late submissions, re-sits, grade disputes
4. **Principal leave handoff** — no formal process for VP to take over when Principal is on leave
5. **Department KPI dashboard** — no single view comparing all 5 B.Tech + 5 M.Tech departments
6. **VP action log** — no structured log of all VP decisions and their outcomes
7. **Cross-exam coordination** — no view showing all exam centers, candidates, and exceptions in one screen
8. **Hostel aggregate alerting** — no proactive alert when hostel curfew compliance drops below threshold

### Implementation notes
- Dashboard leads with exam office queue, OIE duties, academic exceptions
- VP agent has capability-gated view: what it can see/do is data-driven, not hardcoded
- Principal Bridge is the signature widget: shows what the Principal has flagged or delegated
- Exam-day: the VP console should show candidate attendance, hall access, spot exceptions in real time

### Agent persona
- Focus: exam office queue, OIE duties, academic exceptions, department review
- Can: view live class state, confirm faculty's class, view exam coordination, view hostel aggregate
- Cannot: self-approve; all final authority rests with Principal
- Escalation: exam → OIE → VP → Principal; academic → HOD → VP → Principal



## Cross-Role Dependencies

### VP should see (read-only)
- **principal**: flagged items, delegation chain, exam coordination → What Principal expects
- **hod**: department KPIs, exam proposals, academic status → Department health
- **oie**: exam queue, candidate attendance, exceptions → Exam status
- **exam_branch**: result processing status, hall ticket distribution → Exam progress
- **hostel_manager**: hostel aggregate (no PII) → Hostel KPIs

### VP should NOT see
- **sysadmin**: infra, MFA, RLS → not VP's concern
- **admin**: user governance, audit → not VP's concern

### VP escalates to
- **principal**: all final approvals, DEBARRED, lockdown
- **dean**: academic governance, compliance
- **exam_branch**: result processing, exam disputes

### VP borrows from
- **principal**: flagged items via Principal Bridge (vp flags, principal responds)
- **hod**: exam proposals, academic status (hod creates, vp reviews)
- **oie**: exam queue (oie triages, vp sees)

