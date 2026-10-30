# QA Test Report: Mixed-Role User Flows & Screen Audit
**Target Environment:** https://monitor.ucej.in (http://localhost:80 behind Caddy reverse proxy)  
**Date of Execution:** October 30, 2026  
**Test Harness:** Headless Browser via Playwright/CDP (`browser_exec`, session `qa-mixed`) & Direct HTTP API probes  

---

## 1. Executive Summary

A comprehensive quality assurance assessment was conducted across 7 distinct user roles covering authentication, dashboard rendering, navigation flows, API calls, console/runtime errors, and mobile viewport responsiveness (375px width).

### Summary Table

| # | Role | Credential / Identifier | Login Status | Primary Destination Route | Core Screens Tested | Render / Layout Status | Console / Runtime Errors & Issues |
|---|------|-------------------------|--------------|---------------------------|---------------------|------------------------|-----------------------------------|
| 1 | **OPERATOR** | `OPERATOR` / `operator123` | **PASS** (HTTP 200) | `/gate/{gateId}` | Gate Desk, Manual Entry, Transactions, Exceptions, Mode/Settings, Pass Verification, Profile | **PASS (Core)**<br>Mobile responsive: PASS (No horizontal scroll) | Mode/Settings (`/operator/mode`), Lookup (`/operator/lookup`), and Profile (`/operator/profile`) return 404 (handled inside `/gate/{id}`). Camera shows expected fallback when hardware is unavailable. |
| 2 | **STUDENT** | `23JJ1A0599` / `student123` | **PASS** (HTTP 200) | `/student` | Student Portal, Profile, Digital ID Card, Attendance History, Calendar, Passes, Complaints, `/mobile` | **PASS**<br>Mobile responsive: PASS | Digital ID (`/student/id`) renders barcode/student info cleanly. Standalone `/mobile` route returns 404 (mobile app runs via responsive web design at `/student`). |
| 3 | **GUARDIAN** | `GUARDIAN` / `Guardian@123` | **PASS** (HTTP 200) | `/parent` | Parent Portal Home, Child Status, Passes, Settings, `/guardian/*` aliases | **PASS**<br>Mobile responsive: PASS | Clean rendering of child status, quick access, and pass request cards. `/guardian/*` routes gracefully route/render in parent portal context. |
| 4 | **FACULTY** | `FACULTY` / `faculty123` (PIN `123456`) | **PASS** (HTTP 200 password login) | `/faculty/permissions` | Permissions Desk, Attendance Directory, My Classes, Student Directory, Kiosk PIN Login | **PASS** (Password & Role Screens)<br>**FAIL** (PIN Login endpoint) | Kiosk PIN Login (`POST /api/auth/pin-login`) returns **404 Not Found** because PIN login was deprecated and removed from the architecture (commit `56d7b04840`). Faculty password login functions normally. |
| 5 | **SYSADMIN** | `SYSADMIN` / `Sysadmin@123` | **PASS** (HTTP 200) | `/sysadmin` | Command Center, User Management (`/admin/users`), Students, Staff, Sessions, Security Stats, Deployments, DB Health | **PASS**<br>Mobile responsive: PASS | Full administrative command center rendered. Active user sessions, deployment logs, failed logins, and database telemetry all operational. |
| 6 | **PRINCIPAL** | `PRINCIPAL` / `Principal@123` | **PASS** (HTTP 200) | `/principal/permissions` | Permissions Desk, Hostels Overview, Approvals Inbox, Incidents, Delegations, Audit Log | **PARTIAL** | `/principal` root dashboard threw React runtime error #441 (digest `2488476290`) in `RoleDashboardPanel` when reading empty campus metrics. Sub-dashboards (`/principal/inbox`, `/principal/hostels/overview`, `/principal/respond/incidents`) render correctly. |
| 7 | **WARDEN** | `WARDEN` / `Warden@123` | **PASS** (HTTP 200) | `/hostel-manager` | Hostel Manager Console, Tickets, Housekeeping, Resource Management, Complaints | **PASS** (With soft panel warning) | Legacy `WARDEN` account is folded into `hostel_manager` role. Attempts by this role to access `/deputy-warden` redirect to `/hostel-manager`. Top summary widget showed "Panel failed to load" soft fallback due to missing room data, while attention queue and ticket tables rendered cleanly. |

---

## 2. Role-by-Role Detailed Findings

### 2.1 OPERATOR (`OPERATOR` / `operator123`)

