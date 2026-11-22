# Caretaker — how it works

## Overview
The `caretaker` role represents residential block caretakers responsible for day-to-day facilities maintenance, student grievance resolution, housekeeping tracking, and physical asset upkeep within assigned hostel blocks.

Caretakers operate primarily through the complaints and maintenance workflow engine. They receive, triage, assign, and resolve maintenance tickets (plumbing, electrical, carpentry, cleanliness) raised by hostel residents, and oversee ground maintenance staff and workers.

## Pages & workflows
- **/caretaker and /caretaker/home**: Caretaker operational landing page and summary dashboard. Integrates the `ComplaintConsole` (`/caretaker/complaints`) and displays key metrics from `/api/caretaker/summary` (pending repairs, SLA breaches, active workers).
- **/caretaker/complaints and /caretaker/complaints/[id]**: Core complaint resolution interface. Lists student grievances filtered by category, urgency, and block. The detail view permits updating complaint status, adding internal work notes, uploading repair proof photos, assigning workers, and recording resolution details.
- **/caretaker/maintenance**: Maintenance scheduling and task tracker for routine block inspections, servicing cycles, and preventive upkeep.
- **/caretaker/workers**: Roster and task assignment portal for maintenance workers and housekeeping staff assigned to the block.
- **/hostel/permissions**: Resident permission queue allowing caretakers to review and verify student leave requests and block-level permissions within their hostel scope.

## Key API endpoints
| Endpoint | Method(s) | What it does |
|---|---|---|
| `/caretaker/summary` | GET | Returns high-level operational counts: open complaints, high-priority issues, active workers, and today's completed tasks. |
| `/caretaker/maintenance` | GET | Retrieves scheduled maintenance tasks and block servicing records. |
| `/complaints` | GET, POST | Lists complaints scoped to the caretaker's assigned hostel blocks; allows caretakers to lodge tickets on behalf of facilities. |
| `/complaints/[id]` | DELETE, GET, PATCH | Reads full ticket details, attaches notes, reassigns priority, or marks a complaint in-progress / resolved. |
| `/complaints/[id]/timeline` | GET | Retrieves complete audit history and state transition logs for a ticket. |
| `/complaints/[id]/attachments` | GET, POST | Uploads inspection images, repair evidence, or invoice documents for a ticket. |
| `/complaints/[id]/attachments/[attId]` | DELETE, GET | Fetches or removes a specific attachment file from a complaint. |
| `/complaints/[id]/feedback` | POST | Records resident sign-off or caretaker verification feedback on completed repairs. |
| `/complaints/[id]/reopen` | POST | Reopens a ticket if repairs fail post-resolution inspection. |
| `/complaints/categories` | GET | Fetches the taxonomy of complaint domains (electrical, civil, water, hygiene). |
| `/complaints/analytics/summary` | GET | Aggregates resolution time metrics, open ticket age, and SLA adherence. |
| `/complaints/analytics/sla-breaches` | GET | Lists overdue complaints that have breached designated response or resolution SLAs. |
| `/complaints/search` | GET | Full-text search across resident complaints by roll number, room number, or description. |
| `/complaints/audit/trail` | GET | Audit log recording status transitions, reassignments, and notes. |

## Data flow
1. **Ticket Triage & Assignment**:
   - A resident submits a complaint; the system routes it to the block caretaker based on hostel block taxonomy.
   - The caretaker opens `/caretaker/complaints/[id]`, reviews the issue, updates status to `IN_PROGRESS` via `PATCH /api/complaints/[id]`, and dispatches a worker via `/caretaker/workers`.
2. **Resolution & Sign-Off**:
   - The maintenance worker completes physical repairs.
   - The caretaker inspects the work, uploads proof photos via `POST /api/complaints/[id]/attachments`, and marks the ticket `RESOLVED`.
   - The student receives an alert to provide satisfaction feedback (`POST /api/complaints/[id]/feedback`).

## Security notes
- **Authentication**: JWT access token delivered via HttpOnly cookie and Authorization Bearer header, paired with rotating refresh tokens (`/api/auth/refresh`). Session state is revalidated against `/api/auth/session`.
- **Device Binding (M4)**: Validates incoming requests against the `device_id` cookie matching the JWT `dh` claim.
- **Hostel Block Scoping**: Caretakers are restricted via `withAuthorization` and row-level database filters to complaints and assets located within their assigned hostel blocks (`users.hostel_scope`). Attempts to access other blocks return 403 or empty sets.
- **Audit Logging**: Every status transition, note addition, and attachment change writes an entry to `complaint_timeline` with user attribution.
