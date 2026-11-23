# Supervisor — how it works

## Overview
The `supervisor` role manages campus security operations, gate staff, guard shifts, and operational escalations. The supervisor oversees physical gate kiosks, monitors live camera feeds and ingress/egress throughput across all campus gates simultaneously, manages guard rosters, issues gate claim codes, and resolves exceptions.

The supervisor acts as the primary operational authority for gate security, possessing override privileges on gate exceptions, curfew violations, and visitor overstay incidents.

## Pages & workflows
- **/supervisor and /supervisor/home**: Supervisor operations console. Displays live gate overview, shift summary, open escalations, and incident queues.
- **/supervisor/gates, /supervisor/gates/live, /supervisor/gates/wall, and /supervisor/gates/activity**: Comprehensive gate monitoring suite. `/gates/wall` provides a multi-gate grid view showing live statuses, camera streams, and active operators. `/gates/activity` streams real-time entry and exit events across all campus boundaries.
- **/supervisor/response, /supervisor/response/escalations, /supervisor/response/exceptions, and /supervisor/response/incidents**: Incident response center. Handles escalated gate alerts, unauthorized egress attempts, expired passes, watchlist matches, and security breaches requiring supervisor intervention or sign-off.
- **/supervisor/shift, /supervisor/shift/live, /supervisor/shift/handover, and /supervisor/shift/history**: Guard shift lifecycle management. Tracks active shifts in real time, executes digital shift handovers with open exception checklists, and reviews historical logs.
- **/supervisor/team, /supervisor/team/workers, /supervisor/team/shifts, and /supervisor/team/curfew**: Staff and curfew management. Manages guard roster schedules, assigns operators to specific gates, monitors curfew compliance, and issues gate claim codes.
- **/supervisor/reports**: Operational reporting and analytical summaries covering movement trends, gate congestion, curfew breaches, and incident resolution times.
- **/supervisor/profile**: Supervisor profile, credentials, and notification settings.

## Key API endpoints
| Endpoint | Method(s) | What it does |
|---|---|---|
| `/supervisor/dashboard` | GET | Aggregates campus-wide security metrics: active gates, online operators, open escalations, and incident counts. |
| `/supervisor/gate-live` | GET | Fetches live real-time state for all gates (current mode, active operator, recent scans, and alert status). |
| `/supervisor/claim-codes` | DELETE, GET, POST | Generates, lists, and revokes gate claim codes used by operators/workers to bind to gate kiosks. |
| `/supervisor/escalations` | GET | Lists open security escalations and scan exceptions requiring supervisor intervention. |
| `/supervisor/visitors/overstay` | GET | Detects visitor passes where exit time has exceeded permitted duration without checkout. |
| `/supervisor/visitors/watchlist` | GET, POST | Manages the campus security watchlist and queries flagged individuals. |
| `/supervisor/shift` | GET, POST | Retrieves active shift roster and submits shift rotation/handover reports. |
| `/supervisor/team-roster` | GET | Lists all gate operators and workers, their current shift assignments, and attendance status. |
| `/supervisor/assignees` | GET | Returns available staff members for incident dispatch and shift reassignment. |
| `/gates` | DELETE, GET, PATCH, POST | Administrative CRUD operations for physical campus gates and checkpoints. |
| `/gates/[id]` | DELETE, PATCH | Updates gate configuration (name, location, camera stream URL, active status). |
| `/gates/schedule` | GET, POST | Configures automated gate operation schedules (e.g. curfew hours, lock hours). |
| `/gate/stream` | GET | SSE stream delivering instant real-time scan events, alerts, and state changes across all gates. |
| `/gate/devices` | GET | Live telemetry for gate hardware and connected operator terminals. |
| `/gate/verify-leave-chain` | GET | Validates the hierarchical leave approval chain for contested student movements. |

## Data flow
1. **Multi-Gate Monitoring & Live Telemetry**:
   - The supervisor dashboard connects to `/api/gate/stream` (SSE) and polls `/api/supervisor/gate-live`.
   - Gate scan events from all operator desks stream into the supervisor wall display in sub-second latency.
   - When an operator flags an exception, an escalation record is published and appears in `/supervisor/response/escalations`.
2. **Shift Management & Claim Code Issuance**:
   - At shift start, the supervisor generates gate claim codes via `POST /api/supervisor/claim-codes`.
   - Operators enter the claim code at their terminal (`/operator/claim`), binding themselves to the gate.
   - At shift end, the supervisor executes `/supervisor/shift/handover`, cataloging open items, incident summaries, and passing control to the incoming supervisor.

## Security notes
- **Authentication**: JWT access token delivered via HttpOnly cookie and Authorization Bearer header, paired with rotating refresh tokens (`/api/auth/refresh`). Session state is revalidated against `/api/auth/session`.
- **Device Binding (M4)**: Enforces `device_id` cookie verification matching the token's `dh` SHA-256 hash.
- **Supervisor Role Elevation**: Requires `ROLES.SUPERVISOR`. Endpoints permit modifying gate modes, issuing claim codes, and dismissing security escalations. High-risk administrative actions (e.g. watchlist insertion, manual curfew overrides) write to `audit_events`.
- **Dual-Control Gates**: Sensitive overrides require supervisor authentication and an explicit audit reason before state transition occurs.


## Gaps & Research

### Institutional context
Per NIT Hamirpur security SOP: "The Security room at Gate 1 Exit side will be the Control Room for Security... The Control Room will be under the control of Security Supervisor who shall forward the case to the related authority."

The Supervisor is the single point of escalation for all gate security matters. Maintains the watchlist, handles overstay alerts, and coordinates shift handovers across all gates.

### Missing (not in app yet)
1. **Exception severity levels** — no structured severity levels for gate exceptions
2. **Watchlist photo capture** — no photo capture for watchlist entries
3. **Emergency response protocol** — no structured emergency response protocol
4. **Real-time all-gate map** — no visual map of all gates with live status
5. **Supervisor workload** — no tracking of exception count and resolution time
6. **Cross-gate coordination** — no way to coordinate operators across multiple gates
7. **Security incident report** — no structured incident report for security events
8. **Supervisor KPI dashboard** — no KPI view of gate security performance

### Implementation notes
- Dashboard leads with all-gate live view, exception queue, watchlist
- Supervisor agent is the escalation hub for gate security
- Exceptions: structured queue with severity, status, and resolution
- Watchlist: changes require Admin approval
- Overstay: real-time alerts with visitor details and host info

### Agent persona
- Focus: gate security, exceptions, watchlist, overstay, shift handover
- Can: resolve exceptions, manage watchlist, view all gates, handle overstay
- Cannot: modify gate configuration (admin territory), approve watchlist changes without Admin
- Escalation: to Admin for operational matters; to Principal for security matters

