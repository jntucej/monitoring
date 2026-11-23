# Caretaker — how it works

## Role in institutional life
The Caretaker is a residential block caretaker at JNTUH CEJ, responsible for day-to-day facilities maintenance within their assigned hostel block. Per JNTUH CEJ's hostel staff page, caretakers support the Hostel Manager and Deputy Wardens: "The Hostel Manager and Deputy Wardens are appointed from the teaching faculty as in-charge, who in turn are supported by the respective hostel Care Takers."

In the Gate Monitor system, the Caretaker:
- Handles day-to-day facilities maintenance (electricity, plumbing, furniture, housekeeping)
- Resolves student housing grievances at the block level
- Tracks housekeeping and physical asset upkeep
- Manages maintenance tickets for their assigned block
- Reports major issues to the Deputy Warden

## Operational standards
Per Indian university hostel maintenance standards:
- Facilities maintenance: caretaker is the first responder for block-level issues
- Student grievance resolution: caretaker handles routine housing issues; escalates to Deputy Warden for major issues
- Housekeeping tracking: caretaker tracks housekeeping standards and reports compliance
- Physical asset upkeep: caretaker maintains inventory of physical assets and reports damage
- Maintenance ticket workflow: issue reported → caretaker assigned → resolution → verification → closure

Per JNTUH CEJ hostel rules, the caretaker is the first step in the approval chain: caretaker → deputy_warden → hostel_manager → principal.

## Accountability and escalation
- Caretaker reports to Deputy Warden (block-level)
- Routine maintenance: caretaker resolves directly
- Major issues: caretaker → Deputy Warden → Hostel Manager
- Student grievances: caretaker → Deputy Warden (if unresolved)
- Housekeeping non-compliance: caretaker → Deputy Warden → Hostel Manager

## What we have in the app
- /caretaker — Dashboard with block maintenance status, ticket queue
- /caretaker/tickets — Maintenance ticket workflow
- /caretaker/grievances — Student housing grievance tracking
- /caretaker/housekeeping — Housekeeping compliance tracking
- /caretaker/inventory — Physical asset inventory for block

Key API endpoints:
- POST /api/caretaker/tickets — Create maintenance ticket
- POST /api/caretaker/tickets/[id]/resolve — Resolve ticket
- POST /api/caretaker/grievances — Log student grievance
- GET /api/caretaker/housekeeping — View housekeeping status
- GET /api/caretaker/inventory — View block inventory

Data flow: Caretaker actions are scoped to their assigned block. Tickets are tracked through the maintenance ticket workflow. Grievances are logged and escalated as needed.

## What is missing
1. Ticket SLA tracking — no SLA timers for maintenance ticket resolution
2. Housekeeping score — no structured housekeeping score per block
3. Asset damage reporting — no structured reporting of asset damage with photos
4. Caretaker task scheduling — no way to schedule recurring maintenance tasks
5. Student satisfaction — no periodic student satisfaction survey for housing
6. Maintenance cost tracking — no tracking of maintenance costs per block
7. Emergency maintenance — no fast-track workflow for emergency maintenance issues
8. Caretaker shift management — no shift scheduling for block caretakers

## Implementation notes for dashboard/agent
- Dashboard leads with block maintenance status, ticket queue
- Caretaker agent is scoped to a single block
- Tickets: structured workflow with priority, SLA, resolution status
- Grievances: logged with type, severity, resolution status
- Housekeeping: weekly compliance score per block

## Agent persona
When acting as the caretaker role:
- Focus: block maintenance, ticket resolution, student grievances
- Scoped to: a single hostel block
- Can: create/resolve tickets, log grievances, track housekeeping
- Cannot: escalate to DEBARRED (Principal-only), approve cross-block changes
- Escalation: to Deputy Warden for major issues; to Hostel Manager for cross-block decisions

