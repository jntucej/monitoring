# Principal — how it works

## Overview
The Principal serves as the administrative and academic executive head of JNTUH College of Engineering Jagtial (CEJ). Within the Gate Monitor system, the Principal holds institution-wide oversight across academics, campus gates, hostel administration, security incidents, and examination integrity.

In addition to broad executive monitoring, the Principal serves as the top of the institutional escalation ladder. Lower-tier approval chains (e.g., student gate passes, leave requests, hostel discipline incidents, and student academic standing changes) escalate to the Principal when lower tiers cannot resolve them or when high-impact actions (such as permanent campus debarment, lockdown triggers, or institution-level delegations) are required. By institutional convention, the Principal also acts as the **Chief Warden** of hostels and the **Chief Superintendent** of examinations.

The Principal interface adopts a navy theme (`#f8fafc` surface tint) with composed motion, centered around high-level operational intelligence: `StrategicScorecard`, `EmergencyPulse`, and `ChainImpact`.

## Pages & workflows

### 1. Executive Cockpit & Governance
* **Strategic Dashboard & Briefing (`/principal`, `/principal/home`):** Provides a campus-wide roll-up of operational health, active gate throughput, emergency pulses, pending institutional delegations, and active incident tallies.
* **Governance, Delegations & Audit (`/principal/governance`, `/principal/governance/delegations`, `/principal/governance/audit`, `/principal/governance/reports`, `/principal/governance/analytics`):** Allows managing time-bound authority delegations (delegating specific approval scopes down to the Vice-Principal or HODs), reviewing immutable system audit trails, and tracking institution-level compliance reports.

### 2. Multi-Tier Approval Chain & Escalations
* **Approvals Pipeline (`/principal/approvals`, `/principal/approvals/pending`, `/principal/approvals/escalated`, `/principal/approvals/overdue`, `/principal/approvals/delegated`):** Serves as the final decision point for escalated requests. Leave requests and gate passes exceeding standard durations, or flagged by Deputy Wardens and HODs, surface here.
* **VP Bridge & Inbound Flags (`/principal/inbound`):** Review items specifically flagged and surfaced upstream by the Vice-Principal for executive attention, allowing immediate response or co-signing.

### 3. Campus Operations & Oversight
* **Hostel & Curfew Oversight (`/principal/operations/hostel`, `/deputy-warden/curfew-oversight`, `/deputy-warden/home`, `/hostel-manager/*`):** Campus-level roll-up of hostel blocks, curfew compliance, night attendance reconciliation, and escalated student disciplinary cases.
* **Gate Operations & Security (`/principal/operations/gates`, `/principal/operations/incidents`, `/supervisor/*`):** Live monitoring of gate desks, supervisor logs, emergency lockdowns, perimeter alerts, and security incidents.
* **Academic & Examination Oversight (`/principal/examinations`, `/principal/people/departments`, `/sysadmin/academic-status`):** Real-time monitoring of departmental academic performance and two-person authorization of `DEBARRED` or `SUSPENDED` student statuses.

## Key API endpoints

| Endpoint | Method(s) | What it does |
|---|---|---|
| `/principal/dashboard` | `GET` | Aggregates campus-wide metrics: gate counts, active incidents, attendance, and SLA health. |
| `/principal/inbound` | `GET` | Lists upstream items and decisions flagged by the Vice-Principal for executive review. |
| `/principal/inbound/[flagId]/respond` | `POST` | Dispatches Principal response, resolution, or co-signature to a flagged VP bridge item. |
| `/principal/delegations` | `GET,POST` | Fetches active delegations or provisions a time-bound delegation to VP/HODs. |
| `/principal/digest` | `GET` | Fetches executive morning brief and critical campus status summaries. |
| `/principal/week-digest` | `GET` | Retrieves weekly rolling trend summaries across departments, gates, and hostels. |
| `/principal/audit` | `GET` | Queries tamper-evident administrative audit logs across all campus entities. |
| `/principal/sla-heatmap` | `GET` | Generates cross-departmental SLA compliance and escalation delay heatmaps. |
| `/permissions/[ticket]` | `GET,PATCH` | Inspects permission/pass ticket details or executes approval/rejection at the executive tier. |
| `/permissions/[ticket]/amend` | `POST` | Modifies ticket boundaries or gate permissions prior to final executive sign-off. |
| `/permissions/[ticket]/sign` | `POST` | Cryptographically co-signs an escalated gate pass, leave request, or permission ticket. |
| `/permissions/[ticket]/revoke` | `POST` | Revokes an active pass or campus access credential immediately. |
| `/academic-status` | `GET,POST` | Approves or issues formal student standing changes (e.g. `DEBARRED`, `SUSPENDED`). |
| `/complaints/[id]` | `DELETE,GET,PATCH` | Reviews, updates, or directly closes campus-wide escalated grievances and complaints. |

