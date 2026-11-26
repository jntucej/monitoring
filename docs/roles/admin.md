# Admin — how it works

## Overview
The `admin` role represents **operational control** within the JNTUH CEJ Gate Monitor stack. Administrators manage the campus's day-to-day lifecycle: users, attendance reconciliation, mess operational summaries, gate hardware configurations, campus lockdown controls, alert broadcasts, SMS dispatch queues, audit exports, and operational analytics.

Administrators have broad visibility across students, faculty, staff, parents, visitors, and security operators. However, unlike `sysadmin`, `admin` users do **not** own the internal server infrastructure surface (database health, service daemons, deployments, disaster recovery drills, RLS policy drift) and are **strictly restricted from viewing internal system identifiers (UUIDs)**.

Both `admin` and `sysadmin` belong to `PRIVILEGED_ROLES` (`src/lib/roles.ts`) and must satisfy an MFA challenge during login.

---

## Pages & workflows
The admin console spans over 260 routes. Functionality is organized into key functional areas:

- **User & Persona Management (`/admin/users`, `/admin/students`, `/admin/faculty`, `/admin/staff`, `/admin/parents`, `/admin/workers`, `/admin/visitors`):**
  Provisioning, modifying, and deactivating user profiles across all institution personas. Handles enrollment code generation, mobile enrollment links, temporary password resets, and role assignments.
- **Attendance & Academic Operations (`/admin/attendance`, `/admin/classes`, `/admin/departments`, `/admin/academic-automation`):**
  Bulk importing attendance registers, monitoring daily class attendance rosters, managing department assignments, tracking academic automation jobs, and reviewing attendance exception escalations.
- **Gate & Access Control (`/admin/gates`, `/admin/gate-device-configuration`, `/admin/passes`, `/admin/exceptions`):**
  Configuring campus entry/exit gates, pairing turnstile/scanner hardware devices, monitoring gate pass statuses, handling blocked pass exceptions, and inspecting ingress/egress records.
- **Emergency & Campus Lockdown (`/admin/lockdown`):**
  Executing immediate campus-wide or perimeter gate lockdown in emergency scenarios. Streams live gate lock statuses via Server-Sent Events (SSE) and releases lockdowns with mandatory administrative justification.
- **Mess & Hostel Operations (`/admin/mess`, `/admin/occupancy`, `/admin/cases`):**
  Reviewing daily meal consumption metrics, initiating monthly/periodic mess finalization, tracking block occupancy levels, and overseeing hostel and campus complaint resolution workflows.
- **Communication & SMS Queues (`/admin/sms/compose`, `/admin/sms/queue`, `/admin/sms/templates`, `/admin/announcements`):**
  Composing institution-wide SMS notices and circulars, managing automated template definitions (e.g. curfew breaches, gate pass acknowledgments), tracking outbound queue delivery states, and retrying failed messages.
- **Security & Session Governance (`/admin/security`, `/admin/sessions`, `/admin/audit-logs`, `/admin/roles`):**
  Managing temporary IP allowlists, reviewing security lockouts, auditing active user sessions, enforcing session revocations, monitoring audit logs, and issuing time-bounded operational delegations.
- **Analytics & Reporting (`/admin/analytics`, `/admin/reports`, `/admin/sustainability`):**
  High-level occupancy trends, predictive traffic modeling, user engagement analytics, inactive user reporting, and compliance export dashboards.

---

## Key API endpoints
The 15 most important endpoints for admin operations:

| Endpoint | Method(s) | What it does |
|---|---|---|
| `/api/admin/users` | `GET`, `POST` | List and search users across roles; provision new user accounts |
| `/api/admin/users/[id]` | `GET`, `PATCH` | Retrieve user profile details or update status, contact info, and profile metadata |
| `/api/admin/users/[id]/roles` | `GET`, `POST` | Inspect and assign additional roles or update primary role bindings |
| `/api/admin/users/[id]/reset-password` | `POST` | Trigger administrative password reset flag (`password_must_change = true`) |
| `/api/admin/users/bulk/validate` | `POST` | Validate batch CSV/JSON upload of student/staff records prior to commit |
| `/api/admin/users/bulk/commit` | `POST` | Execute atomic insertion of validated batch user records |
| `/api/admin/lockdown` | `GET`, `POST`, `DELETE` | Check lockdown state, initiate campus-wide emergency gate lockdown, or clear lockdown |
| `/api/admin/lockdown/stream` | `GET` | SSE stream providing real-time gate latch and lockdown status updates |
| `/api/admin/mess-finalize` | `POST` | Finalize operational meal counts and trigger billing ledger recalculations |
| `/api/admin/audit` | `GET` | Query structured audit event logs with role, timestamp, and action filtering |
| `/api/admin/audit/export` | `GET` | Export compliance and audit records to CSV/JSON format |
| `/api/admin/sms/compose` | `POST` | Dispatch manual SMS broadcasts to designated student, parent, or staff cohorts |
| `/api/admin/sms/queue` | `GET` | Inspect outbound SMS dispatcher queue statuses and failure reasons |
| `/api/admin/roles/delegate` | `GET`, `POST` | Issue or review active time-bound delegations (`public.delegations`) |
| `/api/admin/security/lockout` | `GET`, `POST` | Inspect locked out accounts (failed logins) and manually unlock accounts |

