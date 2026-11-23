# OIE — how it works

## Role in institutional life
The OIE (Office of the Registrar/Examination Officer) at JNTUH CEJ is the operational office that handles exam queue triage, access and exception intake, candidate attendance reconciliation, and decision queues. The OIE is the first point of contact for exam-related queries and exceptions.

In the Gate Monitor system, the OIE:
- Triages exam queue (candidate attendance, access requests, exceptions)
- Handles access and exception intake
- Reconciles candidate attendance
- Manages the decision queue for exam-day decisions
- Works under the Vice-Principal and Principal

Per JNTUH exam office procedures, the OIE is the operational office that handles the day-to-day exam matters. The Vice-Principal discharges OIE duties during the Principal's absence.

## Operational standards
Per JNTUH exam office procedures:
- Exam queue triage: OIE triages all exam-related queries and exceptions
- Access intake: OIE handles candidate access requests and verifies eligibility
- Candidate attendance: OIE reconciles candidate attendance with registered lists
- Decision queue: OIE manages the decision queue for exam-day decisions
- Exception handling: OIE handles spot exceptions and escalates to Vice-Principal/Principal

Per Indian university exam office standards:
- OIE is the first point of contact for exam-related matters
- OIE works under the Vice-Principal and Principal
- OIE does NOT process results (that's the exam branch office)
- OIE does NOT control hall access (that's the Chief Superintendent)

## Accountability and escalation
- OIE reports to Vice-Principal (primary) and Principal (final authority)
- Exam queue: OIE triages → Vice-Principal reviews → Principal decides
- Access requests: OIE verifies → Vice-Principal approves
- Candidate attendance: OIE reconciles → Vice-Principal verifies
- Exceptions: OIE handles → Vice-Principal → Principal (if major)

## What we have in the app
- /oie — Dashboard with exam queue, access requests, candidate attendance
- /oie/queue — Exam queue triage
- /oie/access — Access and exception intake
- /oie/attendance — Candidate attendance reconciliation
- /oie/decisions — Decision queue for exam-day decisions

Key API endpoints:
- GET /api/oie/queue — Exam queue
- POST /api/oie/access — Handle access request
- GET /api/oie/attendance — Candidate attendance
- POST /api/oie/attendance/reconcile — Reconcile attendance
- GET /api/oie/decisions — Decision queue

Data flow: OIE actions are logged in audit_events with full context. Exam queue is triaged in real time. Candidate attendance is reconciled against registered lists.

## What is missing
1. Exam queue dashboard — no visual exam queue with priority and status
2. Access request workflow — no structured access request workflow
3. Attendance reconciliation alerts — no alerts when attendance discrepancy is detected
4. Decision queue SLA — no SLA timers for decision queue items
5. OIE KPI dashboard — no KPI view of OIE performance
6. Exception categorization — no structured categorization of exam exceptions
7. OIE exam day view — no dedicated exam day view for OIE
8. Communication log — no structured log of OIE communications with candidates

## Implementation notes for dashboard/agent
- Dashboard leads with exam queue, access requests, candidate attendance
- OIE agent is the first point of contact for exam matters
- Queue: structured triage with priority and status
- Access: structured workflow with verification and approval
- Attendance: reconciliation with discrepancy alerts

## Agent persona
When acting as the oie role:
- Focus: exam queue, access requests, candidate attendance, decision queue
- Can: triage exam queue, handle access requests, reconcile attendance
- Cannot: process results (exam branch), control hall access (Chief Superintendent)
- Escalation: to Vice-Principal for exam matters; to Principal for major decisions

