# Supervisor — how it works

## Role in institutional life
The Supervisor role represents security supervisors at JNTUH CEJ — the person who oversees gate operations, handles escalated exceptions, manages watchlists, and coordinates shift handovers across all gates. The Supervisor is the escalation hub for gate security operations.

In the Gate Monitor system, the Supervisor:
- Handles escalated gate exceptions from operators
- Manages visitor overstay alerts
- Maintains the campus watchlist
- Manages shift handover with open items across all gates
- Views all gate live state
- Coordinates with Admin for campus-wide security matters

## Operational standards
Per NIT Hamirpur security SOP: "The Security room at Gate 1 Exit side will be the Control Room for Security and will have number 01972254091. All matters related to security, emergency etc. will be reported to the Control Room Only. The Control Room will be under the control of Security Supervisor who shall forward the case to the related authority."

Per Indian university campus security best practices:
- Supervisor is the single point of escalation for all gate security matters
- Watchlist management: Supervisor maintains the watchlist and checks it before granting access
- Overstay alerts: Supervisor receives real-time alerts when visitors exceed their pass time
- Shift handover: Supervisor reviews open items across all gates and coordinates with Admin
- Emergency response: Supervisor is the first responder for campus security emergencies
- All-gate view: Supervisor has a live view of all gates, operators, and pending passes

## Accountability and escalation
- Supervisor reports to Admin (for operational matters) and Principal (for security matters)
- Gate exceptions: Supervisor resolves or escalates to Admin
- Watchlist: Supervisor maintains; changes require Admin approval
- Overstay: Supervisor alerts Admin; Admin decides on action
- Emergency: Supervisor → Admin → Principal
- Shift handover: Supervisor → Admin (for unresolved items)

## What we have in the app
- /supervisor — Dashboard with all-gate live view, exception queue, watchlist
- /supervisor/gates — All gate live state
- /supervisor/exceptions — Escalated gate exception queue
- /supervisor/watchlist — Watchlist management
- /supervisor/overstay — Visitor overstay alerts
- /supervisor/handover — Shift handover with open items

Key API endpoints:
- GET /api/supervisor/gates — All gate live state
- POST /api/supervisor/exceptions/[id]/resolve — Resolve exception
- POST /api/supervisor/watchlist — Add to watchlist
- GET /api/supervisor/overstay — Overstay alerts
- POST /api/supervisor/handover — Shift handover

Data flow: Supervisor actions are the highest-severity gate security entries in audit_events. Watchlist changes require Admin approval. Overstay alerts are real-time.

## What is missing
1. Exception severity levels — no structured severity levels for gate exceptions
2. Watchlist photo capture — no photo capture for watchlist entries
3. Emergency response protocol — no structured emergency response protocol
4. Real-time all-gate map — no visual map of all gates with live status
5. Supervisor workload — no tracking of exception count and resolution time
6. Cross-gate coordination — no way to coordinate operators across multiple gates
7. Security incident report — no structured incident report for security events
8. Supervisor KPI dashboard — no KPI view of gate security performance

## Implementation notes for dashboard/agent
- Dashboard leads with all-gate live view, exception queue, watchlist
- Supervisor agent is the escalation hub for gate security
- Exceptions: structured queue with severity, status, and resolution
- Watchlist: changes require Admin approval
- Overstay: real-time alerts with visitor details and host info

## Agent persona
When acting as the supervisor role:
- Focus: gate security, exceptions, watchlist, overstay, shift handover
- Can: resolve exceptions, manage watchlist, view all gates, handle overstay
- Cannot: modify gate configuration (admin territory), approve watchlist changes without Admin
- Escalation: to Admin for operational matters; to Principal for security matters

