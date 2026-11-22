# Parent — how it works

## Overview
The parent role represents verified biological or primary parents of students attending JNTUH CEJ. Parents use the portal to stay informed about their child's academic attendance and physical whereabouts, monitor gate entry/exit movements, authorize overnight or weekend hostel outpasses, and schedule official campus appointments.

## Pages & workflows
The parent role shares the unified guardian console (`/guardian/*`) consisting of 14 key routes:

### 1. Child Monitoring & Live Status
- `/guardian`: Primary dashboard providing an immediate snapshot of the child's whereabouts (On Campus / In Hostel / Out on Pass), today's entry/exit timestamps, pending pass approvals, and academic attendance warnings.
- `/guardian/child`, `/guardian/child-status`: Detailed student profile containing registered academic branch, semester, hostel block and room number, and class counselor contact.
- `/guardian/child-attendance`: Granular attendance dashboard displaying aggregate percentage, subject-level lecture counts, and dates marked absent.

### 2. Physical Movements & Gate Tracking
- `/guardian/child-movement`, `/guardian/movement-info`: Chronological history of real-time physical gate movements recorded at campus boundary turnstiles and security checkpoints.
- `/guardian/visit-schedule`: Plan campus visits to meet students or department faculty, submit appointment timings, and receive visitor gate clearance passes.

### 3. Outpass Consent & Leave Applications
- `/guardian/passes`, `/guardian/request-status`, `/guardian/child-requests`: Real-time list of all gate passes (Outpass to Home, Night Out, Medical Leave) requested by the child.
- `/guardian/pass-leave-submission`: Parent-initiated leave submission, allowing parents to directly apply for planned family leaves or emergency travel on behalf of their child.
  - *Outpass Consent Flow*: Child submits an Outpass (Home) at `/student/permissions/new` -> parent receives instant SMS notification with link -> parent logs in at `/guardian` -> navigates to **Passes** -> verifies destination address, travel mode, and expected return time -> clicks **Consent / Approve** (`POST /parents/me/consent` or `POST /parent/leave/acknowledge`) -> system marks `gate_passes.guardian_status = 'APPROVED'` -> pass forwards to caretaker and deputy warden for final clearance.

### 4. Communications & Account
- `/guardian/notifications`: Audit log of push alerts, gate entry/exit notices, late check-in warnings, and institutional announcements.
- `/guardian/contact-info`, `/guardian/settings`: Emergency contact phone numbers, notification delivery preferences (SMS/Push), and account security settings.

## Key API endpoints

| Endpoint | Method(s) | What it does |
|---|---|---|
| `/parents/me` | GET | Returns parent profile details, authenticated contact information, and account status. |
| `/parents/me/children` | GET | Lists all verified children (students) linked to this parent account. |
| `/parents/me/children/[childId]/passes` | GET | Returns historical and pending gate passes for a specific child. |
| `/parents/me/children/[childId]/movements` | GET | Returns gate turnstile and checkpoint movement transactions for the child. |
| `/parent/now` | GET | Fetches real-time status of the child (current campus state, hostel presence, active pass). |
| `/parent/child-activity` | GET | Retrieves aggregated feed of attendance events, gate passes, and notifications. |
| `/parent/weekly-digest` | GET | Generates weekly attendance metrics and movement compliance summary. |
| `/parent/leave/acknowledge` | POST | Approves or acknowledges child's gate pass / hostel leave application. |
| `/parents/me/consent` | POST | Submits cryptographic or formal parental consent for outpass requests. |
| `/parents/link` | POST | Links parent account to a student using enrollment roll number and verification PIN. |
| `/complaints` | GET, POST | Submits institutional feedback or raises student welfare concerns to college authorities. |
| `/campus/events` | GET | Views college-wide academic schedules, parent-teacher meetings, and public notices. |

## Data flow
Upon loading `/guardian`, the application issues simultaneous GET calls to `/api/parents/me`, `/api/parents/me/children`, and `/api/parent/now`. Parent consent triggers a POST call to `/api/parents/me/consent` or `/api/parent/leave/acknowledge`, which updates `gate_passes.guardian_status` in Postgres and unblocks hostel approval workflows. Data is refreshed automatically every 30 seconds via client polling (`usePolling`). Sessions authenticate via a secure JWT access token transmitted in an HttpOnly cookie and Bearer header, with silent token renewal handled by `/api/auth/refresh` and session verification handled by `/api/auth/session`.

## Security notes
Data access is enforced at the database layer using Postgres RLS: parents are permitted to read only student records mapped to their identity via the `parents_students` linking table. Parents cannot access data of unlinked students, modify attendance marks, or unilaterally approve gate passes without subsequent campus administration clearance. A fail-close model governs outpasses: if a parent explicitly denies consent, the gate pass is automatically marked `REJECTED`, preventing gate turnstiles from issuing an exit release regardless of staff override attempts.
