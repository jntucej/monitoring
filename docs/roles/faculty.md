# Faculty — how it works

## Role in institutional life
The Faculty role represents teaching staff at JNTUH CEJ. Faculty are the teaching staff across all 5 B.Tech departments and 5 M.Tech specializations. Each faculty member has a mentee list (scoped to their assigned students), marks entry responsibility, assignment management, study material duties, and leave/substitution requests.

In the Gate Monitor system, faculty see:
- Live lecture attendance and dispute resolution
- Subject coursework and internal marks entry
- Mentee list (scoped to their assigned students)
- Class analytics and completion tracking
- Leave/substitution requests and approvals

Per JNTUH CEJ, faculty are appointed from the teaching staff and may also serve as Hostel Manager, Deputy Warden, or OIE based on their appointment.

## Operational standards
Per Indian university faculty duties:
- Marks entry: faculty enter internal marks, lab practical marks, and CBT results
- Assignment management: faculty create, assign, and track student assignments
- Study material: faculty ensure study material is available and up to date
- Mentee list: faculty are assigned as primary mentors for new students
- Class analytics: faculty monitor attendance, class completion, and student performance
- Leave/substitution: faculty request leave and arrange substitutions; HOD approves
- Lab practicals: faculty conduct and evaluate lab practicals
- CBT: faculty upload Computer Based Test results for internal marks

Per JNTUH exam procedures, faculty are the first point of entry for marks. Marks entry (faculty) ≠ result processing (Addl. Ctrl Results) ≠ result sign-off (Controller) — separation of duties is enforced.

## Accountability and escalation
- Faculty reports to HOD for academic matters
- Leave: faculty → HOD → Principal (for extended leave)
- Marking disputes: student → faculty → HOD → OIE
- Assignment tracking: faculty → HOD for deadline extensions
- CBT results: faculty → exam branch office for processing

## What we have in the app
- /faculty — Dashboard with class view, mentee list, marks entry
- /faculty/classes — Live class state, attendance tracking
- /faculty/marks — Internal marks entry, lab practical marks, CBT results
- /faculty/assignments — Assignment creation and tracking
- /faculty/mentees — Mentee list (scoped to assigned students)
- /faculty/leave — Leave/substitution requests

Key API endpoints:
- POST /api/faculty/marks — Enter marks
- POST /api/faculty/assignments — Create/assign assignment
- POST /api/faculty/leave/request — Request leave
- GET /api/faculty/mentees — View mentee list
- GET /api/faculty/classes — Class analytics

Data flow: Faculty marks entry is the first step in the result processing chain. Faculty actions are logged in audit_events. Mentee list is scoped to the faculty's assigned students.

## What is missing
1. Study material upload — no digital repository for study material, notes, and references
2. Lab practical scheduling — no integration with lab practical schedules
3. CBT result upload — no structured upload for Computer Based Test results
4. Assignment auto-grading — no integration with automated assignment submission and grading
5. Class recording — no integration with class recording/replay
6. Faculty workload view — no visual representation of class load, mentee count, and extra duties
7. Peer review — no structured peer review of teaching quality
8. Research output tracking — no tracking of publications, patents, or research projects

## Implementation notes for dashboard/agent
- Dashboard leads with class view, mentee list, marks entry
- Faculty agent is scoped to their assigned classes and students
- Marks entry: structured form with subject, semester, exam type, and marks
- Assignment: create → assign → track → grade → submit
- Leave: request → HOD approval → substitution arrangement

## Agent persona
When acting as the faculty role:
- Focus: teaching, marks entry, assignments, mentoring, class attendance
- Scoped to: assigned classes, students, and departments
- Can: enter marks, create assignments, request leave, view mentee list
- Cannot: self-approve leave (needs HOD), cross-department actions, result processing
- Escalation: to HOD for academic matters; to OIE for exam matters

