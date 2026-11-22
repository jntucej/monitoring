# Desktop Deep-Interaction QA Report
- **Target:** https://monitor.ucej.in
- **Viewport:** 1440x900
- **Timestamp:** 2026-10-31T14:12:40.618Z
- **Total Roles Tested:** 7
- **Passed:** 6
- **Failed:** 1

## Per-Role Summary Table

| Role | Status | Leaves Tested | Skipped (>8) | API Failures | Error Boundaries | Stuck Loaders | Dashboard Sane | Bell | Modal |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **student** | ✅ PASS | 7 | 8 | 0 | 0 | 0 | ✅ Yes | ✅ Open | ✅ Open |
| **parent** | ✅ PASS | 7 | 2 | 1 | 0 | 0 | ✅ Yes | ✅ Open | — |
| **oie** | ✅ PASS | 7 | 5 | 1 | 0 | 0 | ✅ Yes | ✅ Open | — |
| **staff** | ✅ PASS | 7 | 0 | 0 | 0 | 0 | ✅ Yes | — | — |
| **operator** | ✅ PASS | 6 | 0 | 0 | 0 | 0 | ✅ Yes | — | — |
| **supervisor** | ❌ FAIL | 7 | 9 | 1 | 2 | 0 | ✅ Yes | ✅ Open | — |
| **mess_incharge** | ✅ PASS | 7 | 5 | 3 | 0 | 0 | ✅ Yes | ✅ Open | — |

## Detailed Role Findings

### Role: `student`
- **Status:** PASS
- **Landed Root URL:** https://monitor.ucej.in/student
- **Leaves Tested (7):** `/student`, `/student/passes`, `/student/permissions`, `/student/permissions/new`, `/student/profile`, `/student/history`, `/student/notifications`
- **Leaves Skipped (>8 limit, 8):** `/student/request-tracking`, `/student/id`, `/student/mess/token`, `/student/mess/reviews`, `/student/mess/special`, `/student/mess-bill`, `/student/complaints`, `/student/anti-ragging`
- **Dashboard Sane:** Yes
- **Dashboard Assessment:** Student console displays Digital ID, curfew compliance, active passes, and token quick actions.
- **Notification Bell:** Bell dropdown opened and rendered notifications/filters
- **Modal/Drawer:** Opened modal/drawer via 'Add goal', closed safely
- **API Failures:** None (All endpoints clean)
- **Error Boundaries:** None
- **Stuck Loaders:** None

### Role: `parent`
- **Status:** PASS
- **Landed Root URL:** https://monitor.ucej.in/parent
- **Leaves Tested (7):** `/parent`, `/parent/child-attendance`, `/parent/passes`, `/parent/settings`, `/parent/child`, `/parent/child-requests`, `/parent/child-movement`
- **Leaves Skipped (>8 limit, 2):** `/parent/pass-leave-submission`, `/parent/contact-info`
- **Dashboard Sane:** Yes
- **Dashboard Assessment:** Parent console displays guardian dashboard with child status, open requests, and campus activity.
- **Notification Bell:** Bell dropdown opened and rendered notifications/filters
- **Modal/Drawer:** No safe modal/drawer trigger found on page
- **API Failures (1):**
  - `429 /api/campus-extra/calendar?month=2026-10`
- **Error Boundaries:** None
- **Stuck Loaders:** None

### Role: `oie`
- **Status:** PASS
- **Landed Root URL:** https://monitor.ucej.in/oie
- **Leaves Tested (7):** `/oie`, `/oie/queue`, `/oie/queue/pending`, `/oie/queue/escalated`, `/oie/queue/history`, `/oie/candidate-attendance`, `/oie/records`
- **Leaves Skipped (>8 limit, 5):** `/oie/examination-day-access`, `/oie/access-exceptions`, `/oie/exam-branch-coordination`, `/oie/decision-history`, `/oie/examination-reports`
- **Dashboard Sane:** Yes
- **Dashboard Assessment:** OIE console displays exam management queue, student records, and exam clearances.
- **Notification Bell:** Bell dropdown opened and rendered notifications/filters
- **Modal/Drawer:** No safe modal/drawer trigger found on page
- **API Failures (1):**
  - `429 /api/campus-extra/calendar?month=2026-10`
