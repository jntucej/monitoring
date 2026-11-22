# Principal Experience — API & Permission Map (live, 2026-11-22)

All principal APIs under src/app/api/principal/. requiredRole read directly
from each route's withAuthorization/withMutationGuard config. "server-authoritative"
means the route enforces the role — the UI may show controls but never
grants authority.

## Read (GET) routes
| Route | requiredRole | Purpose | Key response fields |
|---|---|---|---|
| /api/principal/dashboard | principal, vice_principal, admin, sysadmin | Command Centre data | counts{pending,escalated,overdue,todayDecisions}, priorityItems[], chainImpact, delegations, emergency[], exams, recentAlerts |
| /api/principal/attention | via withAuthorization (default) | PR-12 attention queue | attention items (kinds: escalation/sla/decision/lockdown/incident/case) |
| /api/principal/decisions | via withAuthorization (default) | decision ledger | decisions[] |
| /api/principal/escalations | via withAuthorization (default) | open escalations | escalations[] |
| /api/principal/emergency | via withAuthorization (default) | current state + latest commands | currentState, commands[] |
| /api/principal/delegations | principal, admin, sysadmin | delegation mgmt | GET ?status=ACTIVE/EXPIRED → delegations[], auditTrail[] |
| /api/principal/digest?range= | principal, vice_principal, admin, sysadmin | weekly digest | approved, delegated, avgDecision, slaAdherence, insight |
| /api/principal/week-digest | principal, admin, sysadmin | | |
| /api/principal/retention | principal, vice_principal, admin, sysadmin | retention source | todayWins[], insights{thisWeek,lastWeek,avgResponseSec} |
| /api/principal/catch-up | principal, admin, sysadmin | "since last visit" | |
| /api/principal/sla-heatmap | principal, admin, sysadmin | SLA posture | |
| /api/principal/audit?summary= | principal, sysadmin | audit | |

## Write (mutation) routes — all wrapped in withMutationGuard (CSRF + rate-limit + auth)
| Route | requiredRole | Effect |
|---|---|---|
| POST /api/principal/attention/[id]/resolve | principal, admin, sysadmin | resolve an attention item (uuid id, no decision body — actor from ctx) |
| POST /api/principal/escalations/[id]/resolve | via withMutationGuard | resolve an escalation |
| POST /api/principal/inbound/[flagId]/respond | principal, admin, sysadmin | respond to an inbound flag |
| POST /api/principal/inbox/review | (review) | review an inbox item |
| POST /api/principal/delegations | principal, admin, sysadmin | create a delegation {delegate_role, expires_at, …} |

## Backend follow-ups the programme needs (documented impact, additive only)
- /api/principal/digest should add a weekly **series** (7 points) so StoryChart
  has a real trend source (currently UI falls back to KPIs; no invented data).
- /api/principal/audit?summary=1&since= → { approvals_cleared, emergencies,
  new_incidents, delegations } (Since-Last-Visit layer).
- /api/principal/dashboard should surface *Delta* + *Spark* per KPI (now + vs
  last week + what to do) for the Command Centre tiles.
These are additive contract changes → PR-02 contracts must document them and
they require review (not unilateral backend changes).

## Separation-of-duties / authority (do NOT redefine)
The PR-14 separation-of-duties engine (institutional sod.ts) + authority
engine govern *who* may act. The Principal's broad authority is NOT unlimited:
enforce via the server (withAuthorization / withMutationGuard / RLS). The UI
must show why an action is unavailable (LockedByPolicy) and never infer
permission from a visible button. chief_warden is a *role context* of the
Principal, not a separate account — hostel actions log role_context.
