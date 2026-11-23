# EMO — how it works

## Role in institutional life
The EMO (Estate Maintenance Officer) is the institutional authority for campus engineering and central physical infrastructure oversight at JNTUH CEJ. The EMO manages:
- Campus-wide infrastructure complaints (buildings, roads, utilities)
- Triage and cosign major repairs
- Vendor/contractor SLA auditing
- Contractor compliance
- Estate planning and asset management

In the Gate Monitor system, the EMO has no dedicated UI surface — it operates through shared consoles (complaints console, maintenance APIs). The EMO is the institutional authority for all physical infrastructure matters.

## Operational standards
Per Indian university estate management best practices:
- Campus-wide infrastructure: EMO is the single point of authority for all physical infrastructure
- Triage: EMO triages infrastructure complaints and assigns to appropriate vendors or workers
- Major repairs: EMO cosigns major repair decisions (above a threshold amount)
- Vendor SLA: EMO audits vendor/contractor SLAs and tracks compliance
- Contractor compliance: EMO ensures contractors follow safety, quality, and schedule requirements
- Estate planning: EMO maintains the estate asset register and plans for upgrades

Per Indian university facility management:
- EMO is the technical authority for all campus engineering matters
- EMO works with Admin for operational coordination
- EMO reports to Principal for major infrastructure decisions

## Accountability and escalation
- EMO reports to Principal (for major infrastructure decisions) and Admin (for operational coordination)
- Triage: EMO assigns complaints to workers or vendors
- Major repairs: EMO cosigns → Principal approves
- Vendor SLA breaches: EMO → Admin → Principal
- Contractor non-compliance: EMO → Admin → Principal

## What we have in the app
- /complaints (shared console) — Infrastructure complaint intake and triage
- /maintenance (shared console) — Maintenance ticket workflow
- /emo (shared API) — Estate maintenance APIs (no dedicated UI)

Key API endpoints:
- POST /api/complaints — Submit infrastructure complaint
- POST /api/maintenance/tickets — Create maintenance ticket
- GET /api/emo/estate — Estate asset register
- POST /api/emo/repairs/[id]/cosign — Cosign major repair
- GET /api/emo/vendors — Vendor SLA compliance

Data flow: EMO actions are the highest-severity infrastructure entries in audit_events. Complaints are triaged and assigned. Major repairs require EMO cosign and Principal approval.

## What is missing
1. Dedicated EMO dashboard — no dedicated UI surface for the EMO role
2. Estate asset register — no structured asset register with maintenance history
3. Vendor SLA dashboard — no visual SLA tracking for vendors
4. Major repair workflow — no structured workflow for major repair cosign
5. Campus infrastructure map — no visual map of campus infrastructure
6. EMO KPI dashboard — no KPI view of infrastructure performance
7. Contractor safety audit — no structured safety audit for contractors
8. Infrastructure budget tracking — no tracking of infrastructure repair budget

## Implementation notes for dashboard/agent
- EMO operates through shared consoles (complaints, maintenance)
- EMO agent is the technical authority for all campus engineering matters
- Triage: structured complaint intake with priority and assignment
- Major repairs: EMO cosign → Principal approval
- Vendor SLA: visual dashboard with compliance tracking

## Agent persona
When acting as the emo role:
- Focus: campus infrastructure, complaint triage, major repairs, vendor SLA
- Can: triage complaints, cosign major repairs, audit vendor SLAs
- Cannot: approve major repairs without Principal sign-off, modify gate configuration
- Escalation: to Principal for major decisions; to Admin for operational coordination

