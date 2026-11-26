# JNTUH CEJ Gate Monitor — Role Architecture & Global Reference

This document serves as the comprehensive master reference for the 28 active roles in the JNTUH CEJ Gate Monitor stack. It outlines the role taxonomy across operational tiers, the shared authentication model, server-side RBAC enforcement architecture, and links to role-specific documentation.

---

## 1. System Role Taxonomy (28 Roles)

The platform governs 28 distinct roles across six functional tiers:

### Tier 1: Students & Primary Constituents
- [`student`](./student.md): Student persona — gate pass requests, attendance tracking, mess bills, fee dues, library account, marks view, and incident reporting.
- [`parent`](./parent.md): Parent portal — student academic progress, attendance %, leave acknowledgments for gate pass chains, and fee due alerts.
- [`guardian`](./guardian.md): Local guardian portal — curfew compliance acknowledgments, visitor scheduling, and student support.
- [`visitor`](./visitor.md): Guest pass self-service — campus visit registrations, temporary QR access, check-in, and check-out tracking.

### Tier 2: Faculty & Staff Operations
- [`faculty`](./faculty.md): Academic mentors and instructors — class attendance entry, internal marks drafting and submission, and student mentoring.
- [`staff`](./staff.md): Non-teaching institutional staff — shift schedules, handover management, and maintenance ticket tracking.
- [`worker`](./worker.md): Campus support personnel — facility tasks, maintenance tickets, and designated gate ingress/egress.

### Tier 3: Departmental & Academic Approvers
- [`hod`](./hod.md): Head of Department (EEE, ME, ECE, CSE, IT, Science/HSS) — department-scoped roster oversight, academic status flags (two-person approval), and faculty allocations.
- [`dean`](./dean.md): Associate Dean (Academics / Student Affairs) — institutional academic policy, accreditation files, student welfare, and debarment reviews.

