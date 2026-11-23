# JNTUH CEJ Gate Monitor — Role Architecture & Global Reference

This document is the master reference for all 24 active roles in the JNTUH CEJ Gate Monitor stack.
Each role doc is a comprehensive operational research document covering:
- What the role IS in real institutional life at JNTUH CEJ
- Operational standards and best practices from real university admin systems
- Accountability and escalation chains
- What we HAVE in the app currently
- What is MISSING and should be added
- Implementation notes for the dashboard/agent
- What the agent should know to act as this role

## Role Taxonomy (24 Roles)

### Tier 1: Students & Primary Constituents
- [student.md](./student.md) — Enrolled student, two personas: day scholar and hosteller
- [parent.md](./parent.md) — Parent portal — academic progress, fee alerts, gate-pass acknowledgements
- [guardian.md](./guardian.md) — Local guardian portal — curfew compliance, visitor scheduling
- [visitor.md](./visitor.md) — Guest pass self-service — QR access, check-in/out, overstay

### Tier 2: Academic & Departmental
- [faculty.md](./faculty.md) — Teaching faculty — marks, assignments, mentees, leave
- [hod.md](./hod.md) — Head of Department — department-scoped operations
- [dean.md](./dean.md) — Dean — academic governance, compliance, cross-department
- [vice_principal.md](./vice_principal.md) — Vice-Principal — exam office, OIE duties, academic exceptions
- [principal.md](./principal.md) — Principal — full campus authority, all approver workflows

### Tier 3: Exam Office
- [exam_superintendent.md](./exam_superintendent.md) — Chief Superintendent — exam-day command, candidate attendance
- [exam_branch.md](./exam_branch.md) — Exam Branch office — planning, hall tickets, result processing
- [oie.md](./oie.md) — OIE — exam queue triage, access intake, candidate attendance

### Tier 4: Hostel & Residential
- [hostel_manager.md](./hostel_manager.md) — Hostel Manager — room allotment, mess facilities, supervises Deputy Wardens
- [deputy_warden.md](./deputy_warden.md) — Deputy Warden — block-level curfew, night attendance, incidents
- [caretaker.md](./caretaker.md) — Caretaker — facilities maintenance, student grievances
- [chief_warden.md](./chief_warden.md) — Chief Warden — disciplinary escalation, DEBARRED (Principal-only)
- [mess_incharge.md](./mess_incharge.md) — Mess In-charge — menu, tokens, inventory, vendor compliance

### Tier 5: Security & Operations
- [operator.md](./operator.md) — Gate desk operator — scan, lookup, transactions, device health
- [supervisor.md](./supervisor.md) — Security supervisor — exceptions, watchlist, overstay, all-gate view
- [worker.md](./worker.md) — Maintenance worker — task assignment, shift scheduling, handover
- [staff.md](./staff.md) — General staff — shifts, gate status, occupancy, maintenance tickets

### Tier 6: Administrative & Infrastructure
- [admin.md](./admin.md) — Operational admin — user governance, gate config, lockdown, alerts
- [sysadmin.md](./sysadmin.md) — System administrator — MFA, backup, RLS audit, break-glass
- [emo.md](./emo.md) — Estate Maintenance Officer — campus infrastructure, vendor SLAs

## Shared Architecture

### Authentication
All roles authenticate via the unified auth middleware. Role is resolved from the user's primary role + any active delegations.

### RBAC Enforcement
- API routes: every route declares requiredRole (enforced by withAuthorization)
- UI pages: wrapped in AuthGuard with allowedRoles
- Postgres RLS: gate_app sees only rows its policies allow
- Tiers: APPROVER, OPERATOR, ADMIN, SYSADMIN, MESS_INCHARGE, APP

### Separation of Duties (SoD)
- No single role can both enter and publish a result
- DEBARRED requires two-person approval (HOD + Dean/Principal)
- Lockdown requires two-person approval (Admin + Principal)
- Break-glass requires two-person approval (SysAdmin + Principal)

### Delegation
Delegation is time-boxed and recorded in audit_events. A delegation's role grant is additive to the native role. Delegation IDs are recorded in the audit trail.

### Academic Status
student_details.academic_status ∈ {SUSPENDED, DEBARRED, LATERAL_JOIN} + year_override.
HOD flags park in pending_approvals; Dean/Principal/VP approve.

## Doc Conventions
Each role doc follows this structure:
1. Role in institutional life
2. Operational standards (with research sources)
3. Accountability and escalation
4. What we have in the app (pages, APIs, data flow)
5. What is missing (numbered list)
6. Implementation notes for dashboard/agent
7. Agent persona (what the agent should know to act as this role)

## Research Sources
- JNTUH CEJ hostel staff page (jntuhcej.ac.in)
- JNTUH examination branch (jntuh.ac.in)
- NIT Hamirpur security SOP
- TMU Mess Policy
- Indian university visitor management best practices
- UGC / AICTE / NBA compliance standards
