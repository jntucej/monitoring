# Sysadmin — how it works

## Overview
The `sysadmin` role represents the **Server & System Manager** within the JNTUH CEJ Gate Monitor stack. While administrators govern the operational side of students, faculty, and gate hardware, the sysadmin owns the foundational infrastructure, internal system controls, deployment orchestration, database health, automated background workers, and platform security posture.

Crucially, **`sysadmin` is the ONLY role cleared to see internal identifiers (UUIDs)** across the entire system. UI components like `UserProfileTab` gate the rendering of internal UUIDs strictly via `isSuperAdmin(role)`, which evaluates to `true` exclusively for `sysadmin` (`SUPER_ADMIN_ROLES = [ROLES.SYSADMIN]` in `src/lib/roles.ts`).

Like `admin`, `sysadmin` is member of `PRIVILEGED_ROLES` and is subject to mandatory Multi-Factor Authentication (MFA) and privileged login alerting.

---

## Pages & workflows
The sysadmin console includes all standard management pages plus an infrastructure and diagnostics surface (over 270 routes):

- **Deployment & Service Operations (`/sysadmin/deployments`, `/sysadmin/services`, `/sysadmin/docker-services`, `/sysadmin/application-health`):**
  Inspecting Docker container statuses, container memory/CPU utilization, real-time service health, deployment revision logs, and triggering controlled restarts.
- **Database & Data Store Diagnostics (`/sysadmin/database-health`, `/sysadmin/backup`, `/sysadmin/data`, `/sysadmin/redis-worker`):**
  Monitoring PostgreSQL connection pools, query execution latencies, database backup retention and integrity verifications, Redis worker queue depths, and dead-letter queues.
- **Security Posture & Policy Drift (`/sysadmin/security`, `/sysadmin/compliance`, `/sysadmin/retention-policies`):**
  Tracking CIS/system compliance metrics, reviewing RLS (Row Level Security) drift across PostgreSQL tables, checking secret rotations, and configuring system data retention windows.
- **Roles, Permissions & Delegations (`/sysadmin/roles`, `/sysadmin/permission-policies`, `/sysadmin/access`, `/sysadmin/access-keys`):**
  Managing granular role definitions in `config_roles_registry`, inspecting the live role graph, establishing permission policies, and issuing programmatic access API keys.
- **Disaster Recovery & Drills (`/sysadmin/drills`, `/sysadmin/actions`):**
  Executing and rearming simulated resilience drills (network partitions, failover testing, database disconnection drills), subject to two-person approval safeguards.
- **Autonomous Agents & Background Jobs (`/sysadmin/autonomous`, `/sysadmin/cron`, `/sysadmin/jobs`, `/sysadmin/scheduled-jobs`, `/sysadmin/bot`):**
  Inspecting cron scheduler ticks, autonomous monitoring agent health, Telegram bot anomaly detections, and automated background synchronization tasks.
- **System Navigation & App Topography (`/sysadmin/app-map`, `/sysadmin/navigation`, `/sysadmin/exit-reasons`):**
  Inspecting the full application page tree, route boundaries, navigation hierarchies, and system exit code configurations.

---

## Key API endpoints
The 15 most important endpoints across the sysadmin surface:

| Endpoint | Method(s) | What it does |
|---|---|---|
| `/api/sysadmin/deployments` | `GET` | Retrieve git commit SHA, deployment history, container startup timestamps |
| `/api/sysadmin/services` | `GET` | Check running state, uptime, and resource metrics of system containers |
| `/api/sysadmin/database-health` | `GET` | PostgreSQL diagnostic stats: active connections, pool saturation, transaction rates |
| `/api/sysadmin/backup-status` | `GET` | Retrieve latest automated pg_dump snapshot statuses and storage integrity |
| `/api/sysadmin/redis-worker` | `GET` | Queue telemetry: active jobs, waiting workers, and Redis latency |
| `/api/sysadmin/rls/drift` | `GET` | Detect database schema drift where RLS policies deviate from declarative baseline |
| `/api/sysadmin/security-posture` | `GET` | Overall security score: MFA enrollment rates, unrotated keys, unpatched packages |
| `/api/sysadmin/drills` | `GET` | List active, scheduled, and past chaos resilience drills |
| `/api/sysadmin/drills/rearm` | `GET`, `POST` | Rearm or schedule an automated disaster recovery or failover drill |
| `/api/sysadmin/drills/rearm/[id]/approve`| `POST` | Execute two-person approval to unleash or verify drill execution |
| `/api/sysadmin/actions` | `GET` | List pending high-risk system operations requiring multi-party clearance |
| `/api/sysadmin/actions/[id]/approve` | `POST` | Submit authorization signature for a high-risk system action |
| `/api/sysadmin/automation-controls` | `GET` | View state of background auto-remediation, auto-scaling, and cron loops |
| `/api/sysadmin/automation-controls/[id]` | `PATCH` | Pause, throttle, or resume specific automated agents or tasks |
| `/api/sysadmin/bot/anomaly` | `GET`, `POST` | Inspect and triage security anomalies detected by the autonomous monitoring bot |

---

## Data flow
1. **Authenticated Intake:** Requests carry an HttpOnly `access_token` JWT or `Authorization: Bearer` header.
2. **Authorization & Role Verification (`withAuthorization`):**
   - The token is verified against the server secret key. Caller must have the `sysadmin` role.
   - Device binding enforcement: token's `dh` SHA-256 hash claim is matched with the `device_id` cookie.
   - Account active status and password freshness verified.
   - Injects signed trusted headers (`x-user-id`, `x-user-role`, `x-mw-signature`).
3. **Internal UUID Visibility Gating:**
   - On the frontend (`UserProfileTab.tsx`, tables, and detail inspectors), `isSuperAdmin(auth.role)` returns `true`.
   - Raw database primary keys (`user.id`, entity UUIDs) are rendered for the sysadmin, enabling direct cross-referencing against PostgreSQL tables and server log lines.
4. **Diagnostic & Telemetry Execution:** Endpoint handlers query system internals directly (Docker daemon sockets, PostgreSQL catalog `pg_stat_activity`, Redis info commands, and file system disk metrics).
5. **High-Risk Action Quorum:** Dangerous operations (drills, destructive resets, emergency bypasses) record pending requests in `sysadmin_actions` and require a second administrator/sysadmin confirmation before execution.

---

## Security notes
- **SuperAdmin Exclusivity (`isSuperAdmin`):** Only `sysadmin` satisfies `SUPER_ADMIN_ROLES`. Internal UUIDs and raw database references are never exposed to other roles.
- **MFA Challenge Gate:** As a privileged role, authentication requires MFA validation (Passkey or TOTP) before an access token is issued.
- **Two-Person Approval Safeguard:** High-consequence actions (e.g. disaster recovery drills, mass role reassignment, schema resets) are gated by two-person rules (`/api/sysadmin/approvals/two-person` and `/api/sysadmin/actions/[id]/approve`).
- **Privileged Login Alerting:** Ingress alerts fire immediately upon session initiation, informing external audit channels (Telegram notification) of sysadmin access.
- **Session Tamper Termination:** Device hash discrepancies immediately invalidate all sessions for the sysadmin user ID (`UPDATE public.sessions SET revoked_at = NOW()`).
