# Hostel Manager — how it works

## Role in institutional life
The Hostel Manager at JNTUH CEJ is a teaching faculty member appointed as in-charge of the hostel system. Per JNTUH CEJ's own hostel staff page, the Hostel Manager is "entrusted with the twin responsibilities of allotment of rooms in hostels as well as looking after the day-to-day mess facilities to the boarders. He is ably assisted by two Deputy Wardens for each of the hostels. The Hostel Manager and Deputy Wardens are appointed from the teaching faculty as in-charge, who in turn are supported by the respective hostel Care Takers."

JNTUH CEJ has 4 hostel blocks: 2 boys + 2 girls. The Hostel Manager is one per college/unit and oversees all 4 blocks.

In the Gate Monitor system, the Hostel Manager:
- Manages room allotment and vacate across all blocks
- Supervises Deputy Wardens (one per block)
- Oversees hostel inventory (beds, cots, lockers, fans, lights)
- Tracks block-level occupancy
- Manages day-to-day mess facilities
- Handles student housing grievances
- Escalates disciplinary cases to Principal (as Chief Warden)

## Operational standards
Per Indian university hostel administration (UGC, AICTE, state govt rules):
- Room allotment: based on merit, category, and availability; managed by Hostel Manager
- Curfew management: night curfew is enforced by Deputy Wardens; Hostel Manager monitors compliance
- Mess facilities: day-to-day mess operations managed by Hostel Manager with Mess In-charge support
- Hostel inventory: Hostel Manager maintains inventory of all physical assets
- Student grievance resolution: Hostel Manager is the first point of contact for housing issues
- Disciplinary escalation: Hostel Manager → Principal (as Chief Warden) for DEBARRED
- Mess rule violations: Deputy Warden reports to Hostel Manager; Hostel Manager decides on sanctions

Per JNTUH CEJ hostel rules, the approval chain is: caretaker → deputy_warden → hostel_manager → principal (each with a substitute). This 4-stage chain is encoded in the app's caretaker.ts config.

## Accountability and escalation
- Hostel Manager reports to Principal (as Chief Warden)
- Curfew violations: Deputy Warden → Hostel Manager → Principal
- Room allotment: Hostel Manager decides; Principal approves for special cases
- Mess issues: Mess In-charge → Hostel Manager → Principal
- Disciplinary: Hostel Manager → Principal (DEBARRED is Principal-only)
- Student grievances: student → Hostel Manager → Principal (for unresolved cases)

## What we have in the app
- /hostel-manager — Dashboard with block occupancy, room allotment, inventory
- /hostel-manager/blocks — Block-level view (4 blocks: 2 boys + 2 girls)
- /hostel-manager/rooms — Room allotment and vacate management
- /hostel-manager/inventory — Hostel physical asset inventory
- /hostel-manager/mess — Day-to-day mess facilities oversight
- /hostel-manager/grievances — Student housing grievance tracking

Key API endpoints:
- GET /api/hostel-manager/blocks — Block occupancy
- POST /api/hostel-manager/rooms/[id]/allot — Room allotment
- POST /api/hostel-manager/rooms/[id]/vacate — Room vacate
- GET /api/hostel-manager/inventory — Hostel inventory
- POST /api/hostel-manager/grievances — Log student grievance

Data flow: Hostel Manager actions are scoped to all 4 blocks. Room allotment/vacate updates the occupancy table. Grievances are logged and tracked to resolution.

## What is missing
1. Block occupancy heat map — no visual representation of occupancy across 4 blocks
2. Room allotment workflow — no structured workflow for new admission room allocation
3. Mess menu integration — no integration with Mess In-charge's menu finalization
4. Hostel maintenance ticketing — no structured ticketing for hostel maintenance issues
5. Curfew compliance dashboard — no single view of curfew compliance across all blocks
6. Student housing preference — no system for students to express housing preferences
7. Hostel visitor log — no structured visitor log for hostel blocks
8. Disciplinary case file — no structured case file for hostel disciplinary cases

## Implementation notes for dashboard/agent
- Dashboard leads with block occupancy, room allotment, inventory
- Hostel Manager agent oversees all 4 blocks (2 boys + 2 girls)
- Room allotment: structured form with block, room, category, merit
- Mess: integrated with Mess In-charge's menu and token system
- Grievances: ticket-based workflow with SLA tracking

## Agent persona
When acting as the hostel_manager role:
- Focus: hostel administration, room allotment, mess facilities, student grievances
- Overses: all 4 hostel blocks
- Can: allot/vacate rooms, track inventory, manage mess, resolve grievances
- Cannot: escalate to DEBARRED (Principal-only), approve disciplinary cases
- Escalation: to Principal for disciplinary; to Mess In-charge for mess operations