---

## Data flow
1. **Request Intake & Identification:** An administrative user sends an HTTP request carrying an HttpOnly `access_token` JWT or `Authorization: Bearer` header.
2. **Server-Side Authorization (`withAuthorization`):**
   - The token is verified against the JWT signing key, confirming the caller has the `admin` or `sysadmin` role.
   - Session device binding check: the token's `dh` hash claim must match the client's `device_id` cookie.
   - User account status is validated (`is_active = true`, `password_must_change = false`).
   - Trusted identity headers (`x-user-id`, `x-user-role`, `x-mw-signature`) are HMAC-signed and injected into downstream request processing.
3. **Internal UUID Redaction:** When returning user or entity payloads, profile tabs and shared components evaluate `isSuperAdmin(role)`. Because the role is `admin`, raw database UUIDs are stripped or masked in favor of human identifiers (e.g. Roll Number, Employee Code, or Public Slugs).
4. **Audit Persistence:** Administrative mutations write an immutable log entry to `public.audit_events` recording the actor's ID, action, resource target, and optional delegation ID.

---

## Security notes
- **MFA Enforcement:** `admin` is registered in `PRIVILEGED_ROLES` (`src/lib/roles.ts`). Logins require secondary factor verification (Passkey or TOTP) via `/api/auth/login` and `/api/auth/passkeys/authenticate/verify`.
- **Privileged Login Alert:** Every successful login by an `admin` account dispatches an immediate administrative security alert (`sendPrivilegedLoginAlert`) via Telegram/webhook.
- **UUID Masking / Information Hiding:** In accordance with platform governance, internal UUIDs are hidden from administrators (`isSuperAdmin(role) === false`) to prevent internal reference leakage.
- **Session Revocation on Anomaly:** Any device mismatch or tamper detection invalidates active database sessions (`UPDATE public.sessions SET revoked_at = NOW()`).


## Gaps & Research

### Institutional context
In a real university, this maps to the College Office / Administrative Manager who handles user provisioning, gate hardware, visitor policy, SMS alerts, and operational dashboards. Per NIT Hamirpur security SOP, campus security operations run through a Security Control Room under a Security Supervisor — our admin dashboard mirrors this: one screen, all gates, all alerts, all user activity.

### Operational standards
- Visitor categories (parent, guardian, vendor, contractor, guest, government, alumnus) each need different access scopes and badge rules
- Pre-registration with host verification and time-limited digital badges
- Real-time headcount across all gates (who is on campus at any moment)
- Automated check-in/check-out with photo and ID capture
- Host notification on visitor arrival
- SMS queue monitoring: pending count, delivered count, failed count, last batch timestamp

### Missing (not in app yet)
1. **Visitor category management** — no UI for defining visitor types with different access scopes and badge rules
2. **Pre-registration workflow** — no way for hosts to pre-register visitors in advance; visitors arrive at gate and operator handles manually
3. **SMS queue monitoring** — no live view of pending SMS dispatches, delivery status, or failed sends
4. **Gate hardware health dashboard** — no visual indicator of scanner uptime, sensor status, or last heartbeat
5. **Multi-gate visitor headcount** — no single screen showing "who is on campus right now" across all gates
6. **Lockdown drill testing** — no way to test lockdown without actually triggering it
7. **User self-service portal** — parents/students cannot request their own access changes; admin must handle manually
8. **Compliance audit reports** — no pre-built reports for JNTUH / AICTE / NBA inspection

### Implementation notes
- Dashboard should lead with CampusStatusBar (lg) + GateHealth (md) + UserStats (md)
- Lockdown is the highest-severity admin action: require two-person approval (admin + principal)
- Visitor pre-registration should be a host-initiated flow: host fills form, system generates QR, visitor scans at gate

### Agent persona
- Focus: campus operational health, user governance, gate hardware, alerts
- Do NOT: touch infrastructure, database, deployments, RLS policies (sysadmin territory)
- Can: configure gates, manage users, trigger lockdown, broadcast alerts, export audit logs
- Escalation: gate issues → supervisor; infra issues → sysadmin; academic issues → principal



## Cross-Role Dependencies

### Admin should see (read-only)
- **operator**: gate scan log, operator stats, device health → Admin monitors gate operations
- **supervisor**: overstay alerts, watchlist status → Admin sees security KPIs
- **staff**: shift status, handover docs → Admin monitors staff operations
- **worker**: task completion rate → Admin monitors maintenance SLAs
- **emo**: infrastructure complaints, vendor SLA → Admin sees estate status
- **sysadmin**: deployment status, MFA status → Admin sees infra health

### Admin should NOT see
- **sysadmin**: full audit with UUIDs, RLS internals, break-glass triggers → sysadmin territory
- **principal**: strategic KPIs, DEBARRED case files → Principal territory

### Two-person rules
- Lockdown: admin + principal
- Gate config changes: admin triggers, sysadmin approves for infra changes

### Admin borrows from
- **operator**: device health reports (admin monitors, operator generates)
- **supervisor**: exception resolution times (admin sees KPIs, supervisor resolves)

