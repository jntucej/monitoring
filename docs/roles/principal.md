# Principal — how it works

## Role in institutional life
The Principal is the administrative and academic head of JNTUH CEJ, reporting to the Vice Chancellor of JNTUH Hyderabad. In the Gate Monitor system, the Principal role is the highest-privilege user: full campus strategic view, all approver workflows, delegation authority, and lockdown power.

Per JNTUH convention, the Principal wears three hats simultaneously:
1. Principal — overall campus authority, strategic decisions, all-level approver
2. Chief Warden — head of hostel administration, disciplinary escalation to DEBARRED
3. Chief Superintendent of Examinations — exam-day authority, candidate attendance, hall access

The Vice-Principal discharges the Principal's duties during leave. The Dean of Faculty supervises the Vice-Principal. No single person can both enter and publish a result — separation of duties is enforced across the exam branch.

## Operational standards
Per Indian university governance (UGC Act, AICTE norms, JNTUH ordinances):
- The Principal is the Convener of the Academic Council and the Board of Studies
- All gate-pass approvals at the highest level flow through the Principal
- Lockdown authority: only the Principal can declare a campus-wide lockdown
- Disciplinary authority: only the Principal (as Chief Warden) can escalate a hostel case to DEBARRED status
- Exam authority: the Principal (as Chief Superintendent) is the final approver for exam-day exceptions
- Delegation: the Principal can delegate specific approval authority to the Vice-Principal or Dean with time-boxed expiry

Per JNTUH CEJ hostel rules: the Principal is the Chief Warden, with the Hostel Manager as the operational warden and Deputy Wardens as block-level supervisors.

Per Indian university exam standards: the Chief Superintendent ensures candidate attendance, hall discipline, and exception handling. The exam branch office handles result processing under the Controller of Examinations.

## Accountability and escalation
- Principal reports to Vice Chancellor, JNTUH Hyderabad
- All Principal actions are logged in audit_events with full context
- Lockdown: two-person approval (Principal + one designated authority, e.g. Dean)
- DEBARRED escalation: Principal alone (highest disciplinary authority)
- Delegation: time-boxed, recorded in audit_events, auto-revokes on expiry
- For exam matters, the Principal works with the exam branch office under the Controller of Examinations

## What we have in the app
- /principal — Dashboard with campus-wide strategic view, all approver queues
- /principal/approvals — All-level approval queue (gate passes, leave, mess, exam)
- /principal/delegation — Delegate approval authority to VP/Dean with time-box
- /principal/lockdown — Campus lockdown declaration
- /principal/hostel — Chief Warden view: disciplinary cases, DEBARRED escalation
- /principal/exams — Chief Superintendent view: exam-day exceptions, hall access

Key API endpoints:
- POST /api/principal/approvals/[ticket]/sign — Sign an approval
- POST /api/principal/delegation — Delegate authority
- POST /api/principal/lockdown — Declare lockdown
- POST /api/principal/hostel/debarred — Escalate to DEBARRED
- GET /api/principal/dashboard — Strategic campus view

Data flow: All Principal actions are the highest-severity entries in audit_events. Delegation creates a delegation record with expiry. Lockdown broadcasts to all gate operators in real time.

## What is missing
1. Strategic KPI dashboard — no single view showing academic performance, gate security, hostel occupancy, and exam status
2. Delegation expiry alerting — no notification when a delegation is about to expire
3. Lockdown drill mode — no way to test lockdown without triggering it
4. Cross-department view — no way to see all 5 B.Tech departments + 5 M.Tech in one view
5. Principal's leave workflow — no formal process for handing off to Vice-Principal
6. Board of Studies minutes — no digital record of academic council decisions
7. Exam-day command center — no single screen for the Chief Superintendent on exam day
8. DEBARRED case file — no structured case file for disciplinary escalation

## Implementation notes for dashboard/agent
- Dashboard leads with strategic KPIs: gate status, pending approvals, hostel occupancy, exam status
- Principal agent has the highest privilege but must follow separation of duties
- Lockdown: two-person approval, time-boxed, auto-revokes
- Delegation: always show the delegation chain and expiry in the UI
- Exam-day: the Chief Superintendent console should be a separate view with candidate attendance, hall access, spot exceptions

## Agent persona
When acting as the principal role:
- Focus: strategic campus view, all-level approvals, delegation, lockdown, DEBARRED
- Can: sign any approval, delegate authority, declare lockdown, escalate to DEBARRED
- Cannot: self-approve without two-person for lockdown; cannot bypass exam SoD (separation of duties)
- Escalation: to Vice Chancellor, JNTUH Hyderabad
- Three hats: Principal + Chief Warden + Chief Superintendent of Examinations

