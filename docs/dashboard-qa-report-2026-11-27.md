# Dashboard QA Report — monitor.ucej.in

**Date:** 2026-11-27
**Tester:** Hermes Agent (browser automation)
**Target:** https://monitor.ucej.in (live)

## Method

Browser-driven login tests against the live app. Each account logged in with the provided credentials and the rendered console was captured: route, headings, nav, theme attributes, and visible content.

**Note on session handling:** The app uses sticky HttpOnly session cookies that survive `/api/auth/logout` and `document.cookie` clearing. A fresh browser session (new tab) was required to reset between accounts. Earlier "failures" for FACULTY/STAFF/OPERATOR were initially caused by session hijacking from WORKER/PARENT; re-testing in a clean session confirmed they are genuine credential rejections.

## Results

### 1. Admin ✅
- **Identifier:** `ADMIN`
- **Landed on:** `/admin/overview`
- **Headings:** Campus administration overview, Operational Metrics, Modules, Secondary
- **Nav:** Campus Dashboard, Alerts & Radar, Gates, Scan Exceptions, Analytics Dashboard, Reports, Sustainability, Sessions, Student Roster, Bulk Import, Alumni, Faculty Directory, Staff Directory, Workers, Attendance Overview, Bulk Attendance, Users & Roles, Parents & Guardians, Permission Policies, Roles & Hierarchy, Occupancy & Twin, Device Configuration, Visitors, Gate Passes, Institutional Cases, Emergency Lockdown, Audit Logs, Institutional Config, Workflow Configuration, Knowledge Base
- **Verdict:** Pass — full admin console rendered.

### 2. Supervisor ✅
- **Identifier:** `SUPERVISOR`
- **Landed on:** `/supervisor`
- **Heading:** Shift Console (SUPERVISORY DESK)
- **Nav:** Approvals, Today, Shift, Team, Gates, Response, Oversight, Account, Account settings
- **Content:** 34 open escalations, 12 pending decisions (HP-2026-1057 through HP-2026-1066), Live Gates, 1806 active campus alerts
- **Verdict:** Pass.

### 3. Student · Male · Day-Scholar ✅
- **Identifier:** `20JJ1A0211` (CHALLAGUNDLA KARTHIK KUMAR)
- **Landed on:** `/student`
- **Dashboard:** "DAY SCHOLAR DASHBOARD"
- **Theme:** Graphite (no sakuga VFX for male students)
- **Content:** No pending actions, mode tabs (Today / Academics / Hostel & Mess / Monthly Growth)
- **Verdict:** Pass.

### 4. Student · Female · Hosteller ⚠️
- **Identifier:** `20JJ1A0243` (PORANDLA RAVALIKA)
- **Landed on:** `/student`
- **Dashboard:** "DAY SCHOLAR DASHBOARD" — **expected "Hosteller Dashboard"**
- **Theme:** `n/a` (no `data-theme` on `<html>`), `sakuga: False` — **expected sakuga theme + SakugaControls**
- **Content:** Curfew Window (06:00–21:30), Attendance 82%, "Hostel & Mess" tab present
- **Verdict:** **Fail / Anomaly**
  1. Dashboard title says "DAY SCHOLAR DASHBOARD" for a hosteller (Block B · B-204)
  2. No sakuga theme applied to female hosteller
  3. Hostel data present but categorization and theme wrong

### 5. Principal ✅
- **Identifier:** `PRINCIPAL`
- **Landed on:** `/principal/approvals`
- **Heading:** Oversight Console — INSTITUTIONAL APPROVALS REGISTER
- **Nav:** Approvals, Today, Pending, Escalated, Overdue, Delegated, Examinations, Profile, Account settings
- **Content:** Pending Decisions (0), highest-level authority for campus leaves/institutional permissions/security overrides
- **Verdict:** Pass.

### 6. Vice Principal ✅
- **Identifier:** `VICE_PRINCIPAL`
- **Landed on:** `/vice-principal`
- **Heading:** Oversight Console — EXECUTIVE APPROVALS DESK
- **Nav:** Approvals, Today, Queue, Escalated, All open, Examinations, Profile, Account settings
- **Verdict:** Pass.

### 7. HOD ✅
- **Identifier:** `HOD`
- **Landed on:** `/hod`
- **Heading:** Department Console — PENDING APPROVALS
- **Nav:** Approvals, Today, Queue, Escalated, Students, Classes, Reports, Profile, Account settings
- **Content:** Needs Your Action (11)
- **Verdict:** Pass.

### 8. OIE ✅
- **Identifier:** `OIE`
- **Landed on:** `/oie`
- **Heading:** Exam Console — EXAM CELL OVERVIEW
- **Nav:** Exam Day Overview, Exam queue, Exam operations, Records
- **Verdict:** Pass.

### 9. Faculty ❌
- **Identifier:** `FACULTY`
- **Result:** Bounced to `/login` with "Invalid username or password"
- **Verdict:** **Fail — account not seeded or credentials incorrect**

### 10. Staff ❌
- **Identifier:** `STAFF`
- **Result:** Bounced to `/login` with "Invalid username or password"
- **Verdict:** **Fail — account not seeded or credentials incorrect**

