# Staff — how it works

## Role in institutional life
The Staff role represents general staff (non-teaching) at JNTUH CEJ. This includes administrative staff, laboratory staff, library staff, and support staff. In the Gate Monitor system, Staff have:
- Shift management and handover documentation
- Gate status view (which gates are open/closed)
- Campus occupancy view
- Maintenance ticket assignment
- Exam support duties as assigned by the exam branch

Staff are the operational backbone of the institution — they keep the campus running day-to-day. The Staff role is distinct from Faculty (teaching) and Worker (maintenance/grounds).

## Operational standards
Per Indian university non-teaching staff management:
- Shift management: staff work in shifts (morning, afternoon, night); handover documentation is required
- Gate status: staff can view which gates are open/closed and the status of gate operations
- Campus occupancy: staff can view real-time campus occupancy across all areas
- Maintenance tickets: staff can be assigned maintenance tickets and must complete them within SLA
- Exam support: staff are assigned exam-day duties (hall monitoring, candidate guidance, security) as needed by the exam branch

Per NIT Hamirpur security SOP, outsourced security services staff follow standard operating procedures for gate operations, campus security, parking, and emergency response. Staff in the security context follow similar procedures.

## Accountability and escalation
- Staff reports to Admin (for operational matters) and HOD (for academic support)
- Shift handover: staff → next shift staff → Admin (for unresolved items)
- Maintenance tickets: staff → Admin (for SLA breaches)
- Exam support: staff → exam branch office (for exam-day matters)
- Security incidents: staff → Security Supervisor → Admin

## What we have in the app
- /staff — Dashboard with shift status, gate view, occupancy
- /staff/shifts — Shift management and handover
- /staff/gates — Gate status view
- /staff/occupancy — Campus occupancy view
- /staff/tickets — Maintenance ticket assignment
- /staff/exams — Exam support duties

Key API endpoints:
- GET /api/staff/shifts — View shift status
- POST /api/staff/shifts/[id]/handover — Handover documentation
- GET /api/staff/gates — Gate status view
- GET /api/staff/occupancy — Campus occupancy
- POST /api/staff/tickets/[id]/complete — Complete maintenance ticket

Data flow: Staff shift handover creates a handover record with open items. Maintenance tickets are assigned and tracked. Exam support duties are assigned by the exam branch.

## What is missing
1. Shift scheduling — no way to schedule shifts in advance
2. Handover checklist — no structured handover checklist
3. Gate hardware health — no view of gate hardware status (scanner uptime, sensor health)
4. Ticket SLA tracking — no SLA timers for maintenance tickets
5. Exam day checklist — no structured checklist for exam-day support duties
6. Staff performance — no tracking of staff performance metrics
7. Training records — no tracking of staff training and certifications
8. Staff feedback — no way for staff to provide feedback on operations

## Implementation notes for dashboard/agent
- Dashboard leads with shift status, gate view, occupancy
- Staff agent is scoped to their assigned shifts and tickets
- Handover: structured checklist with open items and escalation
- Exam support: assigned by exam branch, tracked in the exam console

## Agent persona
When acting as the staff role:
- Focus: shifts, handover, gate status, occupancy, maintenance tickets
- Scoped to: assigned shifts and tickets
- Can: view shifts, complete handover, view gate/occupancy, complete tickets
- Cannot: modify gate configuration (admin territory), approve exam matters
- Escalation: to Admin for operational matters; to exam branch for exam matters