- **Error Boundaries:** None
- **Stuck Loaders:** None

### Role: `staff`
- **Status:** PASS
- **Landed Root URL:** https://monitor.ucej.in/admin/overview
- **Leaves Tested (7):** `/staff`, `/staff/my-day`, `/staff/duties`, `/staff/assigned-tasks`, `/admin/profile/personal`, `/admin/profile/security`, `/admin/profile/appearance`
- **Dashboard Sane:** Yes
- **Dashboard Assessment:** Staff console displays daily duty schedule, assigned tasks, and personal shift status.
- **Notification Bell:** Bell button not found in desktop shell
- **Modal/Drawer:** No safe modal/drawer trigger found on page
- **API Failures:** None (All endpoints clean)
- **Error Boundaries:** None
- **Stuck Loaders:** None

### Role: `operator`
- **Status:** PASS
- **Landed Root URL:** https://monitor.ucej.in/gate/5f2183c9-51ae-4677-8f38-52a17bbe0538
- **Leaves Tested (6):** `/operator`, `/operator/transactions`, `/operator/stats`, `/gate/main`, `/operator/manual-entry`, `/operator/pass-verification`
- **Dashboard Sane:** Yes
- **Dashboard Assessment:** Operator console displays gate operations/desk scanner and transaction history with live status.
- **Notification Bell:** Bell button not found in desktop shell
- **Modal/Drawer:** No safe modal/drawer trigger found on page
- **API Failures:** None (All endpoints clean)
- **Error Boundaries:** None
- **Stuck Loaders:** None

### Role: `supervisor`
- **Status:** FAIL
- **Landed Root URL:** https://monitor.ucej.in/supervisor
- **Leaves Tested (7):** `/supervisor`, `/supervisor/approvals`, `/supervisor/gates/live`, `/supervisor/gates/activity`, `/supervisor/gates/wall`, `/supervisor/profile`, `/supervisor/response/escalations`
- **Leaves Skipped (>8 limit, 9):** `/supervisor/shift/live`, `/supervisor/team/workers`, `/supervisor/reports`, `/supervisor/shift/handover`, `/supervisor/shift/history`, `/supervisor/team/shifts`, `/supervisor/team/curfew`, `/supervisor/response/incidents`, `/supervisor/response/exceptions`
- **Dashboard Sane:** Yes
- **Dashboard Assessment:** Supervisor console displays shift gate monitoring, guard escalations, and approvals.
- **Notification Bell:** Defect: Bell at z-20 intercepted by sticky header. Opened after DOM click fallback.
- **Modal/Drawer:** No safe modal/drawer trigger found on page
- **API Failures (1):**
  - `404 /api/dev/contact`
- **Error Boundaries (2):**
  - ❌ `/supervisor/approvals: Something went wrong`
  - ❌ `/supervisor/response/escalations: Something went wrong`
- **Stuck Loaders:** None

### Role: `mess_incharge`
- **Status:** PASS
- **Landed Root URL:** https://monitor.ucej.in/mess
- **Leaves Tested (7):** `/mess`, `/mess/meal-attendance`, `/mess/menu-management`, `/mess/daily-meal-counts`, `/mess/consumption-reports`, `/mess/inventory-stock`, `/mess/special-events`
- **Leaves Skipped (>8 limit, 5):** `/mess/reviews`, `/mess/mess-issues`, `/mess/operational-requests`, `/mess/verify-token`, `/mess/scan`
- **Dashboard Sane:** Yes
- **Dashboard Assessment:** Mess Incharge console displays meal counters, tokens, and mess operational metrics.
- **Notification Bell:** Bell dropdown opened and rendered notifications/filters
- **Modal/Drawer:** No safe modal/drawer trigger found on page
- **API Failures (3):**
  - `429 /api/campus-extra/calendar?month=2026-10`
  - `404 /api/mess/attendance`
  - `404 /api/mess/meal-counts`
- **Error Boundaries:** None
- **Stuck Loaders:** None
