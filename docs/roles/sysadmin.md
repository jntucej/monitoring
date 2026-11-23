# SysAdmin — how it works

## Role in institutional life
The SysAdmin role is the technical operations owner of the JNTUH CEJ Gate Monitor platform. It is the only role with unrestricted access to the server infrastructure surface: database health, MFA policy, backup/restore operations, RLS audit, break-glass access, service daemon management, and deployment controls.

In a real university IT department, this maps to the College IT Administrator or CISM who owns the LMS, ERP, and gate security systems. The sysadmin is the last line of technical defense — the only person who can bypass access controls, restore from backup, or take a service down.

Unlike the operational admin (who manages users, gates, and alerts), the sysadmin manages the system itself. The distinction is critical: admin = what the campus does; sysadmin = how the system runs.

## Operational standards
Per university IT security best practices and Indian higher-ed IT governance:
- MFA is mandatory for all privileged accounts; sysadmin owns the MFA policy (TOTP, hardware keys, passkey)
- Backup/restore drills must be tested quarterly; sysadmin owns the schedule and recovery testing
- RLS (Row-Level Security) audit: sysadmin reviews policy drift weekly; any unauthorized policy change is a security incident
- Break-glass access is a last resort: documented, time-boxed, and auto-expiring. Sysadmin triggers it; audit_events records the trigger and expiry
- Service daemons (gate scanners, QR readers, notification services) must have health checks; sysadmin monitors and restarts
- Deployment: sysadmin manages CI/CD pipeline, environment variables, and rollback

Per AICTE / NBA audit requirements, the system must maintain an immutable audit trail. Sysadmin is the only role that can view the full audit_events table including internal UUIDs — a restriction that distinguishes it from operational admin.

## Accountability and escalation
- SysAdmin reports to Principal (campus head) for all infrastructure decisions
- Security incidents: sysadmin → Principal → JNTUH IT Cell
- Break-glass: requires two-person approval (sysadmin + principal) for emergency infrastructure access
- Deployment: sysadmin triggers, principal approves for production
- RLS drift: sysadmin detects and reports; principal decides on policy change

## What we have in the app
- /sysadmin — Dashboard with infrastructure health, MFA status, backup state
- /sysadmin/infrastructure — Service daemon monitoring, deployment controls
- /sysadmin/mfa — MFA policy management, key rotation
- /sysadmin/backup — Backup schedule, restore operations
- /sysadmin/rls — RLS audit, policy drift detection
- /sysadmin/break-glass — Emergency access with time-boxed expiry
- /sysadmin/audit — Full audit log access (including UUIDs, restricted from admin)

Key API endpoints:
- POST /api/sysadmin/backup/restore — Trigger backup restore
- POST /api/sysadmin/break-glass — Trigger break-glass access
- GET /api/sysadmin/rls/audit — View RLS policy audit
- POST /api/sysadmin/mfa/rotate — Rotate MFA keys
- POST /api/sysadmin/deploy — Deploy changes

Data flow: All sysadmin actions are logged in audit_events with full context. RLS audit reads the postgres_fdw system catalogs. Backup/restore writes to S3/object storage.

## What is missing
1. Deployment rollback — no one-click rollback to previous version
2. RLS drift alerting — drift is detected on request; no proactive alert when a policy changes
3. MFA key expiry notification — no warning before keys expire
4. Break-glass auto-expiry enforcement — no system-enforced expiry; relies on manual revocation
5. Service daemon auto-restart — health checks exist but no automatic restart
6. Backup restore testing — no scheduled test-restore to verify backup integrity
7. Audit log search — no full-text search across audit_events
8. Environment variable management — no UI for managing config variables per environment

## Implementation notes for dashboard/agent
- Dashboard leads with infrastructure health, MFA status, backup state
- Sysadmin agent has FULL system access — it is the last technical defense
- Break-glass is the highest-severity action: two-person approval, time-boxed, auto-expiring
- Sysadmin agent should never self-approve: all break-glass and deployment actions require principal sign-off
- RLS audit should show: last policy change, who changed it, when, and drift score
- MFA dashboard should show: active keys, expiry dates, rotation status, last successful auth

## Agent persona
When acting as the sysadmin role:
- Focus: infrastructure, security, MFA, backup, RLS, deployments
- Do NOT: manage users, gates, alerts (that's operational admin)
- Can: access full audit log with UUIDs, trigger break-glass, manage MFA policy, deploy
- Escalation: security incidents → Principal → JNTUH IT Cell
- Break-glass: two-person approval (sysadmin + principal), time-boxed to 30 minutes, auto-revokes

