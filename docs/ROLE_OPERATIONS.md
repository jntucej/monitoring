# Role Operations Reference

> Generated 2026-11-17 · Source of truth: `src/lib/roles.ts` (23 roles), API `requiredRole` declarations across 270 routes, and UI `allowedRoles` guards.
> This document maps every role to the operations it can perform on the campus portal and Telegram bot.

## How role access works

- **APIs**: every route declares `requiredRole` (enforced by `withAuthorization`). The role list is the single gate; RLS on Postgres provides defense-in-depth per-table.
- **UI**: pages wrap content in `<AuthGuard allowedRoles={...}>`; unauthorized roles see a 403 page.
- **Postgres RLS**: the `gate_app` role sees only the rows its policies allow (students see themselves; faculty see their classes; HODs see their department; admin/sysadmin see everything).
- **Tiers** (`src/server/policy/roles.ts`): APPROVER (principal, vice_principal, exam_branch, oie, hostel_manager, deputy_warden, caretaker, hod, staff, supervisor, exam_superintendent) · OPERATOR (operator, principal, admin, sysadmin) · ADMIN (admin, sysadmin) · SYSADMIN (sysadmin) · MESS_INCHARGE · APP (all 19 interactive roles).
- **Academic status** (new): `student_details.academic_status` ∈ {SUSPENDED, DEBARRED, LATERAL_JOIN} + `year_override`. HODs manage it through the Academic Status Manager; the counter table `class_student_counts` keeps class enrollment O(1).

## Roles at a glance

| Role | API routes | UI pages | One-liner |
|---|---|---|---|
| `sysadmin` | 257 | 139 | full control of the monitoring stack and platform governance |
| `admin` | 241 | 130 | approvals, dashboards, and user governance (no sysadmin-only panels) |
| `principal` | 73 | 22 | approvals, mess oversight, delegation, campus-wide dashboards |
| `vice_principal` | 22 | 17 | exam office duties, OIE queue, exam access & exceptions |
| `hod` | 38 | 14 | department roster, class management, academic status flags |
| `faculty` | 37 | 16 | attendance, classes, students, schedule |
| `staff` | 25 | 12 | shifts, handover, gates, occupancy, maintenance |
| `operator` | 49 | 4 | scan, lookup, manual entry, transactions, visitor log |
| `supervisor` | 48 | 2 | escalated complaints, all gates, visitor oversight |
| `student` | 32 | 8 | profile, passes, curfew, mess, complaints, exams, campus feed |
| `parent` | 24 | 12 | child gate status, curfew, exams, mess, pass requests |
| `guardian` | 18 | 12 | ward status, curfew compliance, guardian link verification |
| `visitor` | 11 | 2 | pass lifecycle, check-in/out, campus feed |
| `worker` | 14 | 6 | task/attention items, campus feed |
| `caretaker` | 9 | 3 | maintenance queue, blocks, visitor log |
| `deputy_warden` | 8 | 11 | delegation, hostel tickets |
| `hostel_manager` | 8 | 6 | occupancy, blocks, curfew violations, housekeeping |
| `oie` | 15 | 20 | exam queue, access & exceptions, candidate attendance |
| `exam_branch` | 11 | 20 | exam access, exceptions, candidate attendance |
| `exam_superintendent` | 10 | 12 | superintendent console, exam access |
| `mess_incharge` | 19 | 2 | full mess console: menu, tokens, consumption, service |
| `emo` | 0 | 1 | safety/environmental compliance |
| `hostel` | 0 | 0 | folded into Principal (consolidation 2026-11); approver-surface compat only |

## Per-role operations

### Sysadmin (`sysadmin`)

*System administrator — full control of the monitoring stack and platform governance*

- Full control of the monitoring stack: infrastructure panels, gate services, docker services, cron jobs, webhooks, security posture, RLS audit
- Manage the Telegram bot: deep links, onboarding sync, command config, bot stats, audit log
- User governance: create / suspend / deprovision any account, MFA & WebAuthn break-glass, instant session revocation
- System health, audit trail, backups, schema drift, deployments, compliance reports
- Academic status manager: flag any student SUSPENDED / DEBARRED / LATERAL_JOIN with year override

<details><summary><b>API routes (257)</b></summary>

