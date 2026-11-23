# Student — how it works

## Role in institutional life
The Student role represents enrolled students at JNTUH CEJ, partitioned into two operational personas: day scholars and hostel residents. In the Gate Monitor system, students use the web application to manage gate movement passes, track attendance and academic milestones, view mess menus and tokens, submit campus complaints, and respond to curfew or security notifications.

Per JNTUH CEJ, the student is the primary user of the system. The student's experience is the most context-aware in the app:
- Day scholars see: Day Out, Early Leave, Late Arrival, and academic milestones
- Hostel residents see: Curfew countdown, ActivePassCard, Expected Return, Overstay alerts

The student's gate-pass experience is the core of the system: request → approval chain → QR pass → gate scan → check-in/check-out.

## Operational standards
Per Indian university student portal best practices:
- Gate pass request: student selects pass type, fills destination/reason/dates, system checks persona rules (e.g. 4/month quota for hosteller Outpass)
- Attendance tracking: real-time view of attendance % per subject and overall
- Academic milestones: recap, activity, calendar views
- Mess: menu view, token balance, special requests, reviews
- Complaints: structured complaint submission and tracking
- Library: digital library access and account status
- Marks: internal and external exam marks
- Curfew: hostel residents see curfew countdown, overstay alerts, and expected return

Per JNTUH CEJ gate-pass rules, the student's pass request flows through: student → HOD (for academic reasons) → Hostel Manager (for hostel students) → Parent acknowledgement (for hostel students) → gate pass issued.

## Accountability and escalation
- Student reports to HOD for academic matters
- Gate-pass disputes: student → HOD → Hostel Manager → Principal
- Mess complaints: student → Mess In-charge → Hostel Manager
- Hostel complaints: student → Deputy Warden → Hostel Manager → Principal
- Fee disputes: student → College Office → Principal

## What we have in the app
- /student — Persona-aware landing dashboard (day scholar vs hosteller)
- /student/passes — Gate pass requests and tracking
- /student/attendance — Attendance tracking and analytics
- /student/mess — Mess menu, tokens, special requests, reviews
- /student/complaints — Structured complaint submission
- /student/fees — Fee dues and payment status
- /student/marks — Internal and external exam marks
- /student/calendar — Academic and campus calendar
- /student/achievements — Achievements and awards
- /student/recap — Academic milestone reviews
- /student/coordinator — Class coordinator view

Key API endpoints:
- POST /api/student/passes — Request gate pass
- GET /api/student/attendance — View attendance
- POST /api/student/complaints — Submit complaint
- GET /api/student/fees — View fee status
- GET /api/student/marks — View marks

Data flow: Student pass requests create a pass record with approval chain. Attendance is tracked per subject and overall. Mess tokens are issued per resident, per meal, per day.

## What is missing
1. Attendance alerts — no proactive alert when attendance drops below 75% threshold
2. Fee payment integration — no direct payment link for fee dues
3. Mess menu personalization — no way to customize menu preferences
4. Academic planning — no structured academic planning (electives, projects, internships)
5. Library digital resources — no integration with digital library
6. Exam preparation — no structured exam preparation resources
7. Hostel visit booking — no structured booking for parent visits to hostel
8. Student feedback — no structured feedback on campus facilities and services

## Implementation notes for dashboard/agent
- Dashboard is persona-aware: day scholar vs hosteller
- Day scholar: Day Out, Early Leave, Late Arrival, academic milestones
- Hosteller: Curfew countdown, ActivePassCard, Expected Return, Overstay
- Pass request: structured form with persona rules and approval chain
- Attendance: real-time view with 75% threshold alerts

## Agent persona
When acting as the student role:
- Focus: gate passes, attendance, mess, complaints, fees, marks
- Persona: day scholar or hosteller (drives the entire UI)
- Can: request passes, view attendance, submit complaints, view fees/marks
- Cannot: approve their own passes (needs HOD/Hostel Manager/Parent)
- Escalation: to HOD for academic; to Hostel Manager for hostel; to Principal for disputes

