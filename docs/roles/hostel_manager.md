# Hostel Manager — how it works

## Overview
The `hostel_manager` role represents the institutional hostel administrative authority (faculty in-charge / chief residential officer). The hostel manager oversees all campus hostel blocks, supervising Deputy Wardens and Caretakers, managing student room allotments, tracking block occupancy, coordinating housekeeping tasks, handling escalated grievances, and auditing resident returns.

Unlike caretakers whose scope is restricted to individual blocks, the hostel manager possesses campus-wide residential oversight and authority over room inventories, resident disciplinary incidents, and permission workflows.

## Pages & workflows
- **/hostel-manager and /hostel-manager/home**: Executive hostel management dashboard. Summarizes campus residential metrics (`/api/hostel-manager/summary`): total occupancy, vacant beds, active complaints, pending out-pass approvals, and overdue student returns.
- **/hostel-manager/allocation**: Student room allocation engine. Manages room assignments, bed allotments, inter-room transfers, and vacated bed updates across all blocks.
- **/hostel-manager/rooms**: Visual block and room inventory browser. Displays floor plans, room capacities, current occupants, and maintenance statuses.
- **/hostel-manager/residents**: Directory of all resident students. Shows room assignments, branch, semester, contact information, attendance history, and disciplinary logs.
- **/hostel-manager/complaints and /hostel-manager/complaints/[id]**: High-level complaint oversight console. Monitors all open residential complaints across all blocks, resolves escalated disputes, and tracks contractor SLAs.
- **/hostel-manager/housekeeping-tasks**: Operational oversight of housekeeping schedules, sanitation checklists, and common area cleaning audits across hostel premises.
- **/hostel-manager/maintenance**: Preventive and emergency infrastructure maintenance planning, tracking vendor repairs, electrical systems, and civil works.
- **/hostel-manager/resource-management**: Hostel inventory and asset management, covering furniture, fixtures, appliances, water supply systems, and hostel facilities.
- **/hostel/permissions**: Hierarchical out-pass and leave permission review portal. Hostel managers approve long-term leave, emergency exits, and multi-day passes routed beyond deputy wardens.

## Key API endpoints
| Endpoint | Method(s) | What it does |
|---|---|---|
| `/hostel-manager/summary` | GET | Aggregates campus hostel metrics: total occupancy, vacancies, pending tickets, and overdue returns. |
| `/hostel-manager/rooms/allot` | POST | Allots a student to a specific room/bed or processes room transfer requests. |
| `/hostel-manager/housekeeping-tasks` | GET | Lists daily housekeeping tasks, inspection statuses, and completion rates. |
| `/hostel-manager/incidents` | GET, POST | Records and lists disciplinary or safety incidents within hostel premises. |
| `/hostel-manager/incidents/[id]/escalate` | POST | Escalates severe disciplinary issues to the Chief Warden or Principal. |
| `/hostel/blocks` | GET | Returns all hostel blocks, capacities, occupancy counts, and block warden assignments. |
| `/hostel/blocks/[block]/rooms` | GET | Lists all rooms within a specified block, detailing bed capacity and current occupants. |
| `/hostel/blocks/[block]/students` | GET | Retrieves roster of all active students residing in a specific hostel block. |
| `/hostel/returns-timeline` | GET | Monitors curfew returns, flagging students who failed to return to their hostel by deadline. |
| `/complaints` | GET, POST | Reads and manages resident complaints across all blocks. |
| `/complaints/[id]` | DELETE, GET, PATCH | Inspects ticket details, re-assigns priority, adds administrative comments, or closes complaints. |
| `/complaints/analytics/domain-breakdown` | GET | Analyzes complaint distribution across categories (electrical, plumbing, Wi-Fi, hygiene). |
| `/complaints/analytics/sla-breaches` | GET | Identifies overdue complaints and SLA violations across all hostel maintenance staff. |
| `/complaints/export/advanced` | GET | Exports residential complaint and maintenance audit data for administrative review. |

## Data flow
1. **Room Allotment & Onboarding**:
   - The hostel manager opens `/hostel-manager/allocation`.
   - The UI fetches available blocks via `/api/hostel/blocks` and unoccupied beds via `/api/hostel/blocks/[block]/rooms`.
   - Submitting an allotment triggers `POST /api/hostel-manager/rooms/allot`, updating student room records and hostel occupancy statistics.
2. **Escalations & Night Returns Audit**:
   - The night curfew reconciler updates student return statuses.
   - The hostel manager reviews `/api/hostel/returns-timeline` to inspect missing students or unauthorized late entries.
   - If a disciplinary infraction occurs, the manager logs an incident via `POST /api/hostel-manager/incidents` and can escalate to higher administration via `/incidents/[id]/escalate`.

## Security notes
- **Authentication**: JWT access token delivered via HttpOnly cookie and Authorization Bearer header, paired with rotating refresh tokens (`/api/auth/refresh`). Session state is revalidated against `/api/auth/session`.
- **Device Binding (M4)**: Enforces `device_id` cookie check against the JWT `dh` claim on every authenticated call.
- **Institutional Authority**: Enforced via `withAuthorization` requiring `ROLES.HOSTEL_MANAGER`. Permitted to perform campus-wide allotments and close tickets across all hostel blocks.
- **Dual Approval & Audit**: Room reassignments and incident escalations are permanently captured in the central audit ledger.