## Data flow
1. **Escalation Ingestion:** Requests initiate at lower tiers (e.g. student requests hostel leave via `hostel_manager` or `deputy_warden`; faculty logs disciplinary breach).
2. **Upstream Routing:** If unresolved, exceeded SLA, or crossing risk thresholds, requests route upstream to the Principal's pending queue or via the Vice-Principal bridge (`/api/principal/inbound`).
3. **Execution & Delegation:** The Principal can sign (`/permissions/[ticket]/sign`), amend, or delegate authority downstream (`/principal/delegations`).
4. **Audit & Ripple Propagation:** Decisions trigger notifications, update gate validation states, record entries in the audit log (`/principal/audit`), and ripple to downstream dashboards (`ChainImpact`).

## Security notes
* **Authentication:** Enforced through HttpOnly JWT cookies and Bearer tokens, with session validation on each route (`/api/auth/session`).
* **RBAC Enforcement:** Server-side API protection is enforced using `withAuthorization({ requiredRole: ['principal', ...] })`. UI routing is guarded by `AuthGuard allowedRoles={['principal']}`.
* **Separation of Duties & Two-Person Rules:** High-consequence actions such as debarring a student require two-person verification (initiated by HOD or Chief Warden, approved by Principal/Dean).
* **Dual Roles:** While the Principal holds Chief Warden and Chief Superintendent authority, administrative hostel actions are logged with `role_context='chief_warden'` to preserve separation of audit logs.


## Gaps & Research

### Institutional context
Per JNTUH convention, the Principal wears three hats simultaneously:
1. **Principal** — overall campus authority, strategic decisions, all-level approver
2. **Chief Warden** — head of hostel administration, disciplinary escalation to DEBARRED
3. **Chief Superintendent of Examinations** — exam-day authority, candidate attendance, hall access

The Vice-Principal discharges the Principal's duties during leave. No single person can both enter and publish a result — separation of duties is enforced across the exam branch.

### Operational standards
- The Principal is the Convener of the Academic Council and the Board of Studies
- All gate-pass approvals at the highest level flow through the Principal
- Lockdown authority: only the Principal can declare a campus-wide lockdown
- Disciplinary authority: only the Principal (as Chief Warden) can escalate a hostel case to DEBARRED
- Exam authority: the Principal (as Chief Superintendent) is the final approver for exam-day exceptions
- Delegation: the Principal can delegate specific approval authority to the Vice-Principal or Dean with time-boxed expiry

### Missing (not in app yet)
1. **Strategic KPI dashboard** — no single view showing academic performance, gate security, hostel occupancy, and exam status
2. **Delegation expiry alerting** — no notification when a delegation is about to expire
3. **Lockdown drill mode** — no way to test lockdown without triggering it
4. **Cross-department view** — no way to see all 5 B.Tech departments + 5 M.Tech in one view
5. **Principal's leave workflow** — no formal process for handing off to Vice-Principal
6. **Board of Studies minutes** — no digital record of academic council decisions
7. **Exam-day command center** — no single screen for the Chief Superintendent on exam day
8. **DEBARRED case file** — no structured case file for disciplinary escalation

### Implementation notes
- Dashboard leads with strategic KPIs: gate status, pending approvals, hostel occupancy, exam status
- Lockdown: two-person approval (Principal + one designated authority), time-boxed, auto-revokes
- Exam-day: the Chief Superintendent console should be a separate view with candidate attendance, hall access, spot exceptions

### Agent persona
- Focus: strategic campus view, all-level approvals, delegation, lockdown, DEBARRED
- Can: sign any approval, delegate authority, declare lockdown, escalate to DEBARRED
- Cannot: self-approve without two-person for lockdown; cannot bypass exam SoD
- Escalation: to Vice Chancellor, JNTUH Hyderabad

