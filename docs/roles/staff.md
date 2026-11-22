# Staff — how it works

## Overview

`staff` is a non-teaching institutional role: a campus employee who is not a teacher, not a gate operator, and not a supervisor. The app gives this role a personal dashboard — today's duty roster, open requests, attendance record, and shift history. It is a *self-service* role: staff see their own record; they do not manage other people.

## Pages & workflows

All routes are gated `allowedRoles=["staff"]` and live under `/staff/...`:

- **`/staff`** — the personal dashboard (`RoleDashboardPanel` at `endpoint="/api/staff/my-day"`). Surfaces: movements today, assigned tasks, open requests, duty roster, recent activity.
- **`/staff/my-day`** — the day view: today's duty, expected in/out times, movements logged so far.
- **`/staff/duties`** — the staff's recurring duty roster (week / shift / block assignments).
- **`/staff/assigned-tasks`** — tasks delegated to this staff by a supervisor or admin.
- **`/staff/leaves`** — leave applications this staff has filed and their status.
- **`/staff/requests`** + **`/staff/request-status`** — a staff can file requests (leave, facility, equipment) and see their status across the approval chain.
- **`/staff/history`** — past attendance, past movements, past requests.
- **`/staff/my-profile`** — the profile card (with the human identifier, not the UUID, per the role-scoped ID rule).
- **`/staff/notifications`** — in-app notices targeted at this staff.

Typical flows:

1. **Start of shift** → open `/staff` → read "Movements today" + "Assigned tasks" → open `/staff/duties` for the full roster.
2. **File a leave** → `/staff/requests` → pick "leave" → submit → the request lands in the approval chain (HOD/VP/Principal depending on type) and the staff tracks it at `/staff/request-status`.
3. **Look up history** → `/staff/history` for past attendance / movements / requests.

## Key API endpoints

| Endpoint | Method(s) | What it does |
|---|---|---|
| `/staff/my-day` | GET | Today's duty summary: movements, assigned tasks, open requests, duty roster (the dashboard KPI source). |
| `/staff/stats` | GET | Aggregate attendance / movement stats for this staff (for the profile / history views). |
| `/staff/register` | GET/POST | Register today's in/out at the gate (mirrors the operator kiosk for staff who swipe their own card). |
| `/staff/attendance` | GET | Attendance history for this staff. |
| `/staff/attendance-exceptions` | GET | Days marked as exception (holiday, exempt, etc.) with the reason. |
| `/staff/history` | GET | Past movements, past requests, past duty entries. |
| `/staff/requests-status` | GET | Live status of every request this staff has filed (pending / approved / rejected / at-which-stage). |
| `/me/access-log` | GET | This staff's own API access log (audit trail, self-view). |
| `/me/health` | GET | Self-health probe (does this account work end-to-end). |
| `/me/workspace` | GET | The single source of truth for what this person sees "right now" (live presence + capability set). |

Plus the shared auth endpoints (`/auth/login`, `/auth/session`, `/auth/refresh`, `/auth/logout`, `/auth/change-password`, `/auth/reset-password`, `/auth/approval-password/*`) — same for every role.

## Data flow

- On page load, the dashboard fetches `GET /api/staff/my-day` and renders KPIs from the `myDaySummary`/`assignedTasks`/`openRequests`/`dutyRoster` keys.
- The attendance view fetches `GET /api/staff/attendance` and `GET /api/staff/attendance-exceptions`.
- The request tracker fetches `GET /api/staff/requests-status` and polls it while a request is in-flight.
- All calls carry the JWT access token (`Authorization: Bearer …`) and are authenticated by `/api/auth/session` revalidation on the cookie path.

## Security notes

- **RBAC scope:** `allowedRoles=["staff"]` on every page. The API handlers use `withAuthorization` and reject any caller whose `users.role` is not `staff` (or an explicit delegate).
- **Self-only visibility:** every endpoint is scoped to the authenticated user's own records. A staff account cannot read another staff's attendance, leave, or request history — the server filters by `auth.userId`.
- **No privileged surface:** staff cannot see internal UUIDs (the internal-ID display is gated to `isSuperAdmin(role)`), cannot view the audit logs of others, and cannot trigger lockdown / escalation.
- **Request chain is fail-close:** an unapproved request cannot be "acted on" by the staff — the status is authoritative and a request in `PENDING`/`REJECTED` does not appear as "approved" anywhere.
