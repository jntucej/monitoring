# Student — how it works

## Overview
The student role represents enrolled students at JNTUH CEJ, partitioned into two operational personas: day scholars and hostel residents. Students use the web application to manage gate movement passes, track attendance and academic milestones, view mess menus and tokens, submit campus complaints, and respond to curfew or security notifications.

## Pages & workflows
The student interface spans 45 routes categorized into core functional workflows:

### 1. Dashboard & Status
- `/student`: Persona-aware landing dashboard. For day scholars, it prioritizes real-time class attendance percentages, today's schedule (`MyDayStrip`), and action items; for hostellers, it highlights curfew countdowns, active hostel passes (`ActivePassCard`), and resident status.
- `/student/recap`, `/student/activity`, `/student/calendar`: Academic milestone reviews, personal activity history, and combined academic/campus calendar.
- `/student/id`: Digital student ID card with live identity tokens for gate and campus verification.

### 2. Gate Passes & Permission Requests
- `/student/passes`, `/student/passes/[ticket]`: View active, historical, and pending gate passes, inspection of approval chain status, QR pass display for gate scanner scanning, and feedback submission.
- `/student/permissions`, `/student/permissions/new`, `/student/pass-application`, `/student/gate-pass`, `/student/leave-requests`: Request entry, exit, or residential passes.
  - *Pass Request Workflow*: Student navigates to `/student/permissions/new` -> selects pass type (e.g., Late Arrival, Early Leave, Outpass, Medical Leave) -> fills destination, reason, and departure/expected return dates -> system checks persona rules (e.g. 4/month quota for hosteller Outpass) -> submits request (`POST /passes`) -> tracks progress at `/student/request-tracking` or `/student/passes/[ticket]`.
  - For day scholars, Day Out / Early Leave / Late Arrival are auto-approved (`Self`); hosteller Outpass requires parent consent followed by hostel administration approvals (`caretaker -> deputy_warden -> hostel_manager -> principal`).

### 3. Academics & Attendance
- `/student/attendance`, `/student/attendance-calendar`: Overview of aggregate attendance, subject-by-subject percentage, and date-by-date calendar breakdown.
- `/student/assignments`, `/student/marks`, `/student/exams`: Assignment submission tracking, internal marks view, and upcoming examination schedules.
- `/student/class-requests`: Track requests related to class attendance, leaves, or session conflicts.
- `/student/library`, `/student/fees`, `/student/scholarships`: Borrowed book tracking/fines, tuition/exam fee ledger, and scholarship entitlement tracking.

### 4. Hostel & Mess (Hosteller Persona)
- `/student/mess`, `/student/mess-bill`, `/student/mess/reviews`: Daily dining menu, monthly mess billing and rebate calculations, and mess feedback reviews.
- `/student/mess/token`, `/student/mess/token/[eventId]`, `/student/mess/special`: Digital dining token redemption and registration for special feasts.
- Meal opt-out can be requested through the mess interface, creating rebate records.

### 5. Campus Community, Complaints & Safety
- `/student/complaints`, `/student/complaints/new`, `/student/complaints/[id]`: File institutional grievances (hostel maintenance, ragging, academic issues) with attachments, view real-time resolver timelines, and add cosigners.
- `/student/anti-ragging`: Specialized grievance and emergency reporting channel for campus safety.
- `/student/campus`, `/student/my-events`, `/student/achievements`, `/student/knowledge`: Campus event discovery/registration, community feed, student achievements, and resource knowledge base.
- `/student/notifications`, `/student/notifications/alerts`, `/student/notifications/announcements`: Emergency broadcast feeds, gate pass alerts, and curfew acknowledgement notices.

### 6. Profile & Security
- `/student/profile`, `/student/profile/privacy`, `/student/coordinator`: Personal student details, data consent settings, and assigned faculty counselor/coordinator contact info.
- `/student/profile-security`, `/student/profile-security/sessions`: Password changes, WebAuthn/Passkey registration, and active device session revoking.

## Key API endpoints

| Endpoint | Method(s) | What it does |
|---|---|---|
| `/passes` | GET, POST | Lists student's gate passes or submits a new gate pass request. |
| `/passes/[passId]` | GET, PUT | Retrieves pass details/QR verification payload or updates a pending pass. |
| `/passes/[passId]/action` | POST | Executes student pass lifecycle actions (e.g. pass cancellation). |
| `/student/dashboard` | GET | Fetches aggregated student overview (attendance %, active pass, alerts). |
| `/student/attendance` | GET | Returns subject-wise attendance percentages and session details. |
| `/student/attendance-calendar` | GET | Retrieves calendar-grid attendance records for date ranges. |
| `/student/attendance/dispute` | POST | Submits an attendance dispute to faculty for an erroneous mark. |
| `/student/assignments` | GET | Returns list of coursework assignments with submission deadlines. |
| `/student/marks` | GET | Retrieves midterm and internal examination scores. |
| `/student/next-exam` | GET | Fetches next scheduled examination metadata and hall ticket eligibility. |
| `/student/meal-opt-out` | GET, POST | Views meal exemption dates or files a mess-off opt-out rebate. |
| `/student/curfew-acknowledge` | POST | Acknowledges curfew check-in notices issued by hostel supervisors. |
| `/student/guardian-link` | GET, POST | Checks linked parent/guardian information or submits a guardian connection request. |
| `/emergency/sos` | GET, POST | Triggers an immediate campus SOS alert notifying security and supervisors. |
| `/complaints` | GET, POST | Lists student-submitted grievances or lodges a new complaint ticket. |

## Data flow
Upon navigating to `/student`, the dashboard performs parallel GET requests to `/api/student/dashboard`, `/api/passes`, and `/api/student/attendance/overview`. When submitting a pass, the form POSTs JSON payload to `/api/passes`; if parent consent is mandated, background notifications are queued and the pass ticket enters `PENDING_PARENT_CONSENT`. Real-time gate scan events and curfew broadcast alerts stream via server-sent events (`/api/gate/stream`) or periodic polling via `usePolling`. Authentication uses a JWT access token stored in an HttpOnly cookie alongside a Bearer token header, backed by a rotating refresh token; session integrity is validated on layout mount via `/api/auth/session`.

## Security notes
Students are strictly isolated under row-level security (Postgres RLS) to access only their own records (`auth.uid() = user_id`). A student cannot approve passes, override attendance, clear gate violations, or inspect other students' profiles or passes. Pass issuance employs fail-close validation: if `student_details.academic_status` is `DEBARRED` or `SUSPENDED`, or if monthly outpass quotas (4/month for hostellers) are exceeded, pass generation is blocked at the API layer. Day scholars are prevented from requesting hosteller-restricted overnight passes without explicit caretaker pre-clearance.
