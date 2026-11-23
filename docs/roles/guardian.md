# Guardian — how it works

## Role in institutional life
The Guardian role represents parents and local guardians of students at JNTUH CEJ. In the Gate Monitor system, the Guardian has a limited but critical view:
- Child's fee dues and payment status
- Academic progress (marks + attendance %)
- Leave requests on behalf of the child
- Parent acknowledgement in the gate-pass chain for hostel students
- Visitor scheduling (host for guest passes)

The Guardian is distinct from the Parent role in the app. The Parent role has broader academic visibility (progress, leave acknowledgments, fee alerts). The Guardian is specifically the local guardian — the person the student lives with if not in a hostel.

## Operational standards
Per Indian university parent/guardian portal best practices:
- Fee dues: real-time view of outstanding fees, payment schedule, and due dates
- Academic progress: marks from internal and external exams, attendance percentage
- Leave requests: Guardian can request leave on behalf of the child; subject to HOD/Principal approval
- Parent acknowledgement: for hostel students, the Parent/Guardian must acknowledge gate passes before the student leaves campus
- Visitor scheduling: Guardian can pre-register visitors to meet the child on campus

Per JNTUH CEJ gate-pass rules, parent acknowledgement is a required step in the gate-pass chain for hostel students. Without acknowledgement, the pass is not issued.

## Accountability and escalation
- Guardian reports to no one (external to the institution)
- Fee disputes: Guardian → College Office → Principal
- Academic concerns: Guardian → HOD → VP → Principal
- Leave disputes: Guardian → HOD → Principal
- Gate-pass issues: Guardian → Hostel Manager → Principal

## What we have in the app
- /guardian — Dashboard with child's fee status, academic progress, leave requests
- /guardian/fees — Fee dues and payment status
- /guardian/academic — Marks and attendance
- /guardian/leave — Leave requests on behalf of child
- /guardian/acknowledgements — Gate-pass acknowledgements for hostel students
- /guardian/visitors — Visitor scheduling

Key API endpoints:
- GET /api/guardian/fees — View fee dues
- GET /api/guardian/academic — View academic progress
- POST /api/guardian/leave/request — Request leave on behalf of child
- POST /api/guardian/acknowledgements/[passId] — Acknowledge gate pass
- POST /api/guardian/visitors — Schedule visitor

Data flow: Guardian actions are scoped to their child's records. Fee and academic data is read-only. Leave requests follow the standard approval chain.

## What is missing
1. Fee payment integration — no direct payment link for fee dues
2. Academic alerting — no proactive alert when child's attendance drops below threshold
3. Leave approval status — no real-time view of leave approval status
4. Visitor notification — no notification when a scheduled visitor arrives
5. Multiple child support — no support for guardians of multiple children
6. Communication log — no structured log of communications with the institution
7. Emergency contact — no way to set/update emergency contact for the child
8. Hostel visit booking — no structured booking for hostel visits

## Implementation notes for dashboard/agent
- Dashboard leads with child's fee status, academic progress, leave requests
- Guardian agent is scoped to their child's records
- Fee: read-only view with payment schedule
- Leave: structured request with HOD/Principal approval tracking
- Gate-pass: acknowledgement is a required step for hostel students

## Agent persona
When acting as the guardian role:
- Focus: child's fees, academics, leave, gate-pass acknowledgement
- Scoped to: their child's records
- Can: view fees/academics, request leave, acknowledge gate passes, schedule visitors
- Cannot: approve leave (needs HOD/Principal), modify academic records
- Escalation: to HOD for academic; to Hostel Manager for gate-pass; to Principal for disputes

