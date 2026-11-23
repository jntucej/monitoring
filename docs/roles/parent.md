# Parent — how it works

## Role in institutional life
The Parent role represents the parent of an enrolled student at JNTUH CEJ. In the Gate Monitor system, the Parent has a broader academic and campus view than the Guardian:
- Student's academic progress (marks + attendance %)
- Leave acknowledgements for gate-pass chains
- Fee due alerts and payment status
- Visitor scheduling
- Campus safety notifications (lockdown, curfew, emergencies)

The Parent is the primary academic stakeholder for the student. For hostel students, the Parent is the mandatory gate-pass acknowledgement authority — without Parent acknowledgement, the student's gate pass is not issued.

## Operational standards
Per Indian university parent portal best practices:
- Academic progress: real-time view of marks, attendance %, and semester performance
- Leave acknowledgements: Parent must acknowledge gate passes for hostel students before the pass is issued
- Fee alerts: proactive alerts when fee dues are due or overdue
- Visitor scheduling: Parent can pre-register visitors to meet the child on campus
- Campus safety: Parent receives notifications for lockdown, curfew, and emergency events

Per JNTUH CEJ gate-pass rules, parent acknowledgement is a required step in the gate-pass chain for hostel students. The Parent's mobile app shows the pass details and requires an explicit acknowledgement.

## Accountability and escalation
- Parent reports to no one (external to the institution)
- Academic concerns: Parent → HOD → VP → Principal
- Fee disputes: Parent → College Office → Principal
- Gate-pass issues: Parent → Hostel Manager → Principal
- Campus safety: Parent receives notifications; escalation is one-way (institution → Parent)

## What we have in the app
- /parent — Dashboard with child's academic progress, fee status, leave acknowledgements
- /parent/academic — Marks and attendance
- /parent/fees — Fee dues and payment status
- /parent/leave — Leave acknowledgements for gate-pass chains
- /parent/visitors — Visitor scheduling
- /parent/notifications — Campus safety notifications

Key API endpoints:
- GET /api/parent/academic — View academic progress
- GET /api/parent/fees — View fee status
- POST /api/parent/leave/[passId]/acknowledge — Acknowledge gate pass
- POST /api/parent/visitors — Schedule visitor
- GET /api/parent/notifications — View campus notifications

Data flow: Parent actions are scoped to their child's records. Academic and fee data is read-only. Leave acknowledgements are required for hostel gate-passes.

## What is missing
1. Academic KPI dashboard — no visual representation of academic trends
2. Fee payment integration — no direct payment link for fee dues
3. Multiple child support — no support for parents of multiple children
4. Parent-teacher communication — no structured communication log with faculty
5. Hostel visit booking — no structured booking for hostel visits
6. Emergency contact management — no way to manage emergency contacts
7. Campus event calendar — no view of upcoming campus events relevant to the parent
8. Academic alerting — no proactive alert when child's attendance or marks drop below threshold

## Implementation notes for dashboard/agent
- Dashboard leads with child's academic progress, fee status, leave acknowledgements
- Parent agent is scoped to their child's records
- Leave: acknowledgement is a required step for hostel gate-passes
- Notifications: one-way (institution → Parent) for campus safety

## Agent persona
When acting as the parent role:
- Focus: child's academics, fees, leave acknowledgements, visitors
- Scoped to: their child's records
- Can: view academics/fees, acknowledge gate passes, schedule visitors
- Cannot: approve leave (needs HOD/Principal), modify academic records
- Escalation: to HOD for academic; to Hostel Manager for gate-pass; to Principal for disputes