**academic-status/**
- `/api/academic-status/route.ts`

**admin/**
- `/api/admin/access/overview/route.ts`
- `/api/admin/alerts/overview/route.ts`
- `/api/admin/alerts/route.ts`
- `/api/admin/alerts/rules/route.ts`
- `/api/admin/alerts/runbooks/overview/route.ts`
- `/api/admin/alerts/safety/overview/route.ts`
- `/api/admin/alerts/stream/route.ts`
- `/api/admin/analytics/users/engagement/route.ts`
- `/api/admin/analytics/users/inactive/route.ts`
- `/api/admin/analytics/users/trends/route.ts`
- `/api/admin/announcements/[id]/route.ts`
- `/api/admin/announcements/route.ts`
- `/api/admin/audit-logs/route.ts`
- `/api/admin/audit/route.ts`
- `/api/admin/automation/deployments/overview/route.ts`
- `/api/admin/automation/jobs/overview/route.ts`
- `/api/admin/automation/maintenance/overview/route.ts`
- `/api/admin/data/overview/route.ts`
- `/api/admin/deployments/overview/route.ts`
- `/api/admin/deployments/route.ts`
- `/api/admin/disk-status/route.ts`
- `/api/admin/exceptions/route.ts`
- `/api/admin/export/route.ts`
- `/api/admin/gate-device-configuration/route.ts`
- `/api/admin/identity/people/overview/route.ts`
- `/api/admin/kb/documents/route.ts`
- `/api/admin/kiosk/route.ts`
- `/api/admin/lockdown/route.ts`
- `/api/admin/lockdown/stream/route.ts`
- `/api/admin/monitoring/health/overview/route.ts`
- `/api/admin/monitoring/route.ts`
- `/api/admin/notification-settings/route.ts`
- `/api/admin/people/[id]/route.ts`
- `/api/admin/people/overview/route.ts`
- `/api/admin/permission-policies/route.ts`
- `/api/admin/promotions/overview/route.ts`
- `/api/admin/reference/departments/overview/route.ts`
- `/api/admin/reference/hostel-tickets/overview/route.ts`
- `/api/admin/reports/route.ts`
- `/api/admin/retention-policies/route.ts`
- `/api/admin/retention/run/route.ts`
- `/api/admin/role-requests/[id]/route.ts`
- `/api/admin/safety/overview/route.ts`
- `/api/admin/scheduled-jobs/route.ts`
- `/api/admin/scheduling/apply/route.ts`
- `/api/admin/scheduling/suggestions/route.ts`
- `/api/admin/sessions/[id]/route.ts`
- `/api/admin/sessions/revoke-all/route.ts`
- `/api/admin/sessions/route.ts`
- `/api/admin/sms/compose/route.ts`
- `/api/admin/sms/queue/[id]/retry/route.ts`
- `/api/admin/sms/queue/[id]/route.ts`
- `/api/admin/sms/queue/route.ts`
- `/api/admin/sms/stats/route.ts`
- `/api/admin/sms/templates/[code]/route.ts`
- `/api/admin/sms/templates/route.ts`
- `/api/admin/support/tickets/[id]/route.ts`
- `/api/admin/support/tickets/route.ts`
- `/api/admin/sustainability/history/route.ts`
- `/api/admin/sustainability/route.ts`
- `/api/admin/tables/route.ts`
- `/api/admin/ueba/route.ts`
- `/api/admin/users/[id]/enrollment-code/route.ts`
- `/api/admin/users/[id]/mobile-enrollment/route.ts`
- `/api/admin/users/[id]/roles/route.ts`
- `/api/admin/users/[id]/route.ts`
- `/api/admin/users/enrollment-codes/[id]/route.ts`
- `/api/admin/users/enrollment-codes/route.ts`
- `/api/admin/users/route.ts`
- `/api/admin/workflow-configuration/route.ts`

**alerts/**
- `/api/alerts/[id]/route.ts`
- `/api/alerts/assign/route.ts`

**analytics/**
- `/api/analytics/advanced/route.ts`
- `/api/analytics/daily-stats/route.ts`
- `/api/analytics/daily/route.ts`
- `/api/analytics/enhanced/route.ts`
- `/api/analytics/export/route.ts`
- `/api/analytics/occupancy/retrain/route.ts`
- `/api/analytics/occupancy/route.ts`
- `/api/analytics/predictions/history/route.ts`
- `/api/analytics/predictions/retrain/route.ts`
- `/api/analytics/predictions/route.ts`
- `/api/analytics/reports/[id]/route.ts`
- `/api/analytics/reports/[id]/run/route.ts`
- `/api/analytics/reports/route.ts`
- `/api/analytics/sustainability/retrain/route.ts`
- `/api/analytics/sustainability/route.ts`
- `/api/analytics/traffic/retrain/route.ts`
- `/api/analytics/traffic/route.ts`
- `/api/analytics/visitors/route.ts`
- `/api/analytics/webhooks/retrain/route.ts`
- `/api/analytics/webhooks/route.ts`

**announcements/**
- `/api/announcements/[id]/dismiss/route.ts`
- `/api/announcements/active/route.ts`

**attendance_records/**
- `/api/attendance_records/route.ts`

**attention/**
- `/api/attention/timeline/route.ts`

**audit/**
- `/api/audit/photo-capture/route.ts`

**bot/**
- `/api/bot/session/current/route.ts`
- `/api/bot/telegram-sync/route.ts`

**campus/**
- `/api/campus/assistant/route.ts`
- `/api/campus/communities/[id]/join/route.ts`
- `/api/campus/communities/[id]/leave/route.ts`
- `/api/campus/communities/[id]/moderate/route.ts`
- `/api/campus/communities/[id]/posts/route.ts`
- `/api/campus/communities/[id]/report/route.ts`
- `/api/campus/communities/[id]/route.ts`
- `/api/campus/communities/route.ts`
- `/api/campus/events/[id]/attend/route.ts`

**caretaker/**
- `/api/caretaker/maintenance/route.ts`
- `/api/caretaker/summary/route.ts`

**classes/**
- `/api/classes/[id]/route.ts`
- `/api/classes/[id]/students/route.ts`
- `/api/classes/route.ts`

**config/**
- `/api/config/custom-reasons/[id]/route.ts`
- `/api/config/custom-reasons/route.ts`
- `/api/config/student-rules/route.ts`
- `/api/config/subjects/route.ts`

**dashboard/**
- `/api/dashboard/hostel/route.ts`

**departments/**
- `/api/departments/[dept]/classes/route.ts`
- `/api/departments/route.ts`

**deployment/**
- `/api/deployment/logs/route.ts`

**dev/**
- `/api/dev/contact/route.ts`

**docs/**
- `/api/docs/route.ts`

**emergency/**
- `/api/emergency/alerts/[id]/resolve/route.ts`

**exam/**
- `/api/exam/access-exceptions/route.ts`
- `/api/exam/access/route.ts`
- `/api/exam/candidate-attendance/route.ts`

**faculty/**
- `/api/faculty/attendance/route.ts`
- `/api/faculty/route.ts`

**faculty-assignments/**
- `/api/faculty-assignments/[id]/route.ts`
- `/api/faculty-assignments/route.ts`

**feedback/**
- `/api/feedback/route.ts`

**gate/**
- `/api/gate/devices/route.ts`
- `/api/gate/scan/route.ts`
- `/api/gate/stream/route.ts`
- `/api/gate/verify-face/route.ts`
- `/api/gate/verify-thumbprint/route.ts`

**gates/**
- `/api/gates/[id]/route.ts`
- `/api/gates/route.ts`
- `/api/gates/schedule/[id]/route.ts`
- `/api/gates/schedule/route.ts`

**hod/**
- `/api/hod/dashboard/route.ts`
- `/api/hod/faculty/route.ts`
- `/api/hod/pulse/route.ts`
- `/api/hod/retention/route.ts`
- `/api/hod/schedule/route.ts`

**hostel-manager/**
- `/api/hostel-manager/housekeeping-tasks/route.ts`
- `/api/hostel-manager/summary/route.ts`

**integrations/**
- `/api/integrations/[id]/route.ts`
- `/api/integrations/[id]/sync/route.ts`
- `/api/integrations/lms/attendance/route.ts`
- `/api/integrations/lms/configure/route.ts`
- `/api/integrations/lms/status/route.ts`
- `/api/integrations/lms/sync/route.ts`
- `/api/integrations/logs/route.ts`
- `/api/integrations/route.ts`
- `/api/integrations/test/route.ts`

**mess/**
- `/api/mess/analytics/route.ts`
- `/api/mess/arrivals/route.ts`
- `/api/mess/attendance/route.ts`
- `/api/mess/consumption/route.ts`
- `/api/mess/days/route.ts`
- `/api/mess/inventory/route.ts`
- `/api/mess/issues/route.ts`
- `/api/mess/meal-counts/route.ts`
- `/api/mess/menu-items/route.ts`
- `/api/mess/menu/route.ts`
- `/api/mess/operational-requests/route.ts`
- `/api/mess/preference/route.ts`
- `/api/mess/serve/route.ts`
- `/api/mess/token/[code]/route.ts`

**occupancy/**
- `/api/occupancy/current/route.ts`
- `/api/occupancy/history/route.ts`
- `/api/occupancy/presence-matrix/route.ts`

**oie/**
- `/api/oie/queue/route.ts`

**operator/**
- `/api/operator/claim-gate/route.ts`
- `/api/operator/entry-type/route.ts`
- `/api/operator/last-scan/route.ts`
- `/api/operator/lookup/route.ts`
- `/api/operator/manual-entry/route.ts`
- `/api/operator/mode/route.ts`
- `/api/operator/register-thumbprint/route.ts`
- `/api/operator/stats/route.ts`
- `/api/operator/transactions/route.ts`

**parents/**
- `/api/parents/link/route.ts`
- `/api/parents/me/route.ts`
- `/api/parents/route.ts`

**passes/**
- `/api/passes/[passId]/action/route.ts`
- `/api/passes/[passId]/route.ts`

**persons/**
- `/api/persons/[uniqueId]/history/route.ts`
- `/api/persons/[uniqueId]/route.ts`
- `/api/persons/route.ts`

**principal/**
- `/api/principal/audit/route.ts`
- `/api/principal/catch-up/route.ts`
- `/api/principal/dashboard/route.ts`
- `/api/principal/delegations/route.ts`
- `/api/principal/digest/route.ts`
- `/api/principal/retention/route.ts`
- `/api/principal/sla-heatmap/route.ts`
- `/api/principal/week-digest/route.ts`

**roles-graph/**
- `/api/roles-graph/route.ts`

**staff/**
- `/api/staff/attendance/route.ts`
- `/api/staff/history/route.ts`
- `/api/staff/my-day/route.ts`
- `/api/staff/register/route.ts`
- `/api/staff/requests-status/route.ts`
- `/api/staff/stats/route.ts`

**students/**
- `/api/students/[roll]/history/route.ts`
- `/api/students/[roll]/route.ts`
- `/api/students/register/route.ts`
- `/api/students/route.ts`
- `/api/students/stats/route.ts`

**supervisor/**
- `/api/supervisor/assignees/route.ts`
- `/api/supervisor/claim-codes/route.ts`
- `/api/supervisor/dashboard/route.ts`
- `/api/supervisor/escalations/route.ts`
- `/api/supervisor/gate-live/route.ts`
- `/api/supervisor/retention/route.ts`
- `/api/supervisor/shift/route.ts`
- `/api/supervisor/team-roster/route.ts`

**support/**
- `/api/support/tickets/[id]/comments/route.ts`
- `/api/support/tickets/route.ts`

**sysadmin/**
- `/api/sysadmin/actions/[id]/approve/route.ts`
- `/api/sysadmin/actions/[id]/route.ts`
- `/api/sysadmin/actions/route.ts`
- `/api/sysadmin/application-health/route.ts`
- `/api/sysadmin/automation-controls/[id]/route.ts`
- `/api/sysadmin/automation-controls/route.ts`
- `/api/sysadmin/backup-status/route.ts`
- `/api/sysadmin/database-health/route.ts`
- `/api/sysadmin/deployments/route.ts`
- `/api/sysadmin/drills/route.ts`
- `/api/sysadmin/forecasts/route.ts`
- `/api/sysadmin/redis-worker/route.ts`
- `/api/sysadmin/security-posture/route.ts`
- `/api/sysadmin/services/route.ts`
- `/api/sysadmin/worker-jobs/route.ts`

**system/**
- `/api/system/config/route.ts`

**users/**
- `/api/users/[id]/route.ts`
- `/api/users/bulk-graduate/route.ts`
- `/api/users/bulk/commit/route.ts`
- `/api/users/bulk/route.ts`
- `/api/users/bulk/validate/route.ts`

**visitors/**
- `/api/visitors/freeze/route.ts`
- `/api/visitors/mine/route.ts`
- `/api/visitors/route.ts`

**voice/**
- `/api/voice/interpret/route.ts`

**vp/**
- `/api/vp/academics/route.ts`
- `/api/vp/dashboard/route.ts`
- `/api/vp/history/route.ts`
- `/api/vp/retention/route.ts`

**workers/**
- `/api/workers/my-shift/route.ts`
- `/api/workers/my-work-orders/route.ts`
- `/api/workers/my-work/route.ts`
- `/api/workers/personal-history/route.ts`
- `/api/workers/shifts/route.ts`

</details>

### Admin (`admin`)

*Campus administrator — approvals, dashboards, and user governance (no sysadmin-only panels)*

- Approvals: permission requests, pass approvals, operator actions, delegation log
- Campus-wide dashboards: occupancy, alerts, open complaints, events, mess oversight
- Manage students, staff, classes, departments, announcements, gate schedule
- Exception handling (admin/exceptions) and hostel ticket queue (VIEW_ROLES: sysadmin/admin/principal)

<details><summary><b>API routes (241)</b></summary>

**academic-status/**
- `/api/academic-status/route.ts`

**admin/**
- `/api/admin/access/overview/route.ts`
- `/api/admin/alerts/overview/route.ts`
- `/api/admin/alerts/route.ts`
- `/api/admin/alerts/rules/route.ts`
- `/api/admin/alerts/runbooks/overview/route.ts`
- `/api/admin/alerts/safety/overview/route.ts`
- `/api/admin/alerts/stream/route.ts`
- `/api/admin/analytics/users/engagement/route.ts`
- `/api/admin/analytics/users/inactive/route.ts`
- `/api/admin/analytics/users/trends/route.ts`
- `/api/admin/announcements/[id]/route.ts`
- `/api/admin/announcements/route.ts`
- `/api/admin/audit-logs/route.ts`
- `/api/admin/audit/route.ts`
- `/api/admin/automation/deployments/overview/route.ts`
- `/api/admin/automation/jobs/overview/route.ts`
- `/api/admin/automation/maintenance/overview/route.ts`
- `/api/admin/data/overview/route.ts`
- `/api/admin/deployments/overview/route.ts`
- `/api/admin/deployments/route.ts`
- `/api/admin/disk-status/route.ts`
- `/api/admin/exceptions/route.ts`
- `/api/admin/export/route.ts`
- `/api/admin/gate-device-configuration/route.ts`
- `/api/admin/identity/people/overview/route.ts`
- `/api/admin/kb/documents/route.ts`
- `/api/admin/lockdown/route.ts`
- `/api/admin/lockdown/stream/route.ts`
- `/api/admin/monitoring/health/overview/route.ts`
- `/api/admin/notification-settings/route.ts`
- `/api/admin/people/[id]/route.ts`
- `/api/admin/people/overview/route.ts`
- `/api/admin/permission-policies/route.ts`
- `/api/admin/promotions/overview/route.ts`
- `/api/admin/reference/departments/overview/route.ts`
- `/api/admin/reference/hostel-tickets/overview/route.ts`
- `/api/admin/reports/route.ts`
- `/api/admin/role-requests/[id]/route.ts`
- `/api/admin/safety/overview/route.ts`
- `/api/admin/scheduled-jobs/route.ts`
- `/api/admin/scheduling/apply/route.ts`
- `/api/admin/scheduling/suggestions/route.ts`
- `/api/admin/sessions/route.ts`
- `/api/admin/sms/compose/route.ts`
- `/api/admin/sms/queue/[id]/retry/route.ts`
- `/api/admin/sms/queue/[id]/route.ts`
- `/api/admin/sms/queue/route.ts`
- `/api/admin/sms/stats/route.ts`
- `/api/admin/sms/templates/[code]/route.ts`
- `/api/admin/sms/templates/route.ts`
- `/api/admin/support/tickets/[id]/route.ts`
- `/api/admin/support/tickets/route.ts`
- `/api/admin/sustainability/history/route.ts`
- `/api/admin/sustainability/route.ts`
- `/api/admin/tables/route.ts`
- `/api/admin/ueba/route.ts`
- `/api/admin/users/[id]/enrollment-code/route.ts`
- `/api/admin/users/[id]/mobile-enrollment/route.ts`
- `/api/admin/users/[id]/roles/route.ts`
- `/api/admin/users/[id]/route.ts`
- `/api/admin/users/enrollment-codes/[id]/route.ts`
- `/api/admin/users/enrollment-codes/route.ts`
- `/api/admin/users/route.ts`
- `/api/admin/workflow-configuration/route.ts`

**alerts/**
- `/api/alerts/[id]/route.ts`
- `/api/alerts/assign/route.ts`

**analytics/**
- `/api/analytics/advanced/route.ts`
- `/api/analytics/daily-stats/route.ts`
- `/api/analytics/daily/route.ts`
- `/api/analytics/enhanced/route.ts`
- `/api/analytics/export/route.ts`
- `/api/analytics/occupancy/retrain/route.ts`
- `/api/analytics/occupancy/route.ts`
- `/api/analytics/predictions/history/route.ts`
- `/api/analytics/predictions/retrain/route.ts`
- `/api/analytics/predictions/route.ts`
- `/api/analytics/reports/[id]/route.ts`
- `/api/analytics/reports/[id]/run/route.ts`
- `/api/analytics/reports/route.ts`
- `/api/analytics/sustainability/retrain/route.ts`
- `/api/analytics/sustainability/route.ts`
- `/api/analytics/traffic/retrain/route.ts`
- `/api/analytics/traffic/route.ts`
- `/api/analytics/visitors/route.ts`
- `/api/analytics/webhooks/retrain/route.ts`
- `/api/analytics/webhooks/route.ts`

**announcements/**
- `/api/announcements/[id]/dismiss/route.ts`
- `/api/announcements/active/route.ts`

**attendance_records/**
- `/api/attendance_records/route.ts`

**attention/**
- `/api/attention/timeline/route.ts`

**audit/**
- `/api/audit/photo-capture/route.ts`

**bot/**
- `/api/bot/session/current/route.ts`

**campus/**
- `/api/campus/assistant/route.ts`
- `/api/campus/communities/[id]/join/route.ts`
- `/api/campus/communities/[id]/leave/route.ts`
- `/api/campus/communities/[id]/moderate/route.ts`
- `/api/campus/communities/[id]/posts/route.ts`
- `/api/campus/communities/[id]/report/route.ts`
- `/api/campus/communities/[id]/route.ts`
- `/api/campus/communities/route.ts`
- `/api/campus/events/[id]/attend/route.ts`

**caretaker/**
- `/api/caretaker/maintenance/route.ts`
- `/api/caretaker/summary/route.ts`

**classes/**
- `/api/classes/[id]/route.ts`
- `/api/classes/[id]/students/route.ts`
- `/api/classes/route.ts`

**config/**
- `/api/config/custom-reasons/[id]/route.ts`
- `/api/config/custom-reasons/route.ts`
- `/api/config/student-rules/route.ts`
- `/api/config/subjects/route.ts`

**dashboard/**
- `/api/dashboard/hostel/route.ts`

**departments/**
- `/api/departments/[dept]/classes/route.ts`
- `/api/departments/route.ts`

**dev/**
- `/api/dev/contact/route.ts`

**emergency/**
- `/api/emergency/alerts/[id]/resolve/route.ts`

**exam/**
- `/api/exam/access-exceptions/route.ts`
- `/api/exam/access/route.ts`
- `/api/exam/candidate-attendance/route.ts`

**faculty/**
- `/api/faculty/attendance/route.ts`
- `/api/faculty/route.ts`

**faculty-assignments/**
- `/api/faculty-assignments/[id]/route.ts`
- `/api/faculty-assignments/route.ts`

**feedback/**
- `/api/feedback/route.ts`

**gate/**
- `/api/gate/devices/route.ts`
- `/api/gate/scan/route.ts`
- `/api/gate/stream/route.ts`
- `/api/gate/verify-face/route.ts`
- `/api/gate/verify-thumbprint/route.ts`

**gates/**
- `/api/gates/[id]/route.ts`
- `/api/gates/route.ts`
- `/api/gates/schedule/[id]/route.ts`
- `/api/gates/schedule/route.ts`

**hod/**
- `/api/hod/dashboard/route.ts`
- `/api/hod/faculty/route.ts`
- `/api/hod/pulse/route.ts`
- `/api/hod/retention/route.ts`
- `/api/hod/schedule/route.ts`

**hostel-manager/**
- `/api/hostel-manager/housekeeping-tasks/route.ts`
- `/api/hostel-manager/summary/route.ts`

**integrations/**
- `/api/integrations/[id]/route.ts`
- `/api/integrations/[id]/sync/route.ts`
- `/api/integrations/lms/attendance/route.ts`
- `/api/integrations/lms/configure/route.ts`
- `/api/integrations/lms/status/route.ts`
- `/api/integrations/lms/sync/route.ts`
- `/api/integrations/logs/route.ts`
- `/api/integrations/route.ts`
- `/api/integrations/test/route.ts`

**mess/**
- `/api/mess/analytics/route.ts`
- `/api/mess/arrivals/route.ts`
- `/api/mess/attendance/route.ts`
- `/api/mess/consumption/route.ts`
- `/api/mess/days/route.ts`
- `/api/mess/inventory/route.ts`
- `/api/mess/issues/route.ts`
- `/api/mess/meal-counts/route.ts`
- `/api/mess/menu-items/route.ts`
- `/api/mess/menu/route.ts`
- `/api/mess/operational-requests/route.ts`
- `/api/mess/preference/route.ts`
- `/api/mess/serve/route.ts`
- `/api/mess/token/[code]/route.ts`

**occupancy/**
- `/api/occupancy/current/route.ts`
- `/api/occupancy/history/route.ts`
- `/api/occupancy/presence-matrix/route.ts`

**oie/**
- `/api/oie/queue/route.ts`

**operator/**
- `/api/operator/entry-type/route.ts`
- `/api/operator/last-scan/route.ts`
- `/api/operator/lookup/route.ts`
- `/api/operator/manual-entry/route.ts`
- `/api/operator/mode/route.ts`
- `/api/operator/register-thumbprint/route.ts`
- `/api/operator/stats/route.ts`
- `/api/operator/transactions/route.ts`

**parents/**
- `/api/parents/link/route.ts`
- `/api/parents/me/route.ts`
- `/api/parents/route.ts`

**passes/**
- `/api/passes/[passId]/action/route.ts`
- `/api/passes/[passId]/route.ts`

**persons/**
- `/api/persons/[uniqueId]/history/route.ts`
- `/api/persons/[uniqueId]/route.ts`
- `/api/persons/route.ts`

**principal/**
- `/api/principal/catch-up/route.ts`
- `/api/principal/dashboard/route.ts`
- `/api/principal/delegations/route.ts`
- `/api/principal/digest/route.ts`
- `/api/principal/retention/route.ts`
- `/api/principal/sla-heatmap/route.ts`
- `/api/principal/week-digest/route.ts`

**roles-graph/**
- `/api/roles-graph/route.ts`

**staff/**
- `/api/staff/attendance/route.ts`
- `/api/staff/history/route.ts`
- `/api/staff/my-day/route.ts`
- `/api/staff/register/route.ts`
- `/api/staff/requests-status/route.ts`
- `/api/staff/stats/route.ts`

**students/**
- `/api/students/[roll]/history/route.ts`
- `/api/students/[roll]/route.ts`
- `/api/students/register/route.ts`
- `/api/students/route.ts`
- `/api/students/stats/route.ts`

**supervisor/**
- `/api/supervisor/assignees/route.ts`
- `/api/supervisor/dashboard/route.ts`
- `/api/supervisor/escalations/route.ts`
- `/api/supervisor/gate-live/route.ts`
- `/api/supervisor/retention/route.ts`
- `/api/supervisor/shift/route.ts`
- `/api/supervisor/team-roster/route.ts`

**support/**
- `/api/support/tickets/[id]/comments/route.ts`
- `/api/support/tickets/route.ts`

**sysadmin/**
- `/api/sysadmin/actions/[id]/route.ts`
- `/api/sysadmin/actions/route.ts`
- `/api/sysadmin/application-health/route.ts`
- `/api/sysadmin/backup-status/route.ts`
- `/api/sysadmin/database-health/route.ts`
- `/api/sysadmin/deployments/route.ts`
- `/api/sysadmin/forecasts/route.ts`
- `/api/sysadmin/redis-worker/route.ts`
- `/api/sysadmin/security-posture/route.ts`
- `/api/sysadmin/services/route.ts`
- `/api/sysadmin/worker-jobs/route.ts`

**system/**
- `/api/system/config/route.ts`

**users/**
- `/api/users/[id]/route.ts`
- `/api/users/bulk/commit/route.ts`
- `/api/users/bulk/route.ts`
- `/api/users/bulk/validate/route.ts`
- `/api/users/lookup/route.ts`

**visitors/**
- `/api/visitors/freeze/route.ts`
- `/api/visitors/mine/route.ts`
- `/api/visitors/route.ts`

**voice/**
- `/api/voice/interpret/route.ts`

**vp/**
- `/api/vp/academics/route.ts`
- `/api/vp/dashboard/route.ts`
- `/api/vp/history/route.ts`
- `/api/vp/retention/route.ts`

**workers/**
- `/api/workers/my-shift/route.ts`
- `/api/workers/my-work-orders/route.ts`
- `/api/workers/my-work/route.ts`
- `/api/workers/personal-history/route.ts`
- `/api/workers/shifts/route.ts`

</details>

### Principal (`principal`)

*Institution head — approvals, mess oversight, delegation, campus-wide dashboards*

- Institution dashboard: attendance, alerts, complaints, live occupancy, delegation log
- Approver surface: all approver workflows (academics, hostel, exam, mess)
- Mess in-charge powers via TIER.MESS_INCHARGE (tokens, menu, consumption)
- Supervisor oversight + gate manual-entry authority (TIER.OPERATOR)

<details><summary><b>API routes (73)</b></summary>

**admin/**
- `/api/admin/lockdown/route.ts`

**alerts/**
- `/api/alerts/[id]/route.ts`
- `/api/alerts/assign/route.ts`

**announcements/**
- `/api/announcements/[id]/dismiss/route.ts`
- `/api/announcements/active/route.ts`

**attendance_records/**
- `/api/attendance_records/route.ts`

**attention/**
- `/api/attention/timeline/route.ts`

**bot/**
- `/api/bot/session/current/route.ts`

**campus/**
- `/api/campus/assistant/route.ts`

**caretaker/**
- `/api/caretaker/maintenance/route.ts`
- `/api/caretaker/summary/route.ts`

**config/**
- `/api/config/custom-reasons/[id]/route.ts`
- `/api/config/custom-reasons/route.ts`

**dashboard/**
- `/api/dashboard/hostel/route.ts`

**emergency/**
- `/api/emergency/alerts/[id]/resolve/route.ts`

**exam/**
- `/api/exam/access-exceptions/route.ts`
- `/api/exam/access/route.ts`
- `/api/exam/candidate-attendance/route.ts`
- `/api/exam/superintendent/route.ts`

**faculty/**
- `/api/faculty/attendance/route.ts`

**gate/**
- `/api/gate/scan/route.ts`

**hod/**
- `/api/hod/dashboard/route.ts`
- `/api/hod/pulse/route.ts`
- `/api/hod/retention/route.ts`

**hostel-manager/**
- `/api/hostel-manager/housekeeping-tasks/route.ts`
- `/api/hostel-manager/summary/route.ts`

**mess/**
- `/api/mess/analytics/route.ts`
- `/api/mess/arrivals/route.ts`
- `/api/mess/attendance/route.ts`
- `/api/mess/consumption/route.ts`
- `/api/mess/days/route.ts`
- `/api/mess/inventory/route.ts`
- `/api/mess/issues/route.ts`
- `/api/mess/meal-counts/route.ts`
- `/api/mess/menu-items/route.ts`
- `/api/mess/operational-requests/route.ts`
- `/api/mess/serve/route.ts`
- `/api/mess/token/[code]/route.ts`

**occupancy/**
- `/api/occupancy/presence-matrix/route.ts`

**oie/**
- `/api/oie/queue/route.ts`

**operator/**
- `/api/operator/lookup/route.ts`
- `/api/operator/manual-entry/route.ts`
- `/api/operator/stats/route.ts`
- `/api/operator/transactions/route.ts`

**passes/**
- `/api/passes/[passId]/action/route.ts`
- `/api/passes/[passId]/route.ts`

**persons/**
- `/api/persons/[uniqueId]/history/route.ts`

**principal/**
- `/api/principal/audit/route.ts`
- `/api/principal/catch-up/route.ts`
- `/api/principal/dashboard/route.ts`
- `/api/principal/delegations/route.ts`
- `/api/principal/digest/route.ts`
- `/api/principal/retention/route.ts`
- `/api/principal/sla-heatmap/route.ts`
- `/api/principal/week-digest/route.ts`

**roles-graph/**
- `/api/roles-graph/route.ts`

**staff/**
- `/api/staff/attendance/route.ts`

**students/**
- `/api/students/register/route.ts`
- `/api/students/route.ts`

**supervisor/**
- `/api/supervisor/assignees/route.ts`
- `/api/supervisor/dashboard/route.ts`
- `/api/supervisor/escalations/route.ts`
- `/api/supervisor/gate-live/route.ts`
- `/api/supervisor/retention/route.ts`
- `/api/supervisor/shift/route.ts`
- `/api/supervisor/team-roster/route.ts`

**support/**
- `/api/support/tickets/[id]/comments/route.ts`
- `/api/support/tickets/route.ts`

**visitors/**
- `/api/visitors/freeze/route.ts`

**vp/**
- `/api/vp/academics/route.ts`
- `/api/vp/dashboard/route.ts`
- `/api/vp/history/route.ts`
- `/api/vp/retention/route.ts`

</details>

### Vice Principal (`vice_principal`)

*Deputy head — exam office duties, OIE queue, exam access & exceptions*

- Exam office queue, OIE duties, exam access & exceptions (with exam_branch / oie)
- Approver surface shared with principal: academics-department, exam, mess
- Deputy authority: delegate principal workflows while principal is away

<details><summary><b>API routes (22)</b></summary>

**attention/**
- `/api/attention/timeline/route.ts`

**bot/**
- `/api/bot/session/current/route.ts`

**caretaker/**
- `/api/caretaker/maintenance/route.ts`
- `/api/caretaker/summary/route.ts`

**dashboard/**
- `/api/dashboard/hostel/route.ts`

**exam/**
- `/api/exam/access-exceptions/route.ts`
- `/api/exam/access/route.ts`
- `/api/exam/candidate-attendance/route.ts`
- `/api/exam/superintendent/route.ts`

**hostel-manager/**
- `/api/hostel-manager/housekeeping-tasks/route.ts`
- `/api/hostel-manager/summary/route.ts`

**occupancy/**
- `/api/occupancy/presence-matrix/route.ts`

**oie/**
- `/api/oie/queue/route.ts`

**principal/**
- `/api/principal/dashboard/route.ts`
- `/api/principal/digest/route.ts`
- `/api/principal/retention/route.ts`

**roles-graph/**
- `/api/roles-graph/route.ts`

**students/**
- `/api/students/route.ts`

**vp/**
- `/api/vp/academics/route.ts`
- `/api/vp/dashboard/route.ts`
- `/api/vp/history/route.ts`
- `/api/vp/retention/route.ts`

</details>

### HOD (`hod`)

*Head of Department — department roster, class management, academic status flags*

- Department-scoped roster & class management: /api/classes (own department only), /api/hod/*, faculty assignments
- Academic Status Manager (/sysadmin/academic-status): set / clear SUSPENDED, DEBARRED, LATERAL_JOIN on students; year override for students studying with juniors or repeating; reason + audit trail; HOD restricted to own department
- Department analytics: attendance rate, complaints, faculty list, campus events
- Approver: department-level approvals (academics-department READ_ROLES)

<details><summary><b>API routes (38)</b></summary>

**academic-status/**
- `/api/academic-status/route.ts`

**attention/**
- `/api/attention/timeline/route.ts`

**bot/**
- `/api/bot/session/current/route.ts`

**campus/**
- `/api/campus/communities/[id]/join/route.ts`
- `/api/campus/communities/[id]/leave/route.ts`
- `/api/campus/communities/[id]/posts/route.ts`
- `/api/campus/communities/[id]/report/route.ts`
- `/api/campus/communities/[id]/route.ts`
- `/api/campus/communities/route.ts`

**caretaker/**
- `/api/caretaker/maintenance/route.ts`
- `/api/caretaker/summary/route.ts`

**classes/**
- `/api/classes/[id]/route.ts`
- `/api/classes/[id]/students/route.ts`
- `/api/classes/route.ts`

**config/**
- `/api/config/custom-reasons/[id]/route.ts`
- `/api/config/custom-reasons/route.ts`
- `/api/config/subjects/route.ts`

**departments/**
- `/api/departments/[dept]/classes/route.ts`

**exam/**
- `/api/exam/superintendent/route.ts`

**faculty/**
- `/api/faculty/attendance/route.ts`
- `/api/faculty/route.ts`

**faculty-assignments/**
- `/api/faculty-assignments/[id]/route.ts`
- `/api/faculty-assignments/route.ts`

**hod/**
- `/api/hod/dashboard/route.ts`
- `/api/hod/faculty/route.ts`
- `/api/hod/pulse/route.ts`
- `/api/hod/retention/route.ts`
- `/api/hod/schedule/route.ts`

**hostel-manager/**
- `/api/hostel-manager/housekeeping-tasks/route.ts`
- `/api/hostel-manager/summary/route.ts`

**oie/**
- `/api/oie/queue/route.ts`

**staff/**
- `/api/staff/attendance/route.ts`
- `/api/staff/my-day/route.ts`
- `/api/staff/register/route.ts`
- `/api/staff/stats/route.ts`

**students/**
- `/api/students/register/route.ts`
- `/api/students/route.ts`
- `/api/students/stats/route.ts`

</details>

### Faculty (`faculty`)

*Teaching staff — attendance, classes, students, schedule*

- Class attendance marking; my-students roster; class schedule (via class_teacher_id or faculty_assignments)
- Classes I teach, subject permissions, student directory (scoped)
- Exam duties when in approver scope; campus event attendance
- Bot: /attendance /students /schedule /classes /complaints /events

<details><summary><b>API routes (37)</b></summary>

**announcements/**
- `/api/announcements/[id]/dismiss/route.ts`
- `/api/announcements/active/route.ts`

**attendance_records/**
- `/api/attendance_records/route.ts`

**attention/**
- `/api/attention/timeline/route.ts`

**bot/**
- `/api/bot/session/current/route.ts`

**campus/**
- `/api/campus/assistant/route.ts`
- `/api/campus/communities/[id]/moderate/route.ts`
- `/api/campus/events/[id]/attend/route.ts`

**caretaker/**
- `/api/caretaker/maintenance/route.ts`
- `/api/caretaker/summary/route.ts`

**classes/**
- `/api/classes/[id]/route.ts`
- `/api/classes/[id]/students/route.ts`

**config/**
- `/api/config/subjects/route.ts`

**faculty/**
- `/api/faculty/attendance/route.ts`
- `/api/faculty/my-class/[id]/route.ts`
- `/api/faculty/my-classes/route.ts`
- `/api/faculty/route.ts`

**faculty-assignments/**
- `/api/faculty-assignments/route.ts`

**hod/**
- `/api/hod/faculty/route.ts`
- `/api/hod/pulse/route.ts`
- `/api/hod/schedule/route.ts`

**hostel-manager/**
- `/api/hostel-manager/housekeeping-tasks/route.ts`
- `/api/hostel-manager/summary/route.ts`

**occupancy/**
- `/api/occupancy/presence-matrix/route.ts`

**oie/**
- `/api/oie/queue/route.ts`

**persons/**
- `/api/persons/[uniqueId]/history/route.ts`
- `/api/persons/[uniqueId]/route.ts`
- `/api/persons/route.ts`

**staff/**
- `/api/staff/attendance/route.ts`
- `/api/staff/history/route.ts`
- `/api/staff/my-day/route.ts`
- `/api/staff/requests-status/route.ts`
- `/api/staff/stats/route.ts`

**students/**
- `/api/students/route.ts`
- `/api/students/stats/route.ts`

**support/**
- `/api/support/tickets/[id]/comments/route.ts`
- `/api/support/tickets/route.ts`

</details>

### Staff (`staff`)

*Support staff — shifts, handover, gates, occupancy, maintenance*

- Shifts, shift handover log, gate status & occupancy, alerts, announcements
- Maintenance ticket view; complaints

<details><summary><b>API routes (25)</b></summary>

**announcements/**
- `/api/announcements/[id]/dismiss/route.ts`
- `/api/announcements/active/route.ts`

**attention/**
- `/api/attention/timeline/route.ts`

**bot/**
- `/api/bot/session/current/route.ts`

**campus/**
- `/api/campus/assistant/route.ts`

**caretaker/**
- `/api/caretaker/maintenance/route.ts`
- `/api/caretaker/summary/route.ts`

**exam/**
- `/api/exam/superintendent/route.ts`

**faculty/**
- `/api/faculty/attendance/route.ts`
- `/api/faculty/route.ts`

**hod/**
- `/api/hod/faculty/route.ts`

**hostel-manager/**
- `/api/hostel-manager/housekeeping-tasks/route.ts`
- `/api/hostel-manager/summary/route.ts`

**occupancy/**
- `/api/occupancy/presence-matrix/route.ts`

**persons/**
- `/api/persons/[uniqueId]/history/route.ts`
- `/api/persons/[uniqueId]/route.ts`
- `/api/persons/route.ts`

**staff/**
- `/api/staff/attendance/route.ts`
- `/api/staff/history/route.ts`
- `/api/staff/my-day/route.ts`
- `/api/staff/requests-status/route.ts`
- `/api/staff/stats/route.ts`

**students/**
- `/api/students/stats/route.ts`

**support/**
- `/api/support/tickets/[id]/comments/route.ts`
- `/api/support/tickets/route.ts`

</details>

### Operator (`operator`)

*Gate desk — scan, lookup, manual entry, transactions, visitor log*

- Gate scanning (TIER.OPERATOR): /api/gate/scan, operator lookup, stats, manual entry, transactions
- Visitor log, shift handover, gate occupancy, gate alerts
- Attention timeline + campus live feed

<details><summary><b>API routes (49)</b></summary>

**admin/**
- `/api/admin/lockdown/route.ts`

**analytics/**
- `/api/analytics/daily/route.ts`
- `/api/analytics/occupancy/route.ts`

**announcements/**
- `/api/announcements/[id]/dismiss/route.ts`
- `/api/announcements/active/route.ts`

**attendance_records/**
- `/api/attendance_records/route.ts`

**attention/**
- `/api/attention/timeline/route.ts`

**audit/**
- `/api/audit/photo-capture/route.ts`

**bot/**
- `/api/bot/session/current/route.ts`

**campus/**
- `/api/campus/assistant/route.ts`
- `/api/campus/communities/[id]/join/route.ts`
- `/api/campus/communities/[id]/leave/route.ts`
- `/api/campus/communities/[id]/posts/route.ts`
- `/api/campus/communities/[id]/report/route.ts`
- `/api/campus/communities/[id]/route.ts`
- `/api/campus/communities/route.ts`

**caretaker/**
- `/api/caretaker/maintenance/route.ts`
- `/api/caretaker/summary/route.ts`

**gate/**
- `/api/gate/scan/route.ts`
- `/api/gate/stream/route.ts`
- `/api/gate/verify-face/route.ts`
- `/api/gate/verify-thumbprint/route.ts`

**gates/**
- `/api/gates/route.ts`
- `/api/gates/schedule/route.ts`

**hostel-manager/**
- `/api/hostel-manager/housekeeping-tasks/route.ts`
- `/api/hostel-manager/summary/route.ts`

**integrations/**
- `/api/integrations/lms/attendance/route.ts`

**occupancy/**
- `/api/occupancy/current/route.ts`
- `/api/occupancy/presence-matrix/route.ts`

**operator/**
- `/api/operator/claim-gate/route.ts`
- `/api/operator/entry-type/route.ts`
- `/api/operator/last-scan/route.ts`
- `/api/operator/lookup/route.ts`
- `/api/operator/manual-entry/route.ts`
- `/api/operator/register-thumbprint/route.ts`
- `/api/operator/stats/route.ts`
- `/api/operator/transactions/route.ts`

**passes/**
- `/api/passes/[passId]/action/route.ts`

**persons/**
- `/api/persons/[uniqueId]/history/route.ts`
- `/api/persons/[uniqueId]/route.ts`
- `/api/persons/route.ts`

**staff/**
- `/api/staff/register/route.ts`

**students/**
- `/api/students/register/route.ts`

**support/**
- `/api/support/tickets/[id]/comments/route.ts`
- `/api/support/tickets/route.ts`

**users/**
- `/api/users/me/gate/route.ts`

**visitors/**
- `/api/visitors/mine/route.ts`
- `/api/visitors/route.ts`

**voice/**
- `/api/voice/interpret/route.ts`

</details>

### Supervisor (`supervisor`)

*Campus supervisor — escalated complaints, all gates, visitor oversight*

- Escalated complaints, all gate statuses, campus occupancy, visitor logs (24h), campus events
- Supervisor queue (7 routes) and operator oversight

<details><summary><b>API routes (48)</b></summary>

**admin/**
- `/api/admin/lockdown/route.ts`

**alerts/**
- `/api/alerts/assign/route.ts`

**attendance_records/**
- `/api/attendance_records/route.ts`

**attention/**
- `/api/attention/timeline/route.ts`

**bot/**
- `/api/bot/session/current/route.ts`

**campus/**
- `/api/campus/assistant/route.ts`
- `/api/campus/communities/[id]/join/route.ts`
- `/api/campus/communities/[id]/leave/route.ts`
- `/api/campus/communities/[id]/posts/route.ts`
- `/api/campus/communities/[id]/report/route.ts`
- `/api/campus/communities/[id]/route.ts`
- `/api/campus/communities/route.ts`
- `/api/campus/events/[id]/attend/route.ts`

**caretaker/**
- `/api/caretaker/maintenance/route.ts`
- `/api/caretaker/summary/route.ts`

**emergency/**
- `/api/emergency/alerts/[id]/resolve/route.ts`

**exam/**
- `/api/exam/superintendent/route.ts`

**gate/**
- `/api/gate/stream/route.ts`

**gates/**
- `/api/gates/route.ts`

**hostel-manager/**
- `/api/hostel-manager/housekeeping-tasks/route.ts`
- `/api/hostel-manager/summary/route.ts`

**occupancy/**
- `/api/occupancy/presence-matrix/route.ts`

**operator/**
- `/api/operator/claim-gate/route.ts`
- `/api/operator/entry-type/route.ts`
- `/api/operator/last-scan/route.ts`
- `/api/operator/mode/route.ts`

**passes/**
- `/api/passes/[passId]/action/route.ts`

**persons/**
- `/api/persons/[uniqueId]/history/route.ts`

**staff/**
- `/api/staff/attendance/route.ts`
- `/api/staff/my-day/route.ts`
- `/api/staff/register/route.ts`

**students/**
- `/api/students/register/route.ts`
- `/api/students/route.ts`

**supervisor/**
- `/api/supervisor/assignees/route.ts`
- `/api/supervisor/claim-codes/route.ts`
- `/api/supervisor/dashboard/route.ts`
- `/api/supervisor/escalations/route.ts`
- `/api/supervisor/gate-live/route.ts`
- `/api/supervisor/retention/route.ts`
- `/api/supervisor/shift/route.ts`
- `/api/supervisor/team-roster/route.ts`

**visitors/**
- `/api/visitors/freeze/route.ts`

**voice/**
- `/api/voice/interpret/route.ts`

**workers/**
- `/api/workers/my-shift/route.ts`
- `/api/workers/my-work-orders/route.ts`
- `/api/workers/my-work/route.ts`
- `/api/workers/personal-history/route.ts`
- `/api/workers/shifts/route.ts`

</details>

### Student (`student`)

*Enrolled student — profile, passes, curfew, mess, complaints, exams, campus feed*

- Own profile, gate passes (apply / view / status), curfew score, mess bill & meal opt-out, complaints, exams
- Campus feed: events, announcements, live occupancy
- Shake-to-report: shaking the phone on the portal auto-files a T1 technical bug complaint
- Bot: /passes /curfew /alerts /announce /complaint /exam /mess /guardian /health

<details><summary><b>API routes (32)</b></summary>

**announcements/**
- `/api/announcements/[id]/dismiss/route.ts`
- `/api/announcements/active/route.ts`

**attention/**
- `/api/attention/timeline/route.ts`

**bot/**
- `/api/bot/session/current/route.ts`

**campus/**
- `/api/campus/assistant/route.ts`
- `/api/campus/communities/[id]/join/route.ts`
- `/api/campus/communities/[id]/leave/route.ts`
- `/api/campus/communities/[id]/moderate/route.ts`
- `/api/campus/communities/[id]/posts/route.ts`
- `/api/campus/communities/[id]/report/route.ts`
- `/api/campus/communities/[id]/route.ts`
- `/api/campus/communities/route.ts`

**caretaker/**
- `/api/caretaker/maintenance/route.ts`
- `/api/caretaker/summary/route.ts`

**config/**
- `/api/config/subjects/route.ts`

**hostel-manager/**
- `/api/hostel-manager/housekeeping-tasks/route.ts`
- `/api/hostel-manager/summary/route.ts`

**mess/**
- `/api/mess/default/route.ts`
- `/api/mess/history/route.ts`
- `/api/mess/menu/route.ts`
- `/api/mess/preference/route.ts`

**passes/**
- `/api/passes/[passId]/route.ts`

**persons/**
- `/api/persons/[uniqueId]/history/route.ts`
- `/api/persons/[uniqueId]/route.ts`

**student/**
- `/api/student/attendance-calendar/route.ts`
- `/api/student/curfew-acknowledge/route.ts`
- `/api/student/dashboard/route.ts`

**students/**
- `/api/students/[roll]/history/route.ts`
- `/api/students/[roll]/route.ts`
- `/api/students/qr-token/route.ts`

**support/**
- `/api/support/tickets/[id]/comments/route.ts`
- `/api/support/tickets/route.ts`

</details>

### Parent (`parent`)

*Parent — child gate status, curfew, exams, mess, pass requests*

- Child status: gate movement timeline, curfew compliance, upcoming exams, mess bill
- Pass requests on behalf of child; complaints; campus announcements
- /api/parents/me: open requests, last movement, next event
- Bot: /child /curfew /announce /complaint /exam /mess

<details><summary><b>API routes (24)</b></summary>

**announcements/**
- `/api/announcements/[id]/dismiss/route.ts`
- `/api/announcements/active/route.ts`

**attention/**
- `/api/attention/timeline/route.ts`

**bot/**
- `/api/bot/session/current/route.ts`

**campus/**
- `/api/campus/assistant/route.ts`
- `/api/campus/communities/[id]/join/route.ts`
- `/api/campus/communities/[id]/leave/route.ts`
- `/api/campus/communities/[id]/posts/route.ts`
- `/api/campus/communities/[id]/report/route.ts`
- `/api/campus/communities/[id]/route.ts`
- `/api/campus/communities/route.ts`

**caretaker/**
- `/api/caretaker/maintenance/route.ts`
- `/api/caretaker/summary/route.ts`

**hostel-manager/**
- `/api/hostel-manager/housekeeping-tasks/route.ts`
- `/api/hostel-manager/summary/route.ts`

**parents/**
- `/api/parents/me/route.ts`

**passes/**
- `/api/passes/[passId]/route.ts`

**persons/**
- `/api/persons/[uniqueId]/history/route.ts`
- `/api/persons/[uniqueId]/route.ts`
- `/api/persons/route.ts`

**student/**
- `/api/student/attendance-calendar/route.ts`

**students/**
- `/api/students/route.ts`

**support/**
- `/api/support/tickets/[id]/comments/route.ts`
- `/api/support/tickets/route.ts`

</details>

### Guardian (`guardian`)

*Warden/guardian — ward status, curfew compliance, guardian link verification*

- Ward status via student_details.guardian_id (the /child mapping)
- Ward's curfew compliance, exams, mess bill; complaints
- Guardian link verification flow (guardian_links.verification_status, OTP verify)

<details><summary><b>API routes (18)</b></summary>

**attention/**
- `/api/attention/timeline/route.ts`

**bot/**
- `/api/bot/session/current/route.ts`

**campus/**
- `/api/campus/assistant/route.ts`
- `/api/campus/communities/[id]/join/route.ts`
- `/api/campus/communities/[id]/leave/route.ts`
- `/api/campus/communities/[id]/posts/route.ts`
- `/api/campus/communities/[id]/report/route.ts`
- `/api/campus/communities/[id]/route.ts`
- `/api/campus/communities/route.ts`

**caretaker/**
- `/api/caretaker/maintenance/route.ts`
- `/api/caretaker/summary/route.ts`

**hostel-manager/**
- `/api/hostel-manager/housekeeping-tasks/route.ts`
- `/api/hostel-manager/summary/route.ts`

**parents/**
- `/api/parents/me/route.ts`

**persons/**
- `/api/persons/[uniqueId]/history/route.ts`
- `/api/persons/[uniqueId]/route.ts`

**student/**
- `/api/student/attendance-calendar/route.ts`

**students/**
- `/api/students/route.ts`

</details>

### Visitor (`visitor`)

*Campus visitor — pass lifecycle, check-in/out, campus feed*

- Visitor pass lifecycle: check-in / check-out, pass status, QR verification
- Campus feed (announcements, events, occupancy)

<details><summary><b>API routes (11)</b></summary>

**attention/**
- `/api/attention/timeline/route.ts`

**bot/**
- `/api/bot/session/current/route.ts`

**caretaker/**
- `/api/caretaker/maintenance/route.ts`
- `/api/caretaker/summary/route.ts`

**hostel-manager/**
- `/api/hostel-manager/housekeeping-tasks/route.ts`
- `/api/hostel-manager/summary/route.ts`

**occupancy/**
- `/api/occupancy/presence-matrix/route.ts`

**visitors/**
- `/api/visitors/me/check-in/route.ts`
- `/api/visitors/me/check-out/route.ts`
- `/api/visitors/mine/route.ts`
- `/api/visitors/route.ts`

</details>

### Worker (`worker`)

*Field worker — task/attention items, campus feed*

- Field-task / attention items, worker-scoped listings
- Campus feed + announcements

<details><summary><b>API routes (14)</b></summary>

**attention/**
- `/api/attention/timeline/route.ts`

**bot/**
- `/api/bot/session/current/route.ts`

**campus/**
- `/api/campus/assistant/route.ts`

**caretaker/**
- `/api/caretaker/maintenance/route.ts`
- `/api/caretaker/summary/route.ts`

**hostel-manager/**
- `/api/hostel-manager/housekeeping-tasks/route.ts`
- `/api/hostel-manager/summary/route.ts`

**occupancy/**
- `/api/occupancy/presence-matrix/route.ts`

**persons/**
- `/api/persons/[uniqueId]/history/route.ts`
- `/api/persons/[uniqueId]/route.ts`

**workers/**
- `/api/workers/my-shift/route.ts`
- `/api/workers/my-work-orders/route.ts`
- `/api/workers/my-work/route.ts`
- `/api/workers/personal-history/route.ts`

</details>

### Caretaker (`caretaker`)

*Building caretaker — maintenance queue, blocks, visitor log*

- Maintenance ticket queue (/api/caretaker/maintenance) and building summary (/api/caretaker/summary)
- Gate status, occupancy, visitor log, alerts, announcements

<details><summary><b>API routes (9)</b></summary>

**attention/**
- `/api/attention/timeline/route.ts`

**bot/**
- `/api/bot/session/current/route.ts`

**caretaker/**
- `/api/caretaker/maintenance/route.ts`
- `/api/caretaker/summary/route.ts`

**exam/**
- `/api/exam/superintendent/route.ts`

**hostel-manager/**
- `/api/hostel-manager/housekeeping-tasks/route.ts`
- `/api/hostel-manager/summary/route.ts`

**occupancy/**
- `/api/occupancy/presence-matrix/route.ts`

**workers/**
- `/api/workers/shifts/route.ts`

</details>

### Deputy Warden (`deputy_warden`)

*Hostel deputy — delegation, hostel tickets*

- Hostel delegation (/api/deputy-warden/delegation — READ_ROLES: deputy_warden/admin/sysadmin)
- Hostel ticket queue; 11 dedicated hostel-management pages

<details><summary><b>API routes (8)</b></summary>

**attention/**
- `/api/attention/timeline/route.ts`

**bot/**
- `/api/bot/session/current/route.ts`

**caretaker/**
- `/api/caretaker/maintenance/route.ts`
- `/api/caretaker/summary/route.ts`

**exam/**
- `/api/exam/superintendent/route.ts`

**hostel-manager/**
- `/api/hostel-manager/housekeeping-tasks/route.ts`
- `/api/hostel-manager/summary/route.ts`

**occupancy/**
- `/api/occupancy/presence-matrix/route.ts`

</details>

### Hostel Manager (`hostel_manager`)

*Hostel operations — occupancy, blocks, curfew violations, housekeeping*

- Hostel occupancy, block status, curfew violations (24h), hostel gate scans
- Housekeeping tasks, hostel tickets
- TIER.APPROVER member: hostel approvals

<details><summary><b>API routes (8)</b></summary>

**attention/**
- `/api/attention/timeline/route.ts`

**bot/**
- `/api/bot/session/current/route.ts`

**caretaker/**
- `/api/caretaker/maintenance/route.ts`
- `/api/caretaker/summary/route.ts`

**exam/**
- `/api/exam/superintendent/route.ts`

**hostel-manager/**
- `/api/hostel-manager/housekeeping-tasks/route.ts`
- `/api/hostel-manager/summary/route.ts`

**occupancy/**
- `/api/occupancy/presence-matrix/route.ts`

</details>

### OIE (`oie`)

*Examination office — exam queue, access & exceptions, candidate attendance*

- Examination queue (/api/oie/queue; VIEW_ROLES incl. hod, faculty, principal)
- Exam access + exceptions with exam_branch / exam_superintendent / vice_principal / principal
- Candidate attendance; 20 exam-office pages shared with the exam office

<details><summary><b>API routes (15)</b></summary>

**attention/**
- `/api/attention/timeline/route.ts`

**bot/**
- `/api/bot/session/current/route.ts`

**caretaker/**
- `/api/caretaker/maintenance/route.ts`
- `/api/caretaker/summary/route.ts`

**config/**
- `/api/config/custom-reasons/[id]/route.ts`
- `/api/config/custom-reasons/route.ts`

**exam/**
- `/api/exam/access-exceptions/route.ts`
- `/api/exam/access/route.ts`
- `/api/exam/candidate-attendance/route.ts`
- `/api/exam/superintendent/route.ts`

**gate/**
- `/api/gate/stream/route.ts`

**hostel-manager/**
- `/api/hostel-manager/housekeeping-tasks/route.ts`
- `/api/hostel-manager/summary/route.ts`

**occupancy/**
- `/api/occupancy/presence-matrix/route.ts`

**oie/**
- `/api/oie/queue/route.ts`

</details>

### Exam Branch (`exam_branch`)

*Exam office branch — exam access, exceptions, candidate attendance*

- Exam access management + exceptions, candidate attendance
- 20 exam-office pages shared with OIE / vice principal / exam superintendent

<details><summary><b>API routes (11)</b></summary>

**attention/**
- `/api/attention/timeline/route.ts`

**bot/**
- `/api/bot/session/current/route.ts`

**caretaker/**
- `/api/caretaker/maintenance/route.ts`
- `/api/caretaker/summary/route.ts`

**exam/**
- `/api/exam/access-exceptions/route.ts`
- `/api/exam/access/route.ts`
- `/api/exam/superintendent/route.ts`

**hostel-manager/**
- `/api/hostel-manager/housekeeping-tasks/route.ts`
- `/api/hostel-manager/summary/route.ts`

**occupancy/**
- `/api/occupancy/presence-matrix/route.ts`

**oie/**
- `/api/oie/queue/route.ts`

</details>

### Exam Superintendent (`exam_superintendent`)

*Exam authority — superintendent console, exam access*

- Exam superintendent console (/api/exam/superintendent, TIER.APPROVER)
- Exam access authority; exception handling; exam-day console

<details><summary><b>API routes (10)</b></summary>

**attention/**
- `/api/attention/timeline/route.ts`

**bot/**
- `/api/bot/session/current/route.ts`

**caretaker/**
- `/api/caretaker/maintenance/route.ts`
- `/api/caretaker/summary/route.ts`

**exam/**
- `/api/exam/access-exceptions/route.ts`
- `/api/exam/access/route.ts`
- `/api/exam/superintendent/route.ts`

**hostel-manager/**
- `/api/hostel-manager/housekeeping-tasks/route.ts`
- `/api/hostel-manager/summary/route.ts`

**occupancy/**
- `/api/occupancy/presence-matrix/route.ts`

</details>

### Mess Incharge (`mess_incharge`)

*Mess/dining — full mess console: menu, tokens, consumption, service*

- Full mess console (TIER.MESS_INCHARGE): mess days, menu items, inventory, meal counts, consumption, serve, operational requests, arrivals, analytics, attendance
- Mess token issuance & revocation (/api/mess/token/[code])

<details><summary><b>API routes (19)</b></summary>

**attention/**
- `/api/attention/timeline/route.ts`

**bot/**
- `/api/bot/session/current/route.ts`

**caretaker/**
- `/api/caretaker/maintenance/route.ts`
- `/api/caretaker/summary/route.ts`

**hostel-manager/**
- `/api/hostel-manager/housekeeping-tasks/route.ts`
- `/api/hostel-manager/summary/route.ts`

**mess/**
- `/api/mess/analytics/route.ts`
- `/api/mess/arrivals/route.ts`
- `/api/mess/attendance/route.ts`
- `/api/mess/consumption/route.ts`
- `/api/mess/days/route.ts`
- `/api/mess/inventory/route.ts`
- `/api/mess/issues/route.ts`
- `/api/mess/meal-counts/route.ts`
- `/api/mess/menu-items/route.ts`
- `/api/mess/menu/route.ts`
- `/api/mess/operational-requests/route.ts`
- `/api/mess/serve/route.ts`
- `/api/mess/token/[code]/route.ts`

</details>

### EMO (`emo`)

*Environmental & safety officer — safety/environmental compliance*

- Environmental & safety officer console (1 dedicated page)
- Safety / environmental compliance monitoring

<details><summary><b>API routes (0)</b></summary>

</details>

### Hostel (legacy) (`hostel`)

*Legacy warden role — folded into Principal (consolidation 2026-11); approver-surface compat only*

- Legacy role — folded into principal (warden consolidation, migration 20261125000001)
- Still recognized only for approver-surface compatibility

<details><summary><b>API routes (0)</b></summary>

</details>

## Cross-role security guarantees

- **HOD scope lock**: HOD APIs read/write only their own department (enforced server-side: `auth.departmentId` must match; 403 otherwise).
- **Parent scope lock**: parents see only their linked children (`parentId` must equal `auth.userId` unless admin).
- **Faculty scope lock**: faculty see only students in their assigned classes (via `class_teacher_id` or `faculty_assignments`).
- **Guardian mapping**: wards resolved through `student_details.guardian_id`, not a guessed link table.
- **RLS on `users`**: specific `users_gate_app_select/update/insert` policies; the broad write policy is the intentional app-role boundary; `relrowsecurity = on` verified on the `users` table.
- **Telegram bot**: `/verify` is scoped to the sender's linked account only (no code enumeration); `/link` requires an explicit `confirm` flag before storing the binding; cross-account theft tests all passed (13-point attack simulation).
- **Suspended / debarred students**: `users.flag_status` is set alongside `academic_status`, so the gate scanner and RLS policies treat them as flagged automatically.

## Telegram bot commands by role

| Role | Commands |
|---|---|
| student | /passes /curfew /alerts /announce /complaint /exam /mess /guardian /health |
| faculty | /attendance /students /schedule /alerts /announce /classes /complaints /events |
| staff | /shifts /gates /occupancy /alerts /announce /handover /maintenance |
| parent | /child /curfew /announce /complaint /exam /mess |
| guardian | /child /curfew /announce /complaint /exam |
| hod | /dept /attendance /alerts /complaints /announce /faculty /events |
| principal | /campus /attendance /alerts /complaints /occupancy /announce /events /delegation |
| vice_principal | (same as principal + exam duties) |
| operator | /gates /occupancy /alerts /announce /handover /visitor |
| supervisor | /gates /alerts /occupancy /complaints /announce /visitor /events |
| hostel_manager | /occupancy /curfew /gates /alerts /announce /blocks /handover |
| caretaker | /gates /occupancy /alerts /announce /maintenance /visitor |
| admin | /campus /users /gates /alerts /complaints /occupancy /announce /events /backup |
| sysadmin | admin set + /bot /audit |
| oie / exam office | /exam (shared exam surface) |

All roles also get: `/help` (role-aware menu), `/status` (account + academic status + flag), `/menu` (inline keyboard), `/link`, `/cancel`.

---
*Regenerate this doc when roles change: `grep -rn requiredRole src/app/api` and re-run the analysis script that produced `docs/ROLE_OPERATIONS.md`.*

---

## Entity-aligned operational model

The role permissions above are the generic authorization map. For JNTUH CEJ
specifically — how each role maps to the college's actual administrative
entities (5 engineering departments, hostel block system, examination
branch desks, mess committee) and the hierarchy controls that bind them —
see **`docs/JNTUH_CEJ_ROLE_HIERARCHY.md`**.

Key differences from the generic model:

- **Exam branch split** — one `exam_branch` role becomes four desks:
  `controller_examinations`, `addl_controller_academic`,
  `addl_controller_results`, `addl_controller_automation`. Separation of
  duties: no single desk can enter AND publish a result.
- **Hostel re-cast** — `warden` consolidated into `principal` (Chief
  Warden). `hostel_manager` is one per college/unit; `deputy_warden` is
  block-scoped (2 boys + 2 girls blocks).
- **New `dean` role** — Associate Dean (Academics) and Associate Dean
  (Student Affairs); required for the two-person DEBARRED/SUSPENDED
  approval rule.
- **Hostel leave gate chain** — gate pass valid only when Deputy Warden
  approval + parent acknowledgement are both present; missing link =
  PENDING, override = Supervisor + audit reason.
- **HOD scope extended** — covers science/HSS HODs (Physics, Chemistry,
  Math, English), not just the 5 engineering departments.

## Related documents

- **`docs/JNTUH_CEJ_ROLE_HIERARCHY.md`** — entity-aligned operational
  model: how each role maps to JNTUH CEJ's actual administrative entities
  (5 engineering departments, hostel blocks, exam branch desks, mess
  committee) and the hierarchy controls that bind them.
- **`docs/AUTONOMOUS_OPERATIONS.md`** — automation and resilience layer:
  the control loops, agentic layer, HA requirements, and 30/60/90
  sequence that make the system run without a human at the keyboard for
  every event.

## Related documents

- **`docs/JNTUH_CEJ_ROLE_HIERARCHY.md`** — entity-aligned operational model:
  how each role maps to JNTUH CEJ's actual administrative entities (5
  engineering departments, hostel blocks, exam branch desks, mess
  committee) and the hierarchy controls that bind them.
- **`docs/AUTONOMOUS_OPERATIONS.md`** — automation and resilience layer:
  control loops, agentic layer, HA requirements, and 30/60/90 sequence
  that make the system run without a human at the keyboard for every event.
- **`docs/ROLE_EVOLUTION_2030.md`** — time-lapse evolution plan
  (Phase 0–3, now → 2030): how the role hierarchy gets more precisely
  enforced as bounded agents take over steady-state operations.
- **`docs/IMPLEMENTATION_BLUEPRINT.md`** — the full build order from
  baseline audit through database foundation, role split, missing
  operations, enforcement wiring, bounded agents, self-healing loops,
  and long-term governance.

## Shipped in the autonomous build (commit 1ace14d7 → 7094367c, 2026-11-17)

The sections above were generated from the pre-build surface (270 routes, 23 roles). 
Everything below is new since then: 29 roles, +46 API routes, 6 bounded agents, 
the two-person academic-status flow, and the tamper-evident audit chain. 
All of it is live on gate_monitor; migrations 20270114–20270117 applied.


### Two-person academic status (HOD flags → Dean/Principal approves)

- `/api/academic-status/pending` — GET, POST — roles: 

### Faculty operations (3.2)

- `/api/faculty/marks` — GET, POST — roles: faculty, hod, admin, sysadmin
- `/api/faculty/marks/submit` — POST — roles: faculty, hod
- `/api/faculty/marks/correct` — POST — roles: addl_controller_academic, admin, sysadmin
- `/api/faculty/assignments` — GET, POST — roles: faculty, student, hod, admin, sysadmin
- `/api/faculty/materials` — GET, POST — roles: faculty, student, parent, guardian, hod, admin, sysadmin
- `/api/faculty/mentees` — GET — roles: faculty, hod, admin, sysadmin
- `/api/faculty/internal-exam/propose` — POST — roles: faculty

### HOD operations (3.3)

- `/api/hod/exam-review` — GET, POST — roles: hod, controller_examinations, admin, sysadmin

### Gate operator / supervisor (3.4)

- `/api/supervisor/visitors/overstay` — GET — roles: supervisor, admin, sysadmin
- `/api/supervisor/visitors/watchlist` — GET, POST — roles: supervisor, admin, sysadmin
- `/api/operator/gate/device-health` — POST — roles: operator, supervisor, admin, sysadmin
- `/api/operator/passes/batch-verify` — POST — roles: operator, supervisor, admin, sysadmin
- `/api/gate/verify-leave-chain` — GET — roles: operator, supervisor, admin, sysadmin

### Mess incharge (3.5)

- `/api/mess/reconcile` — GET, POST — roles: mess_incharge, admin, sysadmin
- `/api/mess/tokens/anomaly` — GET — roles: mess_incharge, admin, sysadmin
- `/api/mess/bills` — GET — roles: mess_incharge, admin, sysadmin

### Exam branch desks (3.6)

- `/api/exam/eligibility-rules` — GET, POST — roles: controller_examinations, oie, exam_branch, admin, sysadmin
- `/api/exam/hall-tickets/generate` — POST — roles: addl_controller_automation, exam_branch, admin, sysadmin
- `/api/exam/results/process` — POST — roles: addl_controller_results, admin, sysadmin
- `/api/exam/results/publish` — POST — roles: controller_examinations, admin, sysadmin

### Hostel (3.7)

- `/api/hostel-manager/rooms/allot` — POST — roles: hostel_manager, deputy_warden, chief_warden, admin, sysadmin
- `/api/hostel-manager/incidents` — GET, POST — roles: hostel_manager, deputy_warden, chief_warden, principal, admin, sysadmin
- `/api/hostel-manager/incidents/[id]/escalate` — POST — roles: chief_warden, principal, admin, sysadmin

### Parent / guardian (3.8)

- `/api/parent/leave/acknowledge` — POST — roles: parent, guardian, admin, sysadmin
- `/api/guardian/links/reverify` — POST — roles: guardian, parent, admin, sysadmin

### Student self-service (3.1)

- `/api/student/fees` — GET — roles: student, parent, guardian, admin, sysadmin
- `/api/student/marks` — GET — roles: student, parent, guardian, hod, admin, sysadmin
- `/api/student/library` — GET — roles: student, admin, sysadmin
- `/api/student/scholarships` — GET — roles: student, parent, guardian, admin, sysadmin

### Admin / sysadmin (3.9)

- `/api/admin/roles/delegate` — GET, POST — roles: admin, sysadmin
- `/api/sysadmin/rls/drift` — GET — roles: sysadmin
- `/api/sysadmin/bot/anomaly` — GET, POST — roles: sysadmin, admin
- `/api/sysadmin/approvals/two-person` — GET, POST — roles: sysadmin, admin
- `/api/delegations/graph` — GET — roles: admin, sysadmin, principal, dean

### Bounded agents (STEP 5–6, cron, x-cron-secret)

| Endpoint | Schedule | Bounded to | Function |
|---|---|---|---|
| `/api/cron/gate-reconcile` | */5 | operator | auto-resolve unmatched manual gate scans or prepare operator prompts |
| `/api/cron/mess-reconcile` | 05:00 | mess_incharge | hash-chained ledger: issued vs consumed vs boarders; anomaly blocks service |
| `/api/cron/complaint-triage` | */30 | supervisor | categorize, route, duplicate-flag, SLA-escalate open complaints |
| `/api/cron/exam-eligibility-manifest` | 22:00 | oie | precompute + Ed25519-sign candidate eligibility for exam day |
| `/api/cron/leave-chain` | */30 | deputy_warden | TTL reminders/escalations/auto-expiry on the hostel leave chain; issues gate token |
| `/api/cron/audit-chain` | 02:00 | sysadmin | tamper-evident SHA256 chain over audit_events; broken link → critical alert |
| `/api/cron/birthday-check` | 00:30 | system | personal in-app + Telegram birthday notification, once per year per user |

