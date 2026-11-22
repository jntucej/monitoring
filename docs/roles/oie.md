# Officer-in-Charge of Examinations (OIE) — how it works

## Overview
The Officer-in-Charge of Examinations (OIE) manages the operational desk within the Examination Branch at JNTUH CEJ. The OIE acts as the critical triage layer between day-to-day examination operations (hall seating, hall tickets, candidate attendance) and senior academic leadership (Controller of Examinations, Vice-Principal, Principal).

The OIE oversees candidate eligibility disputes, condonation issues, late arrivals, and exam-day access exceptions. When an exam session begins, candidates facing attendance blocks, missing hall tickets, or gate access anomalies route through the OIE's **Decision Queue**. The OIE evaluates each case and either issues emergency clearance, assigns a conditional pass, or escalates severe irregularities to the Vice-Principal or Exam Superintendent.

The OIE workspace is styled in an orange theme (`#fff7ed` surface tint) with composed motion, anchored by the `DecisionQueue` and `DecisionHistory` widgets.

## Pages & workflows

### 1. Decision Triage & Queue Management
* **OIE Command Center (`/oie`):** Central landing dashboard presenting prioritized decision streams, pending queues, and active exam-day alerts.
* **Decision Queue (`/oie/queue`, `/oie/queue/pending`, `/oie/queue/escalated`, `/oie/queue/history`):** The operational core where requests for hall-entry permissions, fee clearance waivers, and attendance condonations are sorted by urgency and processed.
* **Decision History & Records (`/oie/decision-history`, `/oie/records`):** Historical archive of all adjudicated candidate exceptions, audit trails, and examination decisions.

### 2. Examination Operations & Exception Handling
* **Examination Day Access (`/oie/examination-day-access`):** Real-time monitoring of campus gate desks and exam hall entry points during exam windows. Handles candidate biometric or RFID scan failures.
* **Candidate Attendance Reconciliation (`/oie/candidate-attendance`):** Reconciles hall seating plans against actual candidate entry scans, highlighting absentees and unallocated candidates.
* **Access Exceptions (`/oie/access-exceptions`):** Generates spot exceptions for candidates detained by fee or gate issues, granting conditional admission to examination halls.
* **Exam Branch & VP Coordination (`/oie/exam-branch-coordination`, `/exam/permissions/oie`, `/vice-principal/*`):** Bridges exam-day incident escalation with the Examination Branch desk and Vice-Principal.

## Key API endpoints

| Endpoint | Method(s) | What it does |
|---|---|---|
| `/oie/queue` | `GET` | Fetches prioritized list of candidate access requests and exam disputes. |
| `/exam/access` | `GET,POST` | Retrieves or creates examination hall access grants and verifies biometric credentials. |
| `/exam/access-exceptions` | `GET,PATCH,POST` | Generates, reviews, and modifies emergency candidate entry permissions. |
| `/exam/candidate-attendance` | `GET` | Provides live attendance reconciliation across active examination halls. |
| `/exam/eligibility-rules` | `GET,POST` | Evaluates student exam eligibility against attendance and condonation criteria. |
| `/exam/hall-tickets/generate` | `POST` | Issues emergency or duplicate hall ticket authorizations. |
| `/permissions/[ticket]` | `GET,PATCH` | Inspects permission tickets or records OIE approval decisions. |
| `/permissions/[ticket]/escalate` | `POST` | Escalates intractable malpractice or eligibility cases to the Vice-Principal. |
| `/permissions/[ticket]/sign` | `POST` | Digitally signs off on a candidate exception or temporary entry pass. |
| `/permissions/[ticket]/verify` | `GET` | Validates authenticity and validity of student exam passes against gate records. |
| `/complaints/[id]` | `DELETE,GET,PATCH` | Reviews student examination grievances and logs official responses. |

## Data flow
1. **Discrepancy Identification:** A candidate is flagged at the gate or exam hall (e.g., biometric mismatch, attendance deficit, missing hall ticket).
2. **Queue Intake:** The issue generates an access exception in the OIE Decision Queue (`/oie/queue`).
3. **Assessment & Resolution:** The OIE inspects eligibility via `/exam/eligibility-rules` and student logs:
   - **Approve:** Issues an exception pass (`/exam/access-exceptions`) signed via `/permissions/[ticket]/sign`.
   - **Reject:** Denies hall entry, recording the justification in the audit trail.
   - **Escalate:** If malpractice or policy violations are suspected, the OIE forwards the ticket to the Vice-Principal or Exam Superintendent.
4. **Gate & Hall Sync:** Approvals immediately propagate to the gate desk and examination superintendent console, permitting physical entry.

## Security notes
* **Authentication:** Secured via rotating JWTs stored in HttpOnly cookies, validated through `/api/auth/session`.
* **RBAC & Authorization:** Protected by server-side `withAuthorization({ requiredRole: ['oie', ...] })` checks. UI access is locked using `AuthGuard allowedRoles={['oie']}`.
* **Separation of Duties:** The OIE can issue conditional day-of-exam access exceptions, but cannot alter published results or permanently clear academic suspensions without HOD and Controller sign-off.
* **Tamper-Evident Logs:** Every exception granted during an active exam window is tagged with the candidate ID, timestamp, proctor station, and OIE user ID.
