# Chief Warden — how it works

## Overview
At JNTUH CEJ, the Chief Warden holds ultimate administrative and disciplinary authority over all campus hostels (encompassing both boys' and girls' hostel blocks). Crucially, **Chief Warden is a ROLE CONTEXT for the Principal, not a separate person**.

Per JNTUH convention and system architecture, no distinct user account carries the `chief_warden` role in isolation; the Principal user already possesses chief warden authority. When the Principal takes action on residential hostel affairs—such as room allotments, curfew enforcement, mess contractor oversight, or hostel disciplinary sanctions—the system logs the action under the `role_context='chief_warden'`. This institutional convention ensures hostel administrative actions remain strictly auditable and segregated from general academic decisions, preventing operators from mistakenly creating unnecessary warden accounts.

In the escalation ladder, hostel issues escalate from Caretakers to Deputy Wardens (block-level), up through the Hostel Manager, and finally to the Chief Warden. The Chief Warden is the only hostel authority who can escalate a residential disciplinary incident into the campus-wide **Debarment Chain**.

## Pages & workflows

### 1. Hostel Disciplinary Escalation & Debarment
* **Academic Status Console (`/sysadmin/academic-status`):** When a severe discipline violation occurs in a hostel block (e.g., substance abuse, unauthorized guests, curfew defiance, or property damage), the Chief Warden reviews the case and initiates or endorses the transition to `DEBARRED` or `SUSPENDED` status.
* **Two-Person Chain to Debarment:** A Deputy Warden logs an incident. The Chief Warden escalates it via `/api/hostel-manager/incidents/[id]/escalate`. This creates a pending flag that routes to the HOD and Dean/Principal for two-person confirmation, directly revoking campus gate privileges upon final approval.

### 2. Hostel Administration Oversight
* **Hostel Ticket & Issue Governance:** Reviews systemic hostel infrastructure tickets, contractor maintenance, and recurring block disputes.
* **Mess & Allocation Oversight:** Oversees mess committee decisions, food quality audits, and campus-wide room allotments managed by the Hostel Manager.

## Key API endpoints

| Endpoint | Method(s) | What it does |
|---|---|---|
| `/admin/hostel-tickets` | `GET` | Fetches campus hostel ticket queues, maintenance requests, and block complaints. |
| `/admin/reference/hostel-tickets/overview` | `GET` | Aggregates hostel ticket resolution trends and SLA compliance metrics. |
| `/admin/anti-ragging-alert-config` | `GET,PATCH` | Configures anti-ragging response matrices and emergency hostel contact trees. |
| `/admin/lockdown` | `DELETE,GET,POST` | Triggers or inspects emergency containment lockdowns across hostel perimeters. |
| `/admin/alerts` | `GET,POST` | Retrieves hostel security alerts, curfew breaches, and unauthorized entries. |
| `/admin/safety/overview` | `GET` | Provides real-time safety, perimeter, and incident summaries for residential zones. |
| `/admin/audit-logs` | `GET` | Inspects system-wide audit records tagged with `role_context='chief_warden'`. |
| `/admin/reports` | `GET,POST` | Compiles detailed operational reports on hostel occupancy, discipline, and curfew. |
| `/admin/exceptions` | `GET` | Reviews special gate access exceptions granted to hostel residents. |
| `/admin/permission-policies` | `GET` | Reviews and validates institution-wide hostel leave and curfew policies. |
| `/admin/overview` | `GET` | Campus-wide administrative summary covering residential and gate operations. |
| `/auth/session` | `GET` | Validates session authentication and active role context claims. |

## Data flow
1. **Incident Logging:** A Deputy Warden reports a grave hostel disciplinary breach via `/api/hostel-manager/incidents`.
2. **Chief Warden Escalation:** Acting under the `chief_warden` context, the Principal reviews the incident and invokes `/api/hostel-manager/incidents/[id]/escalate`.
3. **Routing to Academic Status Chain:** The incident enters the academic status flow as a `PENDING` debarment.
4. **Two-Person Adjudication:** The HOD and Dean (or Principal acting in executive capacity) evaluate the recommendation.
5. **Enforcement:** Once approved, the student's status changes to `DEBARRED`, disabling gate access and hostel residency, with all steps captured under an immutable audit log tagged with `role_context='chief_warden'`.

## Security notes
* **Authentication Model:** JWT access tokens (HttpOnly cookie + Bearer) with rotating refresh tokens, revalidated via `/api/auth/session`.
* **Role Context Pattern:** `chief_warden` operates as an execution context for the `principal`. Operations verify that `auth.role === 'chief_warden' || auth.role === 'principal'`.
* **RBAC & Authorization:** Endpoints enforce access using `withAuthorization({ requiredRole: ['chief_warden', 'principal', ...] })`. UI pages are gated using `AuthGuard allowedRoles={['chief_warden', 'principal', ...]}`.
* **Separation of Concerns:** Logging actions under `role_context='chief_warden'` guarantees distinct audit trails for residential governance versus academic administration, preserving institutional accountability.


## Gaps & Research

### Institutional context
The Chief Warden is the highest hostel authority at JNTUH CEJ. Per JNTUH convention, the Principal acts as Chief Warden. The Chief Warden has full authority over hostel administration, disciplinary escalation, and DEBARRED status.

Only the Principal (as Chief Warden) can escalate a hostel case to DEBARRED status. This is the highest disciplinary authority in the hostel system.

### Missing (not in app yet)
1. **DEBARRED case file** — no structured case file for disciplinary escalation
2. **Hostel KPI dashboard** — no single view of hostel KPIs across all blocks
3. **Hostel policy versioning** — no version history for hostel policy changes
4. **Incident severity tracking** — no structured severity levels for hostel incidents
5. **Hostel visitor policy** — no structured visitor policy for hostel blocks
6. **Monthly hostel report** — no auto-generated monthly hostel report
7. **Disciplinary hearing record** — no structured record of disciplinary hearings
8. **Hostel safety audit** — no structured safety audit checklist for hostel blocks

### Implementation notes
- Dashboard leads with hostel KPIs, disciplinary cases, policy review
- Chief Warden agent is scoped to hostel matters only
- DEBARRED: structured case file with evidence, hearing record, and decision
- Policy: versioned with change history and approval trail
- Incidents: severity levels with SLA tracking

### Agent persona
- Focus: hostel administration, disciplinary escalation, policy
- Can: escalate to DEBARRED, approve hostel policy, handle major incidents
- Cannot: self-approve (actions are logged separately in audit)
- Escalation: to Principal for non-hostel matters



## Cross-Role Dependencies

### Chief Warden should see (read-only)
- **hostel_manager**: hostel KPIs, disciplinary cases, policy status → What HM is doing
- **deputy_warden**: curfew compliance, incident log, night attendance → Block status
- **principal**: DEBARRED decision authority → Final authority

### Chief Warden should NOT see
- **sysadmin**: infra, MFA, RLS → not CW's concern

### Chief Warden escalates to
- **principal**: DEBARRED (CW is principal in this context, but logged separately)
- **dean**: academic review of DEBARRED cases

### Chief Warden borrows from
- **hostel_manager**: disciplinary case files (hm collects, cw reviews)
- **dean**: academic context for DEBARRED decisions (dean provides)