- **Login Flow:** Successfully authenticated on `/login`. Received JWT containing operator claim and gate assignment ID (`5f2183c9-51ae-4677-8f38-52a17bbe0538`), immediately redirected to assigned gate desk `/gate/{gateId}`.
- **Screen Tests:**
  1. **Gate Desk (`/gate/{gateId}`):** Renders auto-detecting camera scan viewfinder, manual entry button, scan history rail, and QR/Barcode mode selector. Camera shows clean `Camera Unavailable` banner when no physical camera is attached. Mobile layout at 375px viewport rendered with zero horizontal overflow (`scrollWidth = innerWidth = 375px`).
  2. **Manual Entry (`/operator/manual-entry`):** Renders ID / Roll lookup input, voice assistant trigger ("HOLD TO SPEAK"), search button, and recent manual entry log.
  3. **Transactions / Attendance (`/operator/transactions`):** Renders "Today's Gate Transactions" scoped to the operator's gate with timestamp filters and transaction table.
  4. **Exceptions (`/operator/exceptions`):** Renders filter tabs (All, Flagged, Denied, Manual) and empty-state messaging.
  5. **Pass Verification (`/operator/pass-verification`):** Renders pass verification queue with instant search.
  6. **Mode / Settings / Profile:**
     - Navigating directly to `/operator/mode`, `/operator/lookup`, and `/operator/profile` returns the application 404 page. In the current architecture, gate mode toggles and operator lookup controls are embedded directly inside the `/gate/{gateId}` unified console.
- **Mobile Viewport:** Clean responsive flex column; floating menu button (`FloatingMenuButton`) activates drawer correctly.

---

### 2.2 STUDENT (`23JJ1A0599` / `student123`)

- **Login Flow:** Authentication succeeded; redirected directly to `/student`.
- **Screen Tests:**
  1. **Student Dashboard (`/student`):** Renders welcome banner for demo student (`Demo student`), "Today's Glance", pass status card, quick actions, and "Campus Pulse".
  2. **Student Profile (`/student/profile`):** Renders student biodata (Roll `23JJ1A0599`, CSE department, Year 4, Section A, Semester 1), contact information, and security settings.
  3. **Digital ID Card (`/student/id`):** Renders official institutional digital identity card complete with student photo placeholder, institutional badge, live barcode, roll number, validity period, and anti-tamper security patterns. Mobile view at 375px scales to 100% width cleanly.
  4. **Attendance History (`/student/history`):** Renders timeline of past movements, gate check-in/out timestamps, and reason tags.
  5. **Attendance Calendar (`/student/attendance-calendar`):** Renders monthly grid with present/absent/outpass day badges.
  6. **Student Passes (`/student/passes`):** Renders pass request history and "Apply for Outpass" actions.
  7. **Student Complaints (`/student/complaints`):** Renders grievance submission desk and tracking.
  8. **Mobile Flow Check (`/mobile`):** Navigating to `/mobile` returns 404. Mobile student usage is delivered via responsive PWA design directly at `/student`.

---

### 2.3 GUARDIAN (`GUARDIAN` / `Guardian@123`)

- **Login Flow:** Authenticated on `/login`; redirected to `/parent` (Parent Portal).
- **Screen Tests:**
  1. **Parent Portal Home (`/parent`):** Renders "Needs your attention" urgent notice queue, "Pending Tasks", "Upcoming Events", and active student movement summary.
  2. **Child Status & Activity (`/parent/child`):** Renders real-time whereabouts, current in-campus/out-of-campus status, and recent gate scan history.
  3. **Pass Approval & Requests (`/parent/passes`):** Renders pending parent consent requests for hostel leave and gate passes.
  4. **Settings (`/parent/settings`):** Profile settings, notification delivery preferences (SMS/Email/WhatsApp), and emergency contact numbers.
  5. **Legacy Route Aliases (`/guardian`, `/guardian/child-status`, `/guardian/notifications`):** Seamlessly handled by the parent layout and route guards without throwing 404s.

---

### 2.4 FACULTY (`FACULTY` / `faculty123`, PIN `123456`)

- **Password Login Flow:** Authenticated on `/login`; redirected to `/faculty/permissions`.
- **Screen Tests:**
  1. **Faculty Permissions Desk (`/faculty/permissions`):** Renders permission request queue, approval workflow buttons, and filter chips.
  2. **Faculty Attendance Directory (`/faculty/attendance`):** Renders departmental attendance statistics and faculty directory table.
  3. **My Classes (`/faculty/my-classes`):** Class schedule and assigned sections.
  4. **Student Directory (`/faculty/student-directory`):** Searchable student roster.
