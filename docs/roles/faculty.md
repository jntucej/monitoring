# Faculty — how it works

## Overview
The faculty role encompasses teaching staff and class teachers across academic departments at JNTUH CEJ. Faculty use the web console to record and verify daily class lecture attendance, resolve student attendance disputes, manage subject assignments and internal marks, review class-level gate pass requests, and mentor assigned student cohorts.

## Pages & workflows
The faculty console operates across 16 routes governed by teaching capability bindings (`faculty_assignments`):

### 1. Daily Teaching Dashboard & Class Management
- `/faculty`: The teaching dashboard landing page, presenting active lecture schedules for the day, quick-action attendance buttons, pending student correction requests, and mentee check-in alerts.
- `/faculty/my-classes`: Lists all classrooms and laboratory batches officially assigned to the logged-in faculty member.
- `/faculty/class`, `/faculty/class/[id]`: Class roster management, displaying student list, current semester attendance averages, and historical attendance trends.

### 2. Live Lecture Attendance & Dispute Resolution
- `/faculty/attendance/[id]`: Classroom attendance recording and verification view for a specific lecture session.
  - *Attendance Taking Workflow*: Faculty opens `/faculty` -> selects current active lecture under **Today's Classes** -> navigates to `/faculty/attendance/[id]` -> reviews populated roster (`GET /faculty/attendance/roster`) -> marks Present, Absent, or Late -> submits session confirmation (`POST /class-sessions/[sessionId]/confirm` or `POST /class-sessions/confirm-bulk`) -> attendance records lock into `class_attendance` table.
- `/faculty/correction-requests`: Inbound queue of student attendance disputes. Faculty can review evidence and either accept (`POST /faculty/marks/correct`) or reject the dispute.

### 3. Subject Coursework & Internal Marks
- `/faculty/subject`, `/faculty/subject/[id]`, `/faculty/subject/classes`, `/faculty/subject/attendance`: Subject-oriented views allowing faculty to track syllabus delivery, lesson plans, batch-wise subject attendance, and cumulative lecture counts.
- Marks and internal exam management: Faculty can draft assignment rubrics and propose internal mid-term marks via backend endpoints (`POST /faculty/marks/submit` and `POST /faculty/internal-exam/propose`).

### 4. Permissions, Class Requests & Student Directory
- `/faculty/class-requests`, `/faculty/request-history`: Inbound requests from students for class exemptions, on-duty (OD) event passes, or medical leave notes affecting class attendance.
  - *Resolution Flow*: Faculty reviews request -> checks attendance threshold -> clicks Approve/Reject (`POST /class-requests/[id]/resolve`).
- `/faculty/permissions`: Review special campus event permissions requiring faculty in-charge sign-off (e.g. hackathons, sports meets, cultural fests).
- `/faculty/student-directory`, `/faculty/reports`: Departmental directory of students, mentee profiles (`GET /faculty/mentees`), and downloadable periodic attendance reports.
- `/faculty/notifications`: Inbound notices regarding timetable changes, department circulars, and system alerts.

## Key API endpoints

| Endpoint | Method(s) | What it does |
|---|---|---|
| `/faculty` | GET | Fetches overall faculty profile, department assignment, and current teaching load. |
| `/faculty/my-classes` | GET | Returns assigned class sections and active semester courses. |
| `/faculty/my-class/[id]` | GET | Returns detailed student roster, enrollment count, and attendance statistics for a section. |
| `/faculty/attendance` | GET | Fetches current attendance sessions and verification statuses. |
| `/faculty/attendance/roster` | GET | Retrieves live student roll list for an active classroom session. |
| `/faculty/attendance/student-disputes` | GET | Retrieves open attendance contestations and disputes submitted by students. |
| `/faculty/mentees` | GET | Lists assigned student mentees with their academic and hostel status. |
| `/class-sessions/live` | GET | Returns real-time ongoing academic class sessions campus-wide. |
| `/class-sessions/confirmations/today` | GET | Returns session attendance confirmation status for the current date. |
| `/class-sessions/[sessionId]/confirm` | POST | Submits faculty confirmation and locks attendance for a specific lecture. |
| `/class-sessions/confirm-bulk` | POST | Concurrently confirms attendance for multiple class periods. |
| `/class-requests` | GET, POST | Lists or creates student classroom exemption and OD requests. |
| `/class-requests/[id]/resolve` | POST | Approves or rejects a student class leave or OD pass request. |
| `/faculty/marks/submit` | POST | Submits evaluated internal marks and exam grades for an assigned class. |
| `/faculty/marks/correct` | POST | Applies an authorized correction to previously submitted student marks. |

## Data flow
When loading `/faculty`, the interface calls `/api/faculty/my-classes` and `/api/class-sessions/confirmations/today` to establish scheduled classes. Taking attendance pulls the student list via `/api/faculty/attendance/roster` and commits marked rolls through `/api/class-sessions/[sessionId]/confirm`. If a student files an attendance dispute, it updates the faculty queue at `/api/faculty/attendance/student-disputes`. Authentication uses an HttpOnly cookie housing a signed JWT access token and Bearer header, refreshed via `/api/auth/refresh` and validated on every route navigation via `/api/auth/session`.

## Security notes
Access to `/faculty/*` is guarded by the **Teaching Capability Gate** (`TeachingBindingGate`): access requires an active record in `faculty_assignments`. Under Postgres RLS, faculty can only view and mutate attendance and marks for student cohorts explicitly assigned to them. Faculty cannot modify institutional gate rules, issue hostel gate release passes, alter classes outside their department, or override supervisor shift logs. Attendance submissions employ a freeze window: once confirmed and closed, retroactive modifications require departmental HOD approval via correction workflows.


## Gaps & Research

### Institutional context
The Faculty role represents teaching staff at JNTUH CEJ. Each faculty member has a mentee list (scoped to their assigned students), marks entry responsibility, assignment management, study material duties, and leave/substitution requests.

Per JNTUH exam procedures, faculty are the first point of entry for marks. Marks entry (faculty) ≠ result processing (Addl. Ctrl Results) ≠ result sign-off (Controller) — separation of duties is enforced.

### Missing (not in app yet)
1. **Study material upload** — no digital repository for study material, notes, and references
2. **Lab practical scheduling** — no integration with lab practical schedules
3. **CBT result upload** — no structured upload for Computer Based Test results
4. **Assignment auto-grading** — no integration with automated assignment submission and grading
5. **Class recording** — no integration with class recording/replay
6. **Faculty workload view** — no visual representation of class load, mentee count, and extra duties
7. **Peer review** — no structured peer review of teaching quality
8. **Research output tracking** — no tracking of publications, patents, or research projects

### Implementation notes
- Dashboard leads with class view, mentee list, marks entry
- Faculty agent is scoped to their assigned classes and students
- Marks entry: structured form with subject, semester, exam type, and marks
- Assignment: create → assign → track → grade → submit
- Leave: request → HOD approval → substitution arrangement

### Agent persona
- Focus: teaching, marks entry, assignments, mentoring, class attendance
- Scoped to: assigned classes, students, and departments
- Can: enter marks, create assignments, request leave, view mentee list
- Cannot: self-approve leave (needs HOD), cross-department actions, result processing
- Escalation: to HOD for academic matters; to OIE for exam matters

