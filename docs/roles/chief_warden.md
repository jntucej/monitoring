# Chief Warden — how it works

## Role in institutional life
The Chief Warden is the highest hostel authority at JNTUH CEJ. Per JNTUH convention, the Principal acts as Chief Warden — the same person wearing two hats: campus head and hostel head. The Chief Warden has full authority over hostel administration, disciplinary escalation, and DEBARRED status.

In the Gate Monitor system, the Chief Warden:
- Escalates hostel disciplinary cases to DEBARRED status (Principal-only)
- Oversees hostel administration across all 4 blocks
- Approves hostel policy changes
- Handles major hostel incidents
- Reviews hostel KPIs (occupancy, curfew compliance, incident rate)

The Chief Warden role is distinct from the Principal role in the app — it is a separate capability context. The Principal can act in both contexts, but the Chief Warden context is scoped to hostel matters only.

## Operational standards
Per Indian university hostel governance (UGC, AICTE, state govt rules):
- DEBARRED: only the Chief Warden (Principal) can escalate a hostel case to DEBARRED status
- Hostel policy: Chief Warden approves all hostel policy changes
- Hostel incidents: Chief Warden handles major incidents (theft, damage, safety)
- Hostel KPIs: Chief Warden reviews monthly KPIs across all blocks
- Hostel visitor policy: Chief Warden approves visitor policy for hostel blocks

Per JNTUH CEJ hostel rules, the Chief Warden is the final authority for all hostel matters. The Hostel Manager and Deputy Wardens operate under the Chief Warden's authority.

## Accountability and escalation
- Chief Warden is the Principal (same person, different context)
- DEBARRED: Chief Warden alone (highest disciplinary authority for hostel matters)
- Hostel policy: Chief Warden approves → Principal reviews
- Major incidents: Chief Warden handles → Principal reviews
- Hostel KPIs: Chief Warden reviews → Principal signs off

## What we have in the app
- /chief-warden — Dashboard with hostel KPIs, disciplinary cases, policy review
- /chief-warden/disciplinary — Disciplinary case queue (DEBARRED escalation)
- /chief-warden/policy — Hostel policy management
- /chief-warden/incidents — Major hostel incident log
- /chief-warden/blocks — Block-level KPI view

Key API endpoints:
- POST /api/chief-warden/disciplinary/[id]/debarred — Escalate to DEBARRED
- GET /api/chief-warden/disciplinary — Disciplinary case queue
- POST /api/chief-warden/policy — Update hostel policy
- GET /api/chief-warden/incidents — Major incident log
- GET /api/chief-warden/blocks — Block KPIs

Data flow: Chief Warden actions are the highest-severity hostel entries in audit_events. DEBARRED is a Principal-only action. Policy changes are logged with full context.

## What is missing
1. DEBARRED case file — no structured case file for disciplinary escalation
2. Hostel KPI dashboard — no single view of hostel KPIs across all blocks
3. Hostel policy versioning — no version history for hostel policy changes
4. Incident severity tracking — no structured severity levels for hostel incidents
5. Hostel visitor policy — no structured visitor policy for hostel blocks
6. Monthly hostel report — no auto-generated monthly hostel report
7. Disciplinary hearing record — no structured record of disciplinary hearings
8. Hostel safety audit — no structured safety audit checklist for hostel blocks

## Implementation notes for dashboard/agent
- Dashboard leads with hostel KPIs, disciplinary cases, policy review
- Chief Warden agent is scoped to hostel matters only
- DEBARRED: structured case file with evidence, hearing record, and decision
- Policy: versioned with change history and approval trail
- Incidents: severity levels with SLA tracking

## Agent persona
When acting as the chief_warden role:
- Focus: hostel administration, disciplinary escalation, policy
- Can: escalate to DEBARRED, approve hostel policy, handle major incidents
- Cannot: self-approve (Chief Warden is Principal, but actions are logged separately)
- Escalation: to Principal for non-hostel matters

