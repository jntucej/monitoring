# Exam Superintendent — how it works

## Role in institutional life
The Chief Superintendent of Examinations at JNTUH CEJ is the Principal wearing the exam cap. Per JNTUH convention, the Principal acts as Chief Superintendent during exam days. The Chief Superintendent:
- Runs the exam-day command console
- Manages candidate attendance
- Controls hall access
- Handles spot exceptions (absent candidates, late arrivals, medical emergencies)
- Is the final authority on exam-day decisions

In the Gate Monitor system, the Exam Superintendent role is a separate capability context from the Principal role. The Principal can act in both contexts, but the Exam Superintendent context is scoped to exam-day operations.

Per JNTUH examination procedures (referenced from jntuh.ac.in examination branch):
- The Controller of Examinations oversees the exam branch office
- Additional Controllers handle: academic (question papers), results (processing), automation (CBT, student profiles)
- The Chief Superintendent is the on-ground authority at the college level
- Exam-day operations: candidate attendance, hall discipline, exception handling

## Operational standards
Per JNTUH exam office procedures:
- Candidate attendance: Chief Superintendent ensures all registered candidates are present in their assigned halls
- Hall access: Chief Superintendent controls hall entry/exit; unauthorized entry is a security incident
- Spot exceptions: late arrivals, medical emergencies, candidate disputes are handled by the Chief Superintendent
- Exam discipline: Chief Superintendent enforces exam rules and handles violations
- Result processing: the exam branch office handles result processing under the Controller; the Chief Superintendent does NOT process results (separation of duties)

Per Indian university exam standards, no single exam role can both enter and publish a result:
- Marks entry (faculty) ≠ result processing (Addl. Ctrl Results) ≠ result sign-off (Controller)

## Accountability and escalation
- Exam Superintendent (Principal) reports to Vice Chancellor, JNTUH for exam matters
- Spot exceptions: Chief Superintendent decides → exam branch office records
- Exam discipline: Chief Superintendent enforces → Principal reviews
- Result disputes: exam branch office → Controller → Principal
- Hall access security: Chief Superintendent → Security Supervisor → Admin

## What we have in the app
- /exam-superintendent — Exam-day command console
- /exam-superintendent/attendance — Candidate attendance tracking
- /exam-superintendent/halls — Hall access control
- /exam-superintendent/exceptions — Spot exception queue

Key API endpoints:
- GET /api/exam-superintendent/attendance — Candidate attendance
- POST /api/exam-superintendent/halls/[id]/access — Control hall access
- POST /api/exam-superintendent/exceptions — Log spot exception
- GET /api/exam-superintendent/exceptions — Exception queue

Data flow: Exam-day actions are logged in audit_events with full context. Candidate attendance updates the exam attendance table. Hall access controls are enforced in real time.

## What is missing
1. Exam-day KPI dashboard — no single view of all halls, candidates, and exceptions
2. Candidate check-in — no structured candidate check-in at gate
3. Hall capacity tracking — no tracking of hall capacity vs candidates
4. Exception SLA — no SLA timers for spot exception resolution
5. Exam discipline log — no structured log of exam rule violations
6. Result processing view — no view of result processing status (that's exam branch)
7. Exam day schedule — no visual exam day schedule
8. Candidate communication — no way to communicate with candidates on exam day

## Implementation notes for dashboard/agent
- Dashboard leads with exam-day KPIs: halls, candidates, exceptions
- Exam Superintendent agent is scoped to exam-day operations
- Attendance: real-time candidate check-in across all halls
- Hall access: controlled by Chief Superintendent, enforced in real time
- Exceptions: structured queue with severity and resolution tracking

## Agent persona
When acting as the exam_superintendent role:
- Focus: exam-day operations, candidate attendance, hall access, spot exceptions
- Can: control hall access, log exceptions, track attendance
- Cannot: process results (exam branch), self-approve result publishing
- Escalation: to Principal for non-exam matters; to exam branch for result matters

