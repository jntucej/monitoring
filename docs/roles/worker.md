# Worker — how it works

## Overview
The `worker` role represents campus field staff, gate assistants, and physical maintenance workers. Workers have access to gate kiosk functions (running under operator workflows when assigned to gate duty) alongside individual work order tracking, personal shift management, and operational history.

When acting on gates, workers can operate scanning surfaces and manual entry screens under supervised scopes. For facilities and tasks, workers view assigned maintenance jobs, shift rosters, and work orders.

## Pages & workflows
- **/worker**: Main dashboard for worker tasks. Integrates the `RoleDashboardPanel` loading `/api/workers/my-work`, showing pending maintenance tickets, assigned gate shifts, attention queues, and activity timelines.
- **/worker/work-orders**: List and detail views of assigned facilities work orders, maintenance tasks, and their resolution statuses.
- **/worker/shifts**: Personal shift schedule, roster assignments, duty timings, and supervisor contact information.
- **/worker/history**: Historical audit log of completed jobs, recorded gate entries, and shift activity.
- **/worker/profile**: Worker identity, contact information, and role profile.

## Key API endpoints
| Endpoint | Method(s) | What it does |
|---|---|---|
| `/workers/my-work` | GET | Returns pending work orders, assigned maintenance tickets, and gate assignments for the current worker. |
| `/workers/my-shift` | GET | Fetches active shift details, post location, shift start/end times, and supervisor info. |
| `/workers/my-work-orders` | GET | Lists detailed work orders assigned to the worker with status and priority filters. |
| `/workers/personal-history` | GET | Returns historical log of past shifts, completed maintenance jobs, and attendance records. |
| `/workers/assignments` | GET, POST | Retrieves active worker assignments and logs task progress updates. |
| `/workers/attendance` | DELETE, GET, POST | Worker shift attendance clock-in, clock-out, and status checks. |
| `/workers/types` | GET, POST | Retrieves worker skill specializations and trade categories. |

## Data flow
1. **Work Order & Shift Ingestion**:
   - The worker loads `/worker`.
   - The UI fetches `/api/workers/my-work` and `/api/workers/my-shift`.
   - The page renders active work orders, task checklists, and shift assignment details.
2. **Gate Assist Duty Flow**:
   - When rostered at a gate post, the worker claims the desk via `/operator/claim` using a supervisor-issued claim code (`POST /api/operator/claim-gate`).
   - Gate movements are logged via `/gate/scan` or `/operator/manual-entry`.
   - All actions are attributed to `movement_logs.operator_id` with the worker's user ID.

## Security notes
- **Authentication**: JWT access token delivered via HttpOnly cookie and Authorization Bearer header, paired with rotating refresh tokens (`/api/auth/refresh`). Session state is revalidated against `/api/auth/session`.
- **Device Binding (M4)**: Validated against the `device_id` cookie matching the JWT `dh` claim on interactive requests. Kiosk mode utilizes IP/PIN authorization gates.
- **Role Scoping**: Enforced via `withAuthorization` with `ROLES.WORKER`. Access is restricted to personal work orders and assigned gates; system administration and policy modification endpoints are strictly barred.
- **Audit Logging**: Completed work orders, shift handoffs, and gate actions record timestamps and user IDs in audit tables.


## Gaps & Research

### Institutional context
The Worker role represents maintenance workers and grounds staff. Workers use the app on mobile devices in outdoor or workshop environments. The Worker role uses 'large taps, minimal text' UI.

Per Indian university facility management best practices:
- Task assignment: Admin or Hostel Manager assigns tasks with priority, SLA, and completion criteria
- Shift scheduling: workers are scheduled in shifts; handover documentation is required
- Task completion: workers mark tasks complete with photo evidence
- Equipment issues: workers report equipment malfunctions to Admin or Hostel Manager

### Missing (not in app yet)
1. **Task photo evidence** — no photo capture at task completion
2. **Task priority levels** — no structured priority levels for tasks
3. **Worker performance** — no tracking of worker task completion rate
4. **Equipment inventory** — no view of equipment status and maintenance history
5. **Safety checklist** — no structured safety checklist for workers
6. **Worker shift handover** — no structured handover checklist
7. **GPS check-in** — no GPS check-in/out for field workers
8. **Weather alerts** — no weather alerts for outdoor workers

### Implementation notes
- Dashboard leads with task queue, shift status
- Worker agent uses large taps, minimal text (mobile-first)
- Tasks: structured with priority, SLA, completion criteria
- Handover: structured checklist with open items
- Equipment: reported issues are logged and escalated

### Agent persona
- Focus: task completion, shift handover, equipment reporting
- Mobile-first UI with large taps, minimal text
- Can: complete tasks, document handover, report equipment issues
- Cannot: assign tasks (admin territory), modify gate configuration
- Escalation: to Admin for operational; to Hostel Manager for hostel tasks



## Cross-Role Dependencies

### Worker should see (read-only)
- **emo**: assigned tasks, equipment status → Worker knows what to do
- **hostel_manager**: hostel maintenance tasks → Worker handles hostel upkeep
- **admin**: shift schedule → Worker knows when to work

### Worker should NOT see
- **sysadmin**: infra, MFA, RLS → not worker's concern
- **principal**: strategic KPIs → not worker's concern

### Worker escalates to
- **emo**: equipment failures, safety hazards
- **hostel_manager**: hostel maintenance issues
- **admin**: shift issues, task SLA breaches

### Worker borrows from
- **emo**: task assignment (emo creates ticket, worker completes)
- **hostel_manager**: block-specific tasks (hostel_manager assigns, worker executes)

