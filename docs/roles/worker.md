# Worker — how it works

## Overview
The `worker` role represents campus field staff, gate assistants, and physical maintenance workers. Workers have access to gate kiosk functions (running under operator workflows when assigned to gate duty) alongside individual work order tracking, personal shift management, and operational history.

When acting on gates, workers can operate scanning surfaces and manual entry screens under supervised scopes. For facilities and tasks, workers view assigned maintenance jobs, shift rosters, and work orders.

## Pages & workflows
- **/worker**: Main dashboard for worker tasks. Integrates the `RoleDashboardPanel` loading `/api/workers/my-work`, showing pending maintenance tickets, assigned gate shifts, attention queues, and activity timelines.
- **/worker/work-orders**: List and detail views of assigned facilities work orders, maintenance tasks, and their resolution statuses.
- **/worker/shifts**: Personal shift schedule, roster assignments, duty timings, and supervisor contact information.
- **/worker/history**: Historical audit log of completed jobs, recorded gate entries, and shift activity.
- **/gate and /gate/[gateId]**: Accessible when assigned to gate assist duty, providing full camera barcode/QR scanning, entry/exit logging, and pass validation.
- **/operator/manual-entry**: Manual entry logging screen for roll numbers and visitor tokens when scanning is unavailable.
- **/operator/pass-verification**: Verification portal for out-passes and hostel exit permits.
- **/operator/kiosk-pin**: Fast terminal sign-in via kiosk PIN for shared guard posts.
- **/operator/claim**: Gate desk binding for workers assigned to dynamic gate shifts.
- **/operator/lookup**: Identity and roll number inquiry console.
- **/operator/exceptions**: Local exception review for flagged scans during duty shifts.
- **/operator/transactions**: Movement transaction audit view for the active gate session.
- **/operator/stats**: Gate throughput statistics and shift volume counts.
- **/operator/mode**: View or update operational mode of the assigned gate desk.
- **/operator/announcements**: Campus security announcements and broadcast messages.
- **/operator/notifications**: System and shift notification center.
- **/operator/password**: Password rotation and account security.
- **/operator/profile**: Worker identity, contact info, and role assignment.

## Key API endpoints
| Endpoint | Method(s) | What it does |
|---|---|---|
| `/workers/my-work` | GET | Returns pending work orders, assigned maintenance tickets, and gate assignments for the current worker. |
| `/workers/my-shift` | GET | Fetches active shift details, post location, shift start/end times, and supervisor info. |
| `/workers/my-work-orders` | GET | Lists detailed work orders assigned to the worker with status and priority filters. |
| `/workers/personal-history` | GET | Returns historical log of past shifts, completed maintenance jobs, and attendance records. |
| `/workers/shifts` | GET | Retrieves roster schedule and upcoming shift changes. |
| `/operator/kiosk-session` | GET, POST | Authenticates the worker at an unattended gate terminal using a PIN or trusted kiosk network. |
| `/operator/claim-gate` | POST | Associates the worker with a physical gate post for the duration of the shift. |
| `/operator/manual-entry` | GET, POST | Records manual student or visitor movements at gate kiosks. |
| `/operator/lookup` | GET | Searches student records and active permission passes. Takes `?id=<roll\|name\|employee-id>` (a single identifier, not `?roll=`). |
| `/operator/last-scan` | GET | Retrieves the most recent scan at the gate desk for review or correction. |
| `/operator/recent-scans/summary` | GET | Returns scan volume summaries and recent movements at the gate post. |
| `/operator/transactions` | GET | Fetches paginated movement transaction logs. |
| `/operator/passes/batch-verify` | POST | Verifies multiple gate permits concurrently. |
| `/operator/entry-type` | POST | Records special entry classifications (e.g. Day Scholar In, Home In). |

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
