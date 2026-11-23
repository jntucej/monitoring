# Guardian — how it works

## Overview
The guardian role represents authorized non-parent custodians and local guardians of enrolled students at JNTUH CEJ. Guardians use the portal to monitor ward campus presence, review attendance records, schedule campus visits, and grant digital consent for student gate passes and leave requests.

## Pages & workflows
The guardian interface is organized into 14 routes across student supervision, pass approvals, and campus visits:

### 1. Ward Monitoring & Attendance
- `/guardian`: Landing dashboard displaying the linked ward's current status card, today's gate check-in/out status, pending permission consent requests, and campus emergency announcements.
- `/guardian/child`, `/guardian/child-status`: Comprehensive ward overview showing hostel room assignment, academic program, student photo ID, and emergency contact details.
- `/guardian/child-attendance`: Detailed breakdown of student attendance percentages across subjects, day-wise presence logs, and class absent notices.

### 2. Movements & Visit Scheduling
- `/guardian/child-movement`, `/guardian/movement-info`: Real-time and historical gate movement records showing turnstile/boom-barrier timestamps, direction (IN / OUT), and verified gate location.
- `/guardian/visit-schedule`: Schedule an upcoming campus visit to meet the student or campus authorities, register vehicle details, and track visit permit authorization.

### 3. Pass Approval & Leave Management
- `/guardian/passes`, `/guardian/request-status`, `/guardian/child-requests`: Real-time queue of gate pass and outpass applications submitted by the ward requiring guardian sign-off.
- `/guardian/pass-leave-submission`: Direct submission workflow where a guardian applies for an outpass or leave on behalf of the student.
  - *Consent Workflow*: Guardian opens `/guardian` or `/guardian/passes` -> clicks on pending pass -> reviews destination, departure time, and expected return timestamp -> clicks **Approve** or **Reject** with optional remarks -> triggers `POST /parent/leave/acknowledge` or `POST /parents/me/consent` -> status changes to `GUARDIAN_APPROVED`, releasing the ticket to the next staff approver in the chain.

### 4. Communications & Account Settings
- `/guardian/notifications`: Inbound SMS and push alert history regarding gate exits, curfew breaches, and institutional circulars.
- `/guardian/contact-info`, `/guardian/settings`: Update guardian contact telephone/address details, verify student linkage integrity, and configure notification preferences.

## Key API endpoints

| Endpoint | Method(s) | What it does |
|---|---|---|
| `/parents/me` | GET | Fetches authenticated guardian profile details and verified contact info. |
| `/parents/me/children` | GET | Returns array of linked students (wards) assigned to this guardian. |
| `/parents/me/children/[childId]/passes` | GET | Retrieves active and historical gate passes for a specific ward. |
| `/parents/me/children/[childId]/movements` | GET | Lists turnstile gate entry and exit event logs for the selected ward. |
| `/parent/now` | GET | Fetches live status snapshot of the ward (campus presence, hostel curfew status). |
| `/parent/child-activity` | GET | Returns chronological timeline of recent ward activities, passes, and alerts. |
| `/parent/weekly-digest` | GET | Provides a weekly attendance and movement compliance summary for the ward. |
| `/parent/leave/acknowledge` | POST | Approves or acknowledges a student-requested outpass or hostel leave. |
| `/parents/me/consent` | POST | Records digital consent decisions on pending pass tickets. |
| `/guardian/links/reverify` | POST | Self-service reverification of guardian-ward relationship mapping against active records. |
| `/guardian/verify` | POST | Completes OTP/identity verification during guardian onboarding or phone change. |
| `/parents/link` | POST | Initiates linkage between guardian account and ward via student enrollment ID. |
| `/complaints` | GET, POST | Views or submits parental/guardian grievances to campus administration. |

## Data flow
When the guardian lands on `/guardian`, the page invokes `/api/parents/me` to identify authenticated credentials, followed by `/api/parents/me/children` and `/api/parent/now` to load ward metrics. Pass consent actions POST directly to `/api/parent/leave/acknowledge` or `/api/parents/me/consent`. Data refreshes via periodic client polling (`usePolling` hook on a 30s interval) to capture instant gate departure and entry scans. Sessions are secured with an HttpOnly cookie containing a signed JWT token paired with Bearer authentication; the session identity is continuously validated against the server via `/api/auth/session`.

## Security notes
Guardians are strictly confined by Postgres RLS to view data exclusively for students mapped via `student_details.guardian_id` or `parents_students` linking tables. A guardian cannot view other students' passes, override campus disciplinary flags, or issue gate passes directly bypassing faculty/hostel approvers. Guardian link verification uses fail-close security: if the ward's profile transitions to `INACTIVE` or `SUSPENDED`, or if the guardian link fails reverification (`/api/guardian/links/reverify`), consent actions and pass visibility are immediately restricted.


## Gaps & Research

### Institutional context
The Guardian is specifically the local guardian — the person the student lives with if not in a hostel. The Parent role has broader academic visibility. The Guardian is distinct from the Parent role.

Per JNTUH CEJ gate-pass rules, parent/guardian acknowledgement is a required step in the gate-pass chain for hostel students. Without acknowledgement, the pass is not issued.

### Missing (not in app yet)
1. **Fee payment integration** — no direct payment link for fee dues
2. **Academic alerting** — no proactive alert when child's attendance drops below threshold
3. **Leave approval status** — no real-time view of leave approval status
4. **Visitor notification** — no notification when a scheduled visitor arrives
5. **Multiple child support** — no support for guardians of multiple children
6. **Communication log** — no structured log of communications with the institution
7. **Emergency contact** — no way to set/update emergency contact for the child
8. **Hostel visit booking** — no structured booking for hostel visits

### Implementation notes
- Dashboard leads with child's fee status, academic progress, leave requests
- Guardian agent is scoped to their child's records
- Fee: read-only view with payment schedule
- Leave: structured request with HOD/Principal approval tracking
- Gate-pass: acknowledgement is a required step for hostel students

### Agent persona
- Focus: child's fees, academics, leave, gate-pass acknowledgement
- Scoped to: their child's records
- Can: view fees/academics, request leave, acknowledge gate passes, schedule visitors
- Cannot: approve leave (needs HOD/Principal), modify academic records
- Escalation: to HOD for academic; to Hostel Manager for gate-pass; to Principal for disputes



## Cross-Role Dependencies

### Guardian should see (read-only)
- **student**: attendance %, marks, gate passes → Child's status
- **admin**: fee dues, payment status → Child's financial status
- **deputy_warden**: curfew status, visitor log → Child's hostel status

### Guardian should NOT see
- **sysadmin**: infra, MFA, RLS → not guardian's concern
- **admin**: user governance, audit → not guardian's concern

### Guardian escalates to
- **faculty**: academic concerns
- **deputy_warden**: hostel issues
- **admin**: fee disputes, general complaints

### Guardian borrows from
- **student**: gate pass acknowledgements (guardian acknowledges for hostel students)
- **deputy_warden**: curfew status, visitor log (read-only)