- **Kiosk PIN Login Path (`/api/auth/pin-login`):**
  - **API Probe:** `POST http://localhost:80/api/auth/pin-login` with payload `{"login":"FACULTY","pin":"123456"}` returns **HTTP 404 Not Found**.
  - **Root Cause Analysis:** Git history reveals commit `56d7b04840fad92e2ad39067b7848ea268ab8a38` explicitly deleted `/src/app/api/auth/pin-login/route.ts` and associated PIN login stores to eliminate shared PIN vulnerabilities and standardize on session JWTs and password-based auth. No PIN login tab exists on the `/login` screen.

---

### 2.5 SYSADMIN (`SYSADMIN` / `Sysadmin@123`)

- **Login Flow:** Authenticated on `/login`; redirected to `/sysadmin`.
- **Screen Tests:**
  1. **Sysadmin Console Home (`/sysadmin`):** Renders the master Command Center, real-time service topology, queue workers, and system alert strip.
  2. **User Management (`/admin/users`):** Renders user management grid, role filters, user status controls, and reset credentials modal.
  3. **Students Management (`/sysadmin/students`):** Renders student directory, bulk import status, lateral entry controls, and graduation de-provisioning.
  4. **Staff Management (`/sysadmin/staff`):** Office staff and departmental administrator directory.
  5. **Sessions Management (`/sysadmin/sessions`):** Real-time active user sessions list, IP tracking, and single-click session revocation controls.
  6. **Security Stats (`/sysadmin/security`):** Security posture dashboard showing 24-hour failed login counters, active concurrent sessions, and IP rate-limiting policy metrics.
  7. **Deployment Logs (`/sysadmin/deployments`):** Git commit deployment history, container build status, and health indicators.
  8. **Database Health (`/sysadmin/database-health`):** PostgreSQL connection pool status, transaction latency, and storage metrics.

---

### 2.6 PRINCIPAL (`PRINCIPAL` / `Principal@123`) & WARDEN (`WARDEN` / `Warden@123`)

- **Principal Flow:**
  - Login redirected to `/principal/permissions`.
  - **Issue Identified on `/principal` Dashboard:** Navigating to `/principal` threw client-side runtime error `Minified React error #441` (ref `2488476290`) caught by `ApproverError` boundary, originating from unhandled null values in `RoleDashboardPanel` KPI mapping when campus occupancy stats are returned as `"Data unavailable"`.
  - **Working Screens:** Sub-consoles `/principal/inbox` (Approvals Inbox), `/principal/hostels/overview`, `/principal/respond/incidents`, `/principal/delegate/rules`, and `/principal/review/audit` render cleanly with complete functionality.
- **Warden Flow:**
  - In the database schema and route policies, `WARDEN` is provisioned under the `hostel_manager` role.
  - Login redirected to `/hostel-manager`.
  - Attempts to navigate to `/deputy-warden` routes were redirected back to `/hostel-manager` by the route guard.
  - Under `/hostel-manager`, the Attention Queue, Recent Tickets, Housekeeping Tasks (`/hostel-manager/housekeeping-tasks`), and Complaints (`/hostel-manager/complaints`) render properly.
  - The top summary widget shows a soft `Panel failed to load.` fallback banner when hostel room configuration is unassigned for the user.

---

## 3. Findings & Recommendations

1. **Remove or Update Outdated Docs regarding PIN Login:**
   Documentation in `README_CREDENTIALS.md` still mentions `/login` PIN tabs and `/api/auth/pin-login`. These should be updated to clarify that PIN login was removed in favor of direct password/credential login.
2. **Fix React Runtime Error on Principal Dashboard (`/principal`):**
   In `/src/app/api/principal/dashboard/route.ts` and `/src/components/approver/RoleDashboardPanel.tsx`, ensure `campusOccupancy` string values or nulls do not trigger React child rendering exceptions.
3. **Handle `/operator/mode` and `/operator/profile` Route Redirects:**
   Since gate mode switching is now handled inside `/gate/{id}`, add redirects in `next.config.mjs` from `/operator/mode` to `/gate/main?tab=scandesk` to avoid 404s from stale bookmarks or links in `OperatorDrawer`.
