# HOD (Head of Department) — how it works

## Role in institutional life
The HOD is the academic head of a single department at JNTUH CEJ. There are 5 B.Tech departments (EEE, ME, ECE, CSE, IT) and 5 M.Tech specializations, each with its own HOD. The HOD role in the Gate Monitor system is scoped to a single department via auth.departmentId — an HOD sees only their own department's students, faculty, classes, and operations.

In real institutional life, the HOD:
- Convenes and presides over department meetings and Board of Studies
- Organizes teaching and research work in the department
- Frames the time table in conformity with the allocation of teaching work
- Maintains discipline in classrooms and laboratories
- Assigns duties to teachers and exercises control over non-teaching staff
- Is responsible for department records, equipment, furniture, and department library
- Operates the department budget
- Manages faculty workload, leave, and substitution requests
- Escalates academic status flags (SUSPENDED, DEBARRED, LATERAL_JOIN)

Per UGC / JNTUH ordinances, the HOD is the primary academic authority within the department and reports to the Principal/VP.

## Operational standards
Per JNTUH CEJ department governance:
- Faculty marking entry: HOD supervises and verifies marks entry by faculty
- Assignment management: HOD approves assignment schedules and tracks completion
- Study material: HOD ensures study material is available and up to date
- Mentee list: HOD is the primary mentor for new students in the department
- Class analytics: HOD monitors attendance, class completion, and student performance
- Leave/substitution: HOD approves faculty leave and arranges substitutions
- Internal exam proposals: HOD proposes internal exam schedules and question papers
- Academic status flags: HOD flags SUSPENDED/DEBARRED/LATERAL_JOIN; DEBARRED requires two-person approval (HOD + Dean/Principal)

Per Indian university exam standards, the HOD works with the exam branch office for internal marks, lab marks, and CBT (Computer Based Test) results.

## Accountability and escalation
- HOD reports to Principal/VP for department-level decisions
- Academic status: SUSPENDED → HOD; DEBARRED → HOD + Dean/Principal (two-person); LATERAL_JOIN → HOD + OIE
- Faculty workload: HOD → Principal for cross-department transfers
- Grievance escalation: student → HOD → VP → Principal
- Exam matters: HOD → OIE → VP → Principal (as Chief Superintendent)

## What we have in the app
- /hod — Dashboard with department view: students, faculty, classes, attendance
- /hod/dept/[id] — Department-specific view scoped by auth.departmentId
- /hod/faculty — Faculty workload, leave, substitution requests
- /hod/academic-status — Academic status flags (SUSPENDED, DEBARRED, LATERAL_JOIN)
- /hod/exams — Internal exam proposals, marks entry supervision
- /hod/classes — Class analytics, attendance tracking

Key API endpoints:
- GET /api/hod/dept/[departmentId] — Department view
- POST /api/hod/academic-status/[studentId]/flag — Flag academic status
- POST /api/hod/faculty/[id]/leave — Approve faculty leave
- POST /api/hod/exams/proposal — Submit internal exam proposal
- GET /api/hod/classes — Class analytics

Data flow: HOD actions are scoped to auth.departmentId. Academic status flags are logged in audit_events. DEBARRED requires a second approval from Dean/Principal.

## What is missing
1. Department KPI dashboard — no single view showing department performance, attendance, marks, and compliance
2. Faculty workload heat map — no visual representation of faculty workload distribution
3. Marking entry workflow — no structured workflow for faculty to enter marks and HOD to verify
4. Board of Studies minutes — no digital record of department council decisions
5. Cross-department comparison — no way for HOD to see how their department compares to others
6. Student mentor tracking — no structured mentor-mentee relationship tracking
7. Lab mark integration — no integration with lab practical marks entry
8. CBT result tracking — no view of Computer Based Test results per student

## Implementation notes for dashboard/agent
- Dashboard leads with department KPIs: attendance, marks, faculty workload, compliance
- HOD agent is scoped to a single department — always show the department name in the UI
- Academic status: DEBARRED requires two-person approval (HOD + Dean/Principal)
- Faculty workload: show leave requests, substitution needs, and class load in one view
- Exam proposals: structured form with schedule, question paper reference, and CBT integration

## Agent persona
When acting as the hod role:
- Focus: department operations, faculty workload, academic status, exam proposals
- Scoped to: a single department (EEE/ME/ECE/CSE/IT)
- Can: flag academic status, approve faculty leave, submit exam proposals, view class analytics
- Cannot: self-approve DEBARRED (needs Dean/Principal), cross-department actions
- Escalation: to Principal/VP for department-level decisions; to OIE for exam matters