### New roles (29 total, all in users.role CHECK + registry)

| Role | JNTUH CEJ desk | Primary new surface |
|---|---|---|
| `dean` | Associate Dean (Academics / Student Affairs) | two-person approver, /api/academic-status/pending |
| `chief_warden` | Role context for the Principal when acting on hostel matters (not a separate account) | /api/hostel-manager/incidents/[id]/escalate, menu-committee approvals |
| `controller_examinations` | Controller of Examinations | /api/exam/results/publish, eligibility-rules owner |
| `addl_controller_academic` | Addl. Controller (Academic) | /api/faculty/marks/correct (only role that may fix locked marks) |
| `addl_controller_results` | Addl. Controller (Results) | /api/exam/results/process — processes, never publishes |
| `addl_controller_automation` | Addl. Controller (Automation) | /api/exam/hall-tickets/generate |

### Related docs (all in this commit chain)
- `docs/JNTUH_CEJ_ROLE_HIERARCHY.md` — entity model + 7 hierarchy controls
- `docs/AUTONOMOUS_OPERATIONS.md` — control loops, threats, HA requirements
- `docs/ROLE_EVOLUTION_2030.md` — Phase 0–3 time-lapse plan
- `docs/IMPLEMENTATION_BLUEPRINT.md` — STEP 0–7 build order + live status table
