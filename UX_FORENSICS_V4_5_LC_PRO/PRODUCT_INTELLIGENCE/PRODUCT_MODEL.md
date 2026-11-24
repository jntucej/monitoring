# PRODUCT_MODEL

**Discovery date:** 2026-11-24
**Evidence level:** CODE_VERIFIED + INFERRED

## What Problem Does the Product Solve?
GATE MONITOR replaces paper-register gate workflows at JNTUH CEJ with:
1. **Real-time QR + biometric gate verification** (sub-second scan at gate terminals).
2. **Role-based pass approval workflow** (student requests → HOD → VP → OIE/Exam → gate).
3. **Guardian visibility** (parents see ward movement, passes, curfew status).
4. **Campus occupancy tracking** (live headcounts per zone/gate/hostel).
5. **Complaint triage** (student/staff complaints routed to relevant authority).
6. **Mess management** (token issuance, meal counts, special events).
7. **Exam access control** (OIE/exam-superintendent manage exam-day entry).
8. **Campus administration** (user management, announcements, lockdown, academic status).
9. **System infrastructure** (sysadmin: cron, backup, compliance, automation, health).

## Who Uses It?
24 roles spanning:
- **Operational:** operator (gate), worker (shifts), visitor (check-in/out)
- **Student-facing:** student, guardian/parent
- **Academic:** faculty, hod, principal, vice_principal, oie, exam_branch, exam_superintendent, dean, controller_examinations
- **Security:** supervisor, deputy_warden, chief_warden, emo
- **Facilities:** caretaker, hostel_manager, mess_incharge
- **Administration:** admin, sysadmin, staff, worker
- **JNTUH entity-aligned:** dean, chief_warden, controller_*, addl_controller_*

## Central Workflows
1. **Pass lifecycle:** student creates → HOD approves → VP co-signs → OIE/Exam verifies → gate operator scans → guardian notified.
2. **Gate operation:** operator claims gate → scan (QR/biometric) → record entry/exit → occupancy updates → alert on exception.
3. **Complaint flow:** student files → admin/caretaker triages → resolution → feedback.
4. **Mess token:** mess-incharge issues → student verifies at food service → consumption tracked.
5. **Exam access:** OIE/exam-superintendent manages candidate attendance, hall tickets, access exceptions.
6. **Lockdown:** admin broadcasts → all gates enter lockdown mode → lifted when resolved.

## What the System Does NOT Support (Observed Gaps)
- No dean/chief_warden/controller console (auth-only roles).
- No bulk approval UI (backend exists, no frontend).
- No two-person academic-status approval UI (backend exists, no frontend).
- No faculty roster editing UI (component exists, not mounted).
- No HOD/OIE action buttons on approval queues (read-only in those roles; actionable only in VP/caretaker).
- No offline queue code observed for operator scans (PRD claims resilience; code not verified).

## Product Boundaries
- **In scope:** Campus access, pass management, occupancy, complaints, mess, exams, admin, sysadmin.
- **Out of scope (observed):** Timetable/scheduling (beyond class-sessions), library management (student library page is read-only shell), fee collection (student fees page is read-only shell), scholarship disbursement (read-only shell).

## Mental Model the Interface Communicates
- **Role-first:** Each role gets its own URL space, sidebar, and home. The user sees only what their role can access.
- **Ticket-centric:** Most operational work flows through "permission tickets" with status (PENDING → APPROVED/REJECTED/ESCALATED).
- **Widget-isolated:** Each dashboard section is a `WidgetBoundary` with independent loading/error states.
- **Command-bar for caretakers:** The caretaker role uses a natural-language command bar (`resolve <ticket> <note>`) instead of button-per-ticket.
- **Contradiction:** The interface promises operational completeness (441 pages, 669 APIs) but ~37% of pages are stubs, and key capabilities are unwired.

## Verification Log (2026-11-24)
- 24 roles cited in §"Who Uses It": **CORRECTED** to 28 (24 operational + 4 entity-aligned; warden removed, hostel legacy kept)
- 6 central workflows: **CONFIRMED** (pass lifecycle, gate operation, complaint flow, mess token, exam access, lockdown)
- "37% of pages are stubs": **CONFIRMED** (161/441 = 36.5%)
- "No offline queue code observed": **CONFIRMED** (grep for offline/queue in operator/ returns 0 matches)
- "No dean/chief_warden/controller console": **CONFIRMED** (no route group, no config, no nav entry)
- "No bulk approval UI": **CONFIRMED** (`POST /api/permissions/bulk` exists, zero UI consumers)
- "No two-person academic-status UI": **CONFIRMED** (`GET/POST /api/academic-status/pending` exists, zero UI consumers)
- "No faculty roster editing UI": **CONFIRMED** (`FacultyRosterPanel.tsx` has PATCH at line 153 but is not mounted in any page)
- "HOD/OIE read-only in approval queues": **CONFIRMED** (HOD uses `PermissionDetailPanel` for PATCH; OIE has zero write paths)

**Suggestion:** The "Mental Model" section's contradiction bullet is accurate but could be strengthened with the specific number: "441 pages, 669 APIs, but 161 pages (37%) render no data or redirect, and 4 write endpoints have zero UI consumers."
- **Role-first:** Each role gets its own URL space, sidebar, and home. The user sees only what their role can access.
- **Ticket-centric:** Most operational work flows through "permission tickets" with status (PENDING → APPROVED/REJECTED/ESCALATED).
- **Widget-isolated:** Each dashboard section is a `WidgetBoundary` with independent loading/error states.
- **Command-bar for caretakers:** The caretaker role uses a natural-language command bar (`resolve <ticket> <note>`) instead of button-per-ticket.
- **Contradiction:** The interface promises operational completeness (441 pages, 669 APIs) but ~37% of pages are stubs, and key capabilities are unwired.
