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
