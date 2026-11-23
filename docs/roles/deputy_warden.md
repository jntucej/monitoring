# Deputy Warden — how it works

## Role in institutional life
The Deputy Warden is the block-level supervisor of a single hostel at JNTUH CEJ. There are 4 blocks (2 boys + 2 girls), and each block has a Deputy Warden appointed from the teaching faculty. Per JNTUH CEJ's hostel staff page: "Sri. C. Radha Charan Deputy Warden (Boys), Mrs. P. Sangeetha Deputy Warden (Girls), Sri M. Srikanth Assistant Deputy Warden (Boys), Smt. K. Gouthami [Assistant Deputy Warden (Girls)]"

In the Gate Monitor system, the Deputy Warden:
- Manages block-level curfew verification
- Handles night attendance reconciliation
- Manages room vacate/allot within their assigned block
- Maintains incident log and visitor log for their block
- Reports mess rule violations to the Hostel Manager
- Supervises the block's caretakers

## Operational standards
Per Indian university hostel warden responsibilities:
- Curfew verification: Deputy Warden verifies curfew compliance nightly; non-compliance is logged and escalated
- Night attendance: Deputy Warden reconciles night attendance with the hostel register
- Room management: Deputy Warden manages room vacate/allot within their block
- Incident log: Deputy Warden maintains a block-level incident log (theft, damage, behavior)
- Visitor log: Deputy Warden maintains a visitor log for hostel blocks
- Mess rule violations: Deputy Warden reports violations to Hostel Manager
- Student support: Deputy Warden is the first point of contact for hostel students

Per JNTUH CEJ hostel rules, the Deputy Warden works under the Hostel Manager and is supported by caretakers. The approval chain is: caretaker → deputy_warden → hostel_manager → principal.

## Accountability and escalation
- Deputy Warden reports to Hostel Manager
- Curfew violations: Deputy Warden logs → Hostel Manager reviews → Principal (if DEBARRED)
- Night attendance: Deputy Warden reconciles → Hostel Manager verifies
- Room vacate/allot: Deputy Warden manages within block → Hostel Manager approves cross-block
- Mess rule violations: Deputy Warden reports → Hostel Manager decides
- Visitor log: Deputy Warden maintains → Hostel Manager reviews weekly

## What we have in the app
- /deputy-warden — Dashboard with block view, curfew status, incident log
- /deputy-warden/curfew — Nightly curfew verification
- /deputy-warden/night-attendance — Night attendance reconciliation
- /deputy-warden/rooms — Room vacate/allot within block
- /deputy-warden/incidents — Block-level incident log
- /deputy-warden/visitors — Block-level visitor log

Key API endpoints:
- POST /api/deputy-warden/curfew/verify — Verify curfew compliance
- POST /api/deputy-warden/night-attendance/reconcile — Reconcile night attendance
- POST /api/deputy-warden/rooms/[id]/vacate — Vacate room
- POST /api/deputy-warden/incidents — Log incident
- GET /api/deputy-warden/visitors — View visitor log

Data flow: Deputy Warden actions are scoped to their assigned block. Curfew verification updates the curfew compliance table. Incidents are logged and tracked.

## What is missing
1. Block curfew compliance dashboard — no single view of curfew compliance for the block
2. Night attendance alerts — no proactive alert when night attendance drops
3. Incident categorization — no structured categorization of incident types
4. Visitor photo capture — no photo capture at hostel visitor check-in
5. Mess rule violation tracking — no structured tracking of mess rule violations
6. Student satisfaction survey — no periodic student satisfaction survey for the block
7. Caretaker task assignment — no way to assign tasks to block caretakers
8. Block KPI dashboard — no single view of block KPIs (occupancy, curfew, incidents)

## Implementation notes for dashboard/agent
- Dashboard leads with block curfew status, incident log, night attendance
- Deputy Warden agent is scoped to a single block
- Curfew: nightly verification with time stamp and non-compliance list
- Incidents: structured log with type, severity, resolution status
- Visitor log: structured with host, purpose, check-in/out times

## Agent persona
When acting as the deputy_warden role:
- Focus: block-level curfew, night attendance, incidents, visitor log
- Scoped to: a single hostel block
- Can: verify curfew, reconcile night attendance, log incidents, manage room vacate/allot within block
- Cannot: escalate to DEBARRED (Principal-only), approve cross-block room changes
- Escalation: to Hostel Manager for block-level decisions; to Principal for disciplinary

