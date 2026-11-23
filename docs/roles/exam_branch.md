# Exam Branch — how it works

## Role in institutional life
The Exam Branch office at JNTUH CEJ is the operational authority for all examination matters. Per JNTUH examination branch (jntuh.ac.in), the exam branch is led by the Controller of Examinations with Additional Controllers for academic, results, and automation. At the constituent college level, the exam branch office handles:

- Examination planning and scheduling
- Hall ticket generation and distribution
- Center jumbling and branch-wise allocation
- Observer allotment to exam centers
- Seating arrangement and nominal rolls generation
- D-forms uploading
- Electronic distribution of encrypted question papers
- Spot valuation application
- Evaluator registration
- Project panels automation
- Notifications and timetables
- Results processing
- Results publishing
- Online convocation services
- Online certificate verification
- Cashless transactions

In the Gate Monitor system, the Exam Branch role is the office that handles the operational side of exams — planning, scheduling, and result processing. The Chief Superintendent (Principal) handles exam-day operations. The separation of duties is critical: no single role can both enter and publish a result.

## Operational standards
Per JNTUH exam branch procedures:
- Examination planning: exam branch schedules all exams and publishes timetables
- Hall ticket generation: hall tickets are generated and distributed electronically
- Center jumbling: exam centers are jumbled to prevent bias
- Observer allotment: observers are allotted to exam centers
- Seating arrangement: nominal rolls are generated for seating
- Question papers: encrypted question papers are distributed electronically
- Spot valuation: spot valuation applications are processed
- Results processing: results are processed by the Additional Controller of Results
- Results publishing: results are published by the Controller
- Convocation: online convocation services are managed

Per Indian university exam standards, the separation of duties is:
- Marks entry: faculty (first point of entry)
- Result processing: Additional Controller of Results
- Result sign-off: Controller of Examinations
- Result publishing: Controller (only after sign-off)

## Accountability and escalation
- Exam Branch reports to Controller of Examinations (JNTUH) and Principal (college level)
- Exam planning: exam branch → Principal approval
- Hall ticket issues: exam branch → Chief Superintendent (exam-day)
- Result disputes: exam branch → Controller → Principal
- Center jumbling: exam branch decides → Controller approves

## What we have in the app
- /exam-branch — Dashboard with exam planning, scheduling, result processing
- /exam-branch/planning — Exam planning and scheduling
- /exam-branch/hall-tickets — Hall ticket generation and distribution
- /exam-branch/results — Result processing view
- /exam-branch/notifications — Exam notifications and timetables

Key API endpoints:
- GET /api/exam-branch/planning — Exam planning
- POST /api/exam-branch/hall-tickets — Generate hall tickets
- GET /api/exam-branch/results — Result processing view
- POST /api/exam-branch/results/[id]/process — Process result
- GET /api/exam-branch/notifications — Exam notifications

Data flow: Exam branch actions are the highest-severity exam entries in audit_events. Hall ticket generation creates hall ticket records. Result processing follows the separation of duties chain.

## What is missing
1. Exam planning dashboard — no visual exam planning calendar
2. Hall ticket tracking — no tracking of hall ticket distribution
3. Result processing pipeline — no visual pipeline for result processing
4. Discrepancy detection — no automatic detection of result discrepancies
5. Exam notification management — no structured notification management
6. Center jumbling view — no visual view of center jumbling
7. Observer allotment — no structured observer allotment tracking
8. Convocation management — no online convocation management

## Implementation notes for dashboard/agent
- Dashboard leads with exam planning, scheduling, result processing
- Exam Branch agent is the operational authority for exam matters
- Hall tickets: generated and distributed electronically
- Results: processing follows separation of duties chain
- Notifications: structured with priority and delivery tracking

## Agent persona
When acting as the exam_branch role:
- Focus: exam planning, scheduling, hall tickets, result processing
- Can: plan exams, generate hall tickets, process results, publish notifications
- Cannot: self-approve result publishing (needs Controller sign-off), control hall access (Chief Superintendent)
- Escalation: to Controller for result matters; to Chief Superintendent for exam-day matters