### Tier 4: Examination Branch (Split Desks)
- [`controller_examinations`](#): Controller of Examinations — overall examination conduct, result sign-off, and policy governance. *(DB-only role; acts through the exam subsystem, no dedicated console — see `exam_superintendent.md` for the exam-side workflow.)*
- [`addl_controller_academic`](#): Additional Controller (Academic) — admission verifications, malpractice reviews, and late mark correction authorization. *(DB-only role; no dedicated console.)*
- [`addl_controller_results`](#): Additional Controller (Result Processing) — barcoded mark sheet scanning and results compilation (cannot modify marks). *(DB-only role; no dedicated console.)*
- [`addl_controller_automation`](#): Additional Controller (Automation) — student rosters, CBT administration, hall tickets, nominal rolls, and question paper encryption. *(DB-only role; no dedicated console.)*
- [`exam_superintendent`](./exam_superintendent.md): Chief Superintendent (operational exam-day role) — examination day access, candidate attendance, and spot exceptions.
- [`oie`](./oie.md): Officer In-Charge of Examinations — exam office queue triage, attendance reconciliation, and candidate exception intake.
- [`exam_branch`](./exam_branch.md): Legacy exam branch coordination role (maintained for backward compatibility).

### Tier 5: Campus, Hostel, Mess & Security Operations
- [`principal`](./principal.md): Administrative head of institution — full campus dashboard, institution-wide approvals, lockdown authorization, and Chief Superintendent of exams.
- [`vice_principal`](./vice_principal.md): Deputy executive authority — academic exception escalations, OIE oversight, and delegated Principal functions.
- [`chief_warden`](./chief_warden.md): Chief Warden of Hostels — **role context** assigned to the Principal user account; logs hostel discipline and administrative actions under a separate audit context.
- [`hostel_manager`](./hostel_manager.md): Hostel Manager (faculty in-charge) — room allocations, block occupancy, maintenance supervision, and hostel resource tracking.
- [`deputy_warden`](./deputy_warden.md): Block-level hostel wardens (2 boys + 2 girls blocks) — night attendance reconciliation, curfew breaches, and hostel leave approvals.
- [`mess_incharge`](./mess_incharge.md): Mess In-Charge — meal token verification, menu scheduling, inventory vs. consumption reconciliation, and mess rebate ledger.
- [`caretaker`](./caretaker.md): Hostel block caretaker — housekeeping inspection, asset verification, and maintenance resolution.
- [`operator`](./operator.md): Gate desk operator — turnstile/gate scanning, manual entry, visitor check-in, pass verification, and shift handover.
- [`supervisor`](./supervisor.md): Gate security supervisor — live perimeter monitoring, watchlist enforcement, overstay alarms, and exception overrides.
- [`emo`](./emo.md): Estate Maintenance Officer — campus utilities, electrical/infrastructure work orders, and emergency access requests.

### Tier 6: Supervisory & Server Governance
- [`admin`](./admin.md): Operational platform administration — user management, role delegation, attendance sync, mess finalization, emergency lockdown, and SMS dispatch.
- [`sysadmin`](./sysadmin.md): Server & system manager — Docker container services, database health, RLS drift, disaster recovery drills, autonomous bots, and **exclusive visibility of internal UUIDs**.

---

## 2. Shared Authentication Model

The JNTUH CEJ Gate Monitor implements a hardened, multi-tier authentication lifecycle:

1. **Token Structure & Delivery:**
   - **Access Token:** Short-lived JWT containing identity claims (`userId`, `role`, `roles`, `email`, `dh`). Transported via HttpOnly `access_token` cookie or `Authorization: Bearer ***` header.
   - **Refresh Token:** Long-lived rotating refresh token stored in an HttpOnly cookie and tracked in `public.sessions`. Token reuse detection automatically revokes all user sessions.
   - **Device Binding (`dh` claim):** The access token embeds `dh` (SHA-256 hash of the client's `device_id` cookie). On every request, `checkDeviceBinding` validates this match. Any mismatch terminates all active sessions for that user.
2. **Revalidation (`/api/auth/session`):**
   - Client applications revalidate session freshness against `/api/auth/session`, which verifies token signatures, checks `public.users.status` (`'ACTIVE'`), and enforces mandatory password rotation (`password_must_change`).
3. **Privileged Roles & Multi-Factor Authentication (MFA):**
   - Roles in `PRIVILEGED_ROLES` (`admin`, `sysadmin`) are subject to mandatory MFA challenges during login.
   - Secondary factor authentication accepts WebAuthn/FIDO2 Passkeys (`/api/auth/passkeys`) or TOTP authenticator tokens (`/api/auth/mfa/totp`).
   - Every privileged login triggers an immediate alert (`sendPrivilegedLoginAlert`) via Telegram/webhook.

---

## 3. RBAC Enforcement Points

Access controls are enforced at both the client shell and API boundary:

```
[ HTTP Request ]
       │
       ▼
┌────────────────────────────────────────────────────────┐
│ Edge Middleware (src/middleware.ts)                   │
│ - Path sanitization & static resource bypass          │
│ - Basic route protection & session existence check    │
└────────────────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────────────────┐
│ API Wrapper: withApiChain + withAuthorization         │
│ (src/lib/api-chain.ts, src/middleware/authorization.ts)│
│ 1. Bearer / HttpOnly token extraction                 │
│ 2. Device binding verification (dh claim check)       │
│ 3. Account active & password change verification      │
│ 4. Role check: auth.role ∈ requiredRole                │
│    └─ Delegation fallback (public.delegations)        │
│ 5. Rate limit (Redis Lua EVALSHA) + Zod validateBody  │
│ 6. HMAC signing of trusted headers                    │
│    (x-user-id, x-user-role, x-mw-signature)          │
└────────────────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────────────────┐
│ Client UI Guard: <AuthGuard allowedRoles={...}>        │
│ - Validates user state against allowed role array     │
│ - Bounces unauthenticated sessions to /login          │
│ - Evaluates isSuperAdmin(role) for UUID visibility    │
└────────────────────────────────────────────────────────┘
```

### Key Differences Between Supervisory Roles:
- **`admin`**: Owns **operational governance** (people, passes, attendance, SMS, mess, campus lockdown). Cannot access internal server diagnostics. Internal database identifiers (UUIDs) are masked/redacted.
- **`sysadmin`**: The **server manager**. Owns platform infrastructure (deployments, database health, RLS drift, chaos drills, worker queues). Evaluates to `true` for `isSuperAdmin(role)` and is the **only role authorized to view internal UUIDs**.

---

## 4. Documentation Index

Detailed role manuals (one file per role that has a UI surface; roles with no
dedicated pages — `controller_examinations`, `addl_controller_academic`,
`addl_controller_results`, `addl_controller_automation` — are DB-only roles
that act through the shared exam/approval subsystem and have no console of
their own, so they are not separate files):

**Customization & personalization**
- [`customization.md`](./customization.md) — the user-level layer: preference cascade, traits, explicit settings, and the API that backs it

**Supervisory / governance**
- [`admin.md`](./admin.md) — Operational control & campus administration
- [`sysadmin.md`](./sysadmin.md) — Server management, diagnostics & UUID inspection

**Students & primary constituents**
- [`student.md`](./student.md)
- [`parent.md`](./parent.md)
- [`guardian.md`](./guardian.md)
- [`visitor.md`](./visitor.md)

**Faculty & staff operations**
- [`faculty.md`](./faculty.md)
- [`staff.md`](./staff.md)
- [`worker.md`](./worker.md)
- [`operator.md`](./operator.md)

**Campus / hostel / mess / security operations**
- [`caretaker.md`](./caretaker.md)
- [`hostel_manager.md`](./hostel_manager.md)
- [`deputy_warden.md`](./deputy_warden.md)
- [`mess_incharge.md`](./mess_incharge.md)
- [`supervisor.md`](./supervisor.md)
- [`emo.md`](./emo.md)

**Departmental & academic approvers**
- [`hod.md`](./hod.md)
- [`oie`](./oie.md)
- [`exam_branch.md`](./exam_branch.md)
- [`exam_superintendent.md`](./exam_superintendent.md)

**Senior / institutional**
- [`principal.md`](./principal.md)
- [`vice_principal.md`](./vice_principal.md)
- [`chief_warden.md`](./chief_warden.md) (role context on Principal)
- [`dean.md`](./dean.md)

## Gaps & Research

Each role doc now includes a **Gaps & Research** section appended after the existing content. This section covers:

- **Institutional context** — what the role IS in real JNTUH CEJ life
- **Operational standards** — research-backed best practices (JNTUH exam branch, NIT Hamirpur SOP, TMU Mess Policy, UGC/AICTE/NBA)
- **Missing** — 8 numbered functional gaps per role
- **Implementation notes** — dashboard/agent design considerations
- **Agent persona** — what the agent should know to act as this role

The original page routes, API endpoints, data flow, and security notes are preserved unchanged. The Gaps & Research section is additive only.

## Cross-Role Dependency Map

Each role doc now includes a **Cross-Role Dependencies** section covering:
- What data this role should see (read-only) from other roles
- What this role should NOT see
- Where this role escalates to
- What this role borrows from other roles

See [cross-role-dependency.md](./cross-role-dependency.md) for the full capability sharing matrix.
