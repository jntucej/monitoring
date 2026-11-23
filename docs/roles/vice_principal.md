# Vice-Principal — how it works

## Role in institutional life
The Vice-Principal is the second-highest authority at JNTUH CEJ, reporting directly to the Principal. The Vice-Principal discharges the Principal's duties during leave and handles the exam office queue, OIE (Office of the Registrar/Examination Officer) duties, academic exceptions, and department-level academic review.

In the Gate Monitor system, the Vice-Principal has a capability-gated view: the Principal Bridge widget shows what the Principal has delegated or flagged. The VP can view live class state, confirm a faculty's class on their behalf, view exam coordination, and view hostel aggregate (no PII).

Per JNTUH convention, the Vice-Principal is the first point of escalation for:
- Exam office queue (candidate attendance, hall access, spot exceptions)
- Academic exceptions (late submissions, exam re-sits, grade disputes)
- Department-level academic review (HOD reports, curriculum changes)
- Principal's absence (all approvals flow to VP)

## Operational standards
Per Indian university governance:
- The Vice-Principal acts as Principal's delegate with time-boxed authority
- Exam office queue: OIE handles candidate attendance reconciliation, hall access, and exceptions
- Academic exceptions: the VP reviews and signs off on late submissions, re-sits, and grade disputes
- Department review: the VP reviews HOD reports and curriculum proposals
- The VP can confirm a faculty's class on their behalf if the faculty is absent
- Hostel aggregate: the VP sees occupancy and curfew compliance but no individual student PII

Per JNTUH exam office procedures, the Vice-Principal works with the exam branch office under the Controller of Examinations for result processing and exam-day operations.

## Accountability and escalation
- VP reports to Principal (campus head)
- Exam matters: OIE → VP → Principal (as Chief Superintendent)
- Academic exceptions: HOD → VP → Principal
- Delegation: VP receives delegated authority from Principal with time-box
- VP can flag items to the Principal via the Principal Bridge
- VP cannot self-approve; all VP actions require Principal sign-off for final authority

## What we have in the app
- /vice-principal — Dashboard with exam office queue, OIE duties, academic exceptions
- /vice-principal/bridge — Principal Bridge: items flagged by or for the Principal
- /vice-principal/exams — Exam coordination view
- /vice-principal/departments — Department performance review
- /vice-principal/classes — Live class state, faculty confirmation

Key API endpoints:
- GET /api/vice-principal/bridge — View Principal bridge items
- POST /api/vice-principal/bridge/[id]/flag — Flag an item to Principal
- GET /api/vice-principal/exams — Exam coordination
- POST /api/vice-principal/classes/[id]/confirm — Confirm faculty's class on behalf
- GET /api/vice-principal/departments — Department performance

Data flow: VP actions are logged in audit_events. Principal Bridge creates a flag record with context. Delegation records are time-boxed and auto-revoke.

## What is missing
1. Exam-day command center — no dedicated view for exam-day operations (candidate attendance, hall access, exceptions)
2. OIE queue management — no structured queue for candidate attendance reconciliation
3. Academic exception workflow — no formal process for late submissions, re-sits, grade disputes
4. Principal leave handoff — no formal process for VP to take over when Principal is on leave
5. Department KPI dashboard — no single view comparing all 5 B.Tech + 5 M.Tech departments
6. VP action log — no structured log of all VP decisions and their outcomes
7. Cross-exam coordination — no view showing all exam centers, candidates, and exceptions in one screen
8. Hostel aggregate alerting — no proactive alert when hostel curfew compliance drops below threshold

## Implementation notes for dashboard/agent
- Dashboard leads with exam office queue, OIE duties, academic exceptions
- VP agent has capability-gated view: what it can see/do is data-driven, not hardcoded
- Principal Bridge is the signature widget: shows what the Principal has flagged or delegated
- VP agent should escalate to Principal for all final approvals
- Exam-day: the VP console should show candidate attendance, hall access, spot exceptions in real time

## Agent persona
When acting as the vice_principal role:
- Focus: exam office queue, OIE duties, academic exceptions, department review
- Can: view live class state, confirm faculty's class, view exam coordination, view hostel aggregate
- Cannot: self-approve; all final authority rests with Principal
- Escalation: to Principal for all final decisions
- Three escalation paths: exam → OIE → VP → Principal; academic → HOD → VP → Principal; hostel → hostel_manager → VP → Principal