### 11. Deputy Warden ✅
- **Identifier:** `DEPUTY_WARDEN`
- **Landed on:** `/deputy-warden`
- **Heading:** Hostel Ops — HOSTEL OUTPASS DECISION
- **Nav:** Outpass queue, Today, Approvals, Queue, Leave requests, Delegated, Overview, Gate movement, Curfew, Incidents, Handover, Decision history, Complaints
- **Verdict:** Pass.

### 12. Hostel Manager ✅
- **Identifier:** `HOSTEL_MANAGER`
- **Landed on:** `/hostel-manager`
- **Heading:** Residence Console — RESIDENT TICKET INBOX
- **Nav:** Resident tickets, Today, Tickets, Queue, Complaints, Housekeeping, Resources, Maintenance, All residents, Rooms, Allocation
- **Content:** Pending Decisions (12)
- **Verdict:** Pass.

### 13. Mess Incharge ✅
- **Identifier:** `MESS_INCHARGE`
- **Landed on:** `/mess`
- **Heading:** Mess Console — MESS OPERATIONS OVERVIEW
- **Nav:** Today, Meals, Inventory, Operations
- **Content:** 0 meals confirmed served
- **Verdict:** Pass.

### 14. Caretaker ✅
- **Identifier:** `CARETAKER`
- **Landed on:** `/hostel/permissions`
- **Heading:** CARETAKER CONSOLE — Hostel Approver
- **Nav:** Complaints, Today, Maintenance, Workers
- **Verdict:** Pass.

### 15. Supervisor ✅ (already covered in #2)

### 16. Operator ❌
- **Identifier:** `OPERATOR`
- **Result:** Bounced to `/login` with "Invalid username or password"
- **Verdict:** **Fail — account not seeded or credentials incorrect**

### 17. Parent ✅
- **Identifier:** `PARENT`
- **Landed on:** `/guardian`
- **Heading:** Parent & Guardian Portal — Linked Student Overview
- **Nav:** Home, Ward Monitoring, Passes & Consent, Visit Schedule, Contact Info, Notifications
- **Content:** "Signed in as parent · parent Account — submission only"
- **Verdict:** Pass.

### 18. Guardian ❌
- **Identifier:** `GUARDIAN`
- **Result:** Bounced to `/login` with "Invalid username or password"
- **Verdict:** **Fail — account not seeded or credentials incorrect**

### 19. Visitor ⚠️
- **Identifier:** `VISITOR`
- **Result:** Bounced to `/login` with "Account is DISABLED. Please contact an administrator."
- **Verdict:** **Fail — account exists but is disabled**

### 20. Worker ✅
- **Identifier:** `WORKER`
- **Landed on:** `/worker`
- **Heading:** Worker Console — OPERATOR SHIFT & TASKS
- **Nav:** Today, Work, Records, Profile, Account settings
- **Content:** Active Shift, Clock IN/OUT, My Assignment & In/Out Logs
- **Verdict:** Pass.

### 21. SysAdmin ✅
- **Identifier:** `jadiakarshjadi1010@gmail.com`
- **Landed on:** `/sysadmin`
- **Heading:** Command Center
- **Nav:** Health, Alerts, Safety, Runbooks, Alert Rules, People, Students, Staff, Parents
- **Content:** 1570 People, Service topology
- **Verdict:** Pass.

## Summary

| # | Role | Identifier | Console | Verdict |
|---|------|------------|---------|---------|
| 1 | Admin | ADMIN | Admin Console | ✅ |
| 2 | Supervisor | SUPERVISOR | Shift Console | ✅ |
| 3 | Student M | 20JJ1A0211 | Day-Scholar Dashboard | ✅ |
| 4 | Student F | 20JJ1A0243 | Day-Scholar (wrong, sakuga missing) | ❌ |
| 5 | Principal | PRINCIPAL | Oversight Console | ✅ |
| 6 | Vice Principal | VICE_PRINCIPAL | Oversight Console | ✅ |
| 7 | HOD | HOD | Department Console | ✅ |
| 8 | OIE | OIE | Exam Console | ✅ |
| 9 | Faculty | FACULTY | — | ❌ (bad creds) |
| 10 | Staff | STAFF | — | ❌ (bad creds) |
| 11 | Deputy Warden | DEPUTY_WARDEN | Hostel Ops | ✅ |
| 12 | Hostel Manager | HOSTEL_MANAGER | Residence Console | ✅ |
| 13 | Mess Incharge | MESS_INCHARGE | Mess Console | ✅ |
| 14 | Caretaker | CARETAKER | Caretaker Console | ✅ |
| 16 | Operator | OPERATOR | — | ❌ (bad creds) |
| 17 | Parent | PARENT | Guardian Portal | ✅ |
| 18 | Guardian | GUARDIAN | — | ❌ (bad creds) |
| 19 | Visitor | VISITOR | — | ⚠️ (disabled) |
| 20 | Worker | WORKER | Worker Console | ✅ |
| 21 | SysAdmin | jadiakarshjadi1010@gmail.com | Command Center | ✅ |

## Findings

### Blockers
1. **Dashboard #4 (female hosteller mis-categorized as day scholar)** — routing/theme bug on student home
2. **FACULTY, STAFF, OPERATOR, GUARDIAN** — credentials rejected ("Invalid username or password")
3. **VISITOR** — account exists but is disabled

### Pass
14 of 21 accounts logged in successfully and rendered their expected console.
