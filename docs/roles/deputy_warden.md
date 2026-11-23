# Deputy Warden — how it works

## Overview

`deputy_warden` is a residential-security operational role sitting one tier
below the hostel manager / principal in the hostel & curfew chain. The
deputy-warden console is for the person running the hostel's day-to-day
gate + curfew + complaint oversight: who's out on a pass, who's past curfew,
which hostel complaints need a decision, and shift handover between wardens.
It is *operational*, not academic.

## Pages & workflows

All routes live under `/deputy-warden/...` (gated `allowedRoles`
including `deputy_warden`):

- **`/deputy-warden/home`** + **`/deputy-warden/daily-overview`** — the
  operational dashboard: on-campus / out-on-pass counts, curfew status,
  open hostel complaints, gate-movement summary for the assigned blocks.
- **`/deputy-warden/gate-movement`** — live in/out scan feed for the hostel
  gate(s) the warden supervises (feeds from `/gate/stream` SSE + the
  occupancy snapshot).
- **`/deputy-warden/curfew`** + **`/deputy-warden/curfew-oversight`** — the
  curfew board: who is in, who is out past curfew, who is expected back and
  hasn't returned (`/hostel/returns-timeline`), and the lift/override controls
  (a `required`-rank pref, so the UI surfaces the policy lock).
- **`/deputy-warden/leave-requests`** — out-pass / late-return requests
  pending this warden's approval in the hostel escalation chain
  (`/permissions/[ticket]/*` family).
- **`/deputy-warden/complaints`** + **`/deputy-warden/complaints/[id]`** —
  hostel complaints routed to the warden (via the shared `ComplaintConsole`),
  with timeline, attachments, feedback, and cosign.
- **`/deputy-warden/incident-reporting`** — log / escalate a hostel incident
  (e.g. unauthorized exit, overstay, ragging report).
- **`/deputy-warden/delegated-approvals`** — approvals delegated to this
  warden (a senior can push a decision down the chain).
- **`/deputy-warden/shift-handover`** — end-of-shift digital handover to the
  next warden (open items, curfew state, incidents).
- **`/deputy-warden/decision-history`** — audit of the warden's past
  decisions (approvals, overrides, handovers).
- **`/hostel/permissions`** — hostel gate-pass / out-pass permission tickets
  the warden acts on.

Typical flow: **curfew breach** → `/curfew-oversight` flags a student out
past curfew → warden opens the ticket → checks `/gate-movement` for the last
scan → approves/denies or escalates to the principal (two-person rule for
suspension). Then logs it in `/incident-reporting` and hands off at
shift-change.

## Key API endpoints

| Endpoint | Method(s) | What it does |
|---|---|---|
| `/deputy-warden/delegation` | GET | What the warden is currently delegated to act on (by a senior). |
| `/permissions/[ticket]` | GET, PATCH | Inspect / act on a hostel gate-pass / out-pass permission ticket. |
| `/permissions/[ticket]/can-act` | GET | Can this warden act on this ticket (role + stage check)? |
| `/permissions/[ticket]/verify` | GET | Verify the ticket's signature / QR integrity. |
| `/hostel/returns-timeline` | GET | Expected-return vs actual-return for out students (curfew board). |
| `/hostel/blocks` | GET | The hostel blocks the warden is scoped to. |
| `/hostel/blocks/[block]/rooms` | GET | Room occupancy for a block. |
| `/complaints` | GET, POST | List / file hostel complaints. |
| `/complaints/[id]` | GET, PATCH, DELETE | Triage, resolve, or close a specific complaint. |
| `/complaints/[id]/timeline` | GET | Full history of a complaint (actions, cosigns, SLA). |
| `/complaints/[id]/attachments` | GET | Fetch attachments (photos, logs). |
| `/complaints/analytics/sla-breaches` | GET | Complaints that breached SLA — oversight KPI. |
| `/gate/stream` | GET (SSE) | Live gate-scan stream for the supervised gates. |

## Data flow

- On load, the dashboard fans out to `/api/deputy-warden/delegation`,
  `/api/hostel/returns-timeline`, `/api/permissions/active`, and
  `/api/complaints?assignee=me` to build the KPIs.
- Gate-movement and curfew boards subscribe to the **SSE** `/api/gate/stream`
  (one channel per gate, authed by the JWT cookie) so new scans push live
  without polling.
- Acting on a pass: a `PATCH /api/permissions/[ticket]` with the decision;
  the server re-validates role + stage + (for curfew-lift) the `required`
  pref lock, then persists and notifies the student.
- Complaints use the shared `/api/complaints/*` surface (the warden is in the
  complaint `AUTHORITIES` set alongside principal/admin/hostel-manager).
- All calls carry the JWT access token (HttpOnly cookie + Bearer); session
  revalidated on navigation via `/api/auth/session`.

## Security notes

- **RBAC scope:** `allowedRoles` on every page; API handlers use
  `withAuthorization` and reject any caller whose `users.role` isn't in the
  deputy-warden-eligible set.
- **Block scoping:** the warden sees only the hostel blocks assigned to them
  (`users.hostel_scope`), not campus-wide.
- **Fail-close on curfew:** a curfew-lift or out-pass approval is a
  `required`-rank pref — the warden cannot self-mute the safety control;
  policy owns it, and the UI shows the lock.
- **Two-person rule:** suspension / debar decisions require a second
  approver (HOD/Dean/Principal); the warden's decision alone is not final.
- **Audit:** every approval, override, and handover is recorded in
  `/deputy-warden/decision-history` and the global audit log.
- **Internal IDs:** the warden sees human identifiers (roll / name), not
  UUIDs — internal-ID display is reserved to `sysadmin`.


## Gaps & Research

### Institutional context
The Deputy Warden is the block-level supervisor of a single hostel. JNTUH CEJ has 4 blocks (2 boys + 2 girls). Per JNTUH CEJ's hostel staff page: Deputy Wardens are appointed from teaching faculty.

In the Gate Monitor system, the Deputy Warden manages block-level curfew verification, night attendance reconciliation, room vacate/allot within their block, incident log, visitor log, and mess rule violation reporting.

### Missing (not in app yet)
1. **Block curfew compliance dashboard** — no single view of curfew compliance for the block
2. **Night attendance alerts** — no proactive alert when night attendance drops
3. **Incident categorization** — no structured categorization of incident types
4. **Visitor photo capture** — no photo capture at hostel visitor check-in
5. **Mess rule violation tracking** — no structured tracking of mess rule violations
6. **Student satisfaction survey** — no periodic student satisfaction survey for the block
7. **Caretaker task assignment** — no way to assign tasks to block caretakers
8. **Block KPI dashboard** — no single view of block KPIs (occupancy, curfew, incidents)

### Implementation notes
- Dashboard leads with block curfew status, incident log, night attendance
- Deputy Warden agent is scoped to a single block
- Curfew: nightly verification with time stamp and non-compliance list
- Incidents: structured log with type, severity, resolution status
- Visitor log: structured with host, purpose, check-in/out times

### Agent persona
- Focus: block-level curfew, night attendance, incidents, visitor log
- Scoped to: a single hostel block
- Can: verify curfew, reconcile night attendance, log incidents, manage room vacate/allot within block
- Cannot: escalate to DEBARRED (Principal-only), approve cross-block room changes
- Escalation: to Hostel Manager for block-level decisions; to Principal for disciplinary

