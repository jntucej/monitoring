# Admin — how it works

## Role in institutional life
The Admin role represents operational control within the JNTUH CEJ Gate Monitor stack. Administrators manage the campus's day-to-day lifecycle: users, attendance reconciliation, mess operational summaries, gate hardware configurations, campus lockdown controls, alert broadcasts, SMS dispatch queues, audit exports, and operational analytics.

Administrators have broad visibility across students, faculty, staff, parents, visitors, and security operators. However, unlike sysadmin, admin users do not own the internal server infrastructure surface (database health, service daemons, deployments, disaster recovery drills, RLS policy drift) and are strictly restricted from viewing internal system identifiers (UUIDs).

In a real university, this maps to the College Office / Administrative Manager who handles user provisioning, gate hardware, visitor policy, SMS alerts, and operational dashboards.

## Operational standards
In Indian constituent colleges like JNTUH CEJ, the administrative office is responsible for:
- User provisioning and de-provisioning for all roles (students, faculty, staff, parents)
- Gate hardware inventory and configuration (QR scanners, cameras, sensors)
- Campus lockdown authority (fire, security, health emergencies)
- Alert broadcasting (SMS, in-app, broadcast)
- Audit log exports for JNTUH / AICTE / NBA compliance
- Visitor policy management (visitor categories, pre-registration, badge issuance)

Per NIT Hamirpur security SOP, campus security operations run through a Security Control Room under a Security Supervisor, with all matters reported there. Our admin dashboard mirrors this: one screen, all gates, all alerts, all user activity.

Per Indian university visitor management best practices:
- Visitor categories: parent, guardian, vendor, contractor, guest, government, alumnus
- Pre-registration with host verification and time-limited digital badges
- Real-time headcount across all gates (who is on campus at any moment)
- Automated check-in/check-out with photo and ID capture
- Host notification on visitor arrival

Best practice: an admin dashboard leads with a Campus Status strip showing gate status, service health, user counts, and active incidents — exactly what our admin home widgets define (CampusStatusBar, GateHealth, UserStats).

## Accountability and escalation
- Admin reports to Principal (campus head)
- Gate/security matters: gate operator → security supervisor → admin
- User/account matters: admin is primary owner
- Admin cannot self-approve role changes; requires sysadmin or principal sign-off
- Audit exports are read-only: admin triggers the export, sysadmin reviews RLS drift

## What we have in the app
- /admin — Dashboard with CampusStatusBar, GateHealth, UserStats
- /admin/gates — Gate hardware configuration and status
- /admin/users — User governance (create, edit, role assignment)
- /admin/lockdown — Campus-wide lockdown controls
- /admin/alerts — Alert broadcast and SMS dispatch queues
- /admin/audit — Audit log exports
- /admin/roles — Role management and delegation
- /admin/config — System configuration

Key API endpoints:
- POST /api/admin/gates — Create/update gate configuration
- POST /api/admin/users — Create/update users
- POST /api/admin/lockdown — Trigger campus lockdown
- POST /api/admin/alerts/broadcast — Send alert broadcast
- GET /api/admin/audit/export — Export audit logs

Data flow: Admin actions write to the audit_events table. Role assignments are gated by withAuthorization(requiredRole). Lockdown state is broadcast to all gate operators in real time.

## What is missing
1. Visitor category management — no UI for defining visitor types with different access scopes and badge rules
2. Pre-registration workflow — no way for hosts to pre-register visitors in advance
3. SMS queue monitoring — no live view of pending SMS dispatches, delivery status, or failed sends
4. Gate hardware health dashboard — no visual indicator of scanner uptime, sensor status, or last heartbeat
5. Multi-gate visitor headcount — no single screen showing "who is on campus right now" across all gates
6. Lockdown drill testing — no way to test lockdown without actually triggering it
7. User self-service portal — parents/students cannot request their own access changes
8. Compliance audit reports — no pre-built reports for JNTUH / AICTE / NBA inspection

## Implementation notes for dashboard/agent
- Dashboard leads with CampusStatusBar (lg) + GateHealth (md) + UserStats (md)
- Admin agent has broad visibility but NOT infrastructure control (that's sysadmin)
- Admin agent escalates gate/security incidents to supervisor, user issues to sysadmin
- Lockdown is the highest-severity admin action: require two-person approval (admin + principal)
- Visitor pre-registration should be a host-initiated flow: host fills form, system generates QR, visitor scans at gate
- SMS queue should show: pending count, delivered count, failed count, last batch timestamp

## Agent persona
When acting as the admin role:
- Focus: campus operational health, user governance, gate hardware, alerts
- Do NOT: touch infrastructure, database, deployments, RLS policies (sysadmin territory)
- Can: configure gates, manage users, trigger lockdown, broadcast alerts, export audit logs
- Escalation: gate issues → supervisor; infra issues → sysadmin; academic issues → principal

