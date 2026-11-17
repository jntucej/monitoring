# Role Operations Reference (GATE Monitor)

Authoritative map of every API route and which roles can reach it. 
All 583 routes across 27 active roles — regenerated from the live route tree on 2026-11-17 
(commit c2c32b14). Every tally in this doc is reproducible with one command; 
the regeneration notes are at the end.

## How role access works

- **APIs**: every route declares `requiredRole` (enforced by `withAuthorization`). 
  Gates come in three shapes: inline role lists (306 routes), tier constants 
  like `TIER.APPROVER` (19 routes, resolved against `src/server/policy/roles.ts`), 
  and local `const X_ROLES: Role[]` definitions (6 routes). This doc resolves all 
  three — no route is counted by one gate kind and missed by another.
- **UI**: pages wrap content in `<AuthGuard allowedRoles={...}>`; unauthorized roles see 403.
- **Postgres RLS**: `gate_app` sees only the rows its policies allow (students see themselves; 
  faculty see their classes; HODs see their department; admin/sysadmin see everything).
- **Tiers** (`src/server/policy/roles.ts`): APPROVER · OPERATOR · ADMIN · SYSADMIN · MESS_INCHARGE · APP.
- **Delegation-aware**: since STEP 4.1, `withAuthorization` resolves the caller's *effective* role — 
  the native role first, then any active, unexpired, non-revoked delegation whose role grant 
  covers the requested role. Delegation IDs are recorded in `audit_events`.
- **Academic status**: `student_details.academic_status` ∈ {SUSPENDED, DEBARRED, LATERAL_JOIN} + 
  `year_override`. HOD flags park in `pending_approvals`; Dean/Principal/VP approve via 
  `/api/academic-status/pending`. DEBARRED blocks gate + exams until approved.

## Roles at a glance

| Tier | Roles | Count | Notes |
|---|---|---|---|
| SYSADMIN | sysadmin | 1 | Full control; MFA gate; backup/restore; RLS audit; break-glass |
| ADMIN | admin | 1 | User governance; device config; all operational read |
| APPROVER | principal, vice_principal, exam_branch, oie, hostel_manager, deputy_warden, caretaker, hod, staff, supervisor, exam_superintendent | 11 | Approval surfaces; entity-scoped |
| OPERATOR | operator, principal, admin, sysadmin | 4 | Gate scanning; manual entry; transactions |
| MESS_INCHARGE | mess_incharge, principal, admin, sysadmin | 4 | Mess console |
| APP (all interactive) | 21 roles incl. student, parent, guardian, visitor, worker | 21 | Any authenticated user |
| Entity-aligned (new) | dean, chief_warden (= principal context), controller_examinations, addl_controller_academic, addl_controller_results, addl_controller_automation | 6 | JNTUH CEJ desks |

> **Note on `chief_warden`:** this is a *role context*, not a separate account. 
The Chief Warden is the Principal — one person. When the Principal acts on hostel 
matters the audit trail logs `role_context='chief_warden'` so hostel actions are 
auditable separately from general principal actions. No distinct user carries this string.
>
> **Legacy keys with zero routes:** `warden` (folded into principal by migration 20261125000001), 
`emo`, `hostel` (legacy compat — approver surface only, no dedicated routes).

---

## Per-role operations

### Sysadmin (`sysadmin`) — 318 routes

**`/api/academic-status/*`** (2)

- `/api/academic-status` — GET POST (rate-limited)
- `/api/academic-status/pending` — GET POST (rate-limited)

**`/api/admin/*`** (111)

- `/api/admin/access/overview` — GET (rate-limited)
- `/api/admin/achievements/verify` — POST
- `/api/admin/alerts` — GET POST
- `/api/admin/alerts/overview` — GET (rate-limited)
- `/api/admin/alerts/rules` — GET PATCH POST
- `/api/admin/alerts/runbooks/overview` — GET (rate-limited)
- `/api/admin/alerts/safety/overview` — GET (rate-limited)
- `/api/admin/alerts/stream` — GET (rate-limited)
- `/api/admin/analytics/users/engagement` — GET
- `/api/admin/analytics/users/inactive` — GET
- `/api/admin/analytics/users/trends` — GET
- `/api/admin/announcements` — GET POST (rate-limited)
- `/api/admin/announcements/[id]` — DELETE GET PATCH (rate-limited)
- `/api/admin/audit` — GET (rate-limited)
- `/api/admin/audit-logs` — GET (rate-limited)
- `/api/admin/automation/deployments/overview` — GET (rate-limited)
- `/api/admin/automation/jobs/overview` — GET (rate-limited)
- `/api/admin/automation/maintenance/overview` — GET (rate-limited)
- `/api/admin/backup` — GET POST (rate-limited)
- `/api/admin/backup/stats` — GET
- `/api/admin/backup/verify` — GET POST
- `/api/admin/compliance/anonymize` — POST
- `/api/admin/compliance/export` — POST
- `/api/admin/consent/stats` — GET
- `/api/admin/data/overview` — GET (rate-limited)
- `/api/admin/deployments` — POST
- `/api/admin/deployments/overview` — GET (rate-limited)
- `/api/admin/device-settings` — GET (rate-limited)
- `/api/admin/digital-twin` — GET
- `/api/admin/disk-status` — GET
- `/api/admin/exceptions` — GET (rate-limited)
- `/api/admin/export` — GET POST
- `/api/admin/gate-device-configuration` — GET (rate-limited)
- `/api/admin/gates` — GET POST (rate-limited)
- `/api/admin/gates/[id]` — GET PATCH (rate-limited)
- `/api/admin/gates/[id]/metrics` — GET (rate-limited)
- `/api/admin/gates/devices/overview` — GET (rate-limited)
- `/api/admin/gates/schedule` — GET PATCH POST (rate-limited)
- `/api/admin/governance/audit/overview` — GET (rate-limited)
- `/api/admin/governance/compliance/overview` — GET (rate-limited)
- `/api/admin/health/full` — GET
- `/api/admin/health/overview` — GET (rate-limited)
- `/api/admin/identity/people/overview` — GET (rate-limited)
- `/api/admin/institutional-configuration` — GET (rate-limited)
- `/api/admin/jobs` — GET
- `/api/admin/jobs/[id]` — PATCH
- `/api/admin/jobs/[id]/run` — POST
- `/api/admin/jobs/overview` — GET (rate-limited)
- `/api/admin/kb/documents` — POST
- `/api/admin/kiosk` — GET PATCH (rate-limited)
- `/api/admin/ldap/sync` — POST
- `/api/admin/lockdown` — DELETE GET POST (rate-limited)
- `/api/admin/lockdown/stream` — GET
- `/api/admin/maintenance/overview` — GET (rate-limited)
- `/api/admin/monitoring` — GET (rate-limited)
- `/api/admin/monitoring/health/overview` — GET (rate-limited)
- `/api/admin/notification-settings` — GET (rate-limited)
- `/api/admin/overview` — GET (rate-limited)
- `/api/admin/people/[id]` — GET (rate-limited)
- `/api/admin/people/overview` — GET (rate-limited)
- `/api/admin/permission-policies` — GET (rate-limited)
- `/api/admin/platform/feature-flags/overview` — GET (rate-limited)
- `/api/admin/platform/integrations/overview` — GET (rate-limited)
- `/api/admin/platform/notifications/overview` — GET (rate-limited)
- `/api/admin/platform/reasons/overview` — GET (rate-limited)
- `/api/admin/platform/system/overview` — GET (rate-limited)
- `/api/admin/platform/webhooks/overview` — GET (rate-limited)
- `/api/admin/promotions/overview` — GET (rate-limited)
- `/api/admin/reference/departments/overview` — GET (rate-limited)
- `/api/admin/reference/hostel-tickets/overview` — GET (rate-limited)
- `/api/admin/reports` — GET POST
- `/api/admin/retention-policies` — GET PATCH
- `/api/admin/retention/run` — POST
- `/api/admin/role-requests` — GET POST (rate-limited)
- `/api/admin/role-requests/[id]` — PATCH
- `/api/admin/roles/delegate` — GET POST
- `/api/admin/safety/overview` — GET (rate-limited)
- `/api/admin/scheduled-jobs` — GET
- `/api/admin/scheduling` — GET POST
- `/api/admin/scheduling/apply` — POST
- `/api/admin/scheduling/suggestions` — GET
- `/api/admin/security/ip-allowlist` — POST
- `/api/admin/security/lockout` — GET POST (rate-limited)
- `/api/admin/security/password-policy` — GET PATCH (rate-limited)
- `/api/admin/security/stats` — GET
- `/api/admin/sessions` — GET
- `/api/admin/sessions/[id]` — DELETE
- `/api/admin/sessions/revoke-all` — POST
- `/api/admin/sms/compose` — POST
- `/api/admin/sms/queue` — GET
- `/api/admin/sms/queue/[id]` — DELETE GET
- `/api/admin/sms/queue/[id]/retry` — POST
- `/api/admin/sms/stats` — GET
- `/api/admin/sms/templates` — GET
- `/api/admin/sms/templates/[code]` — GET PATCH
- `/api/admin/support/metrics` — GET
- `/api/admin/support/tickets` — GET (rate-limited)
- `/api/admin/support/tickets/[id]` — PATCH
- `/api/admin/support/tickets/[id]/comments` — GET POST (rate-limited)
- `/api/admin/sustainability` — GET
- `/api/admin/sustainability/history` — GET
- `/api/admin/tables` — GET
- `/api/admin/ueba` — GET POST
- `/api/admin/users` — GET POST (rate-limited)
- `/api/admin/users/[id]` — GET PATCH (rate-limited)
- `/api/admin/users/[id]/enrollment-code` — POST
- `/api/admin/users/[id]/mobile-enrollment` — POST
- `/api/admin/users/[id]/roles` — GET POST
- `/api/admin/users/enrollment-codes` — GET
- `/api/admin/users/enrollment-codes/[id]` — DELETE
- `/api/admin/workflow-configuration` — GET (rate-limited)

**`/api/alerts/*`** (2)

- `/api/alerts/[id]` — PATCH
- `/api/alerts/assign` — POST (rate-limited)

**`/api/analytics/*`** (20)

- `/api/analytics/advanced` — GET
- `/api/analytics/daily` — GET
- `/api/analytics/daily-stats` — GET
- `/api/analytics/enhanced` — GET (rate-limited)
- `/api/analytics/export` — GET
- `/api/analytics/occupancy` — GET
- `/api/analytics/occupancy/retrain` — POST
- `/api/analytics/predictions` — GET
- `/api/analytics/predictions/history` — GET
- `/api/analytics/predictions/retrain` — POST
- `/api/analytics/reports` — GET POST
- `/api/analytics/reports/[id]` — DELETE
- `/api/analytics/reports/[id]/run` — POST
- `/api/analytics/sustainability` — GET (rate-limited)
- `/api/analytics/sustainability/retrain` — POST
- `/api/analytics/traffic` — GET (rate-limited)
- `/api/analytics/traffic/retrain` — POST
- `/api/analytics/visitors` — GET
- `/api/analytics/webhooks` — GET (rate-limited)
- `/api/analytics/webhooks/retrain` — POST

**`/api/announcements/*`** (2)

- `/api/announcements/[id]/dismiss` — POST
- `/api/announcements/active` — GET

**`/api/approver/*`** (1)

- `/api/approver/academics-department` — GET PATCH

**`/api/attendance_records/*`** (1)

- `/api/attendance_records` — GET POST (rate-limited)

**`/api/attention/*`** (1)

- `/api/attention/queue` — GET (rate-limited)

**`/api/audit/*`** (1)

- `/api/audit/photo-capture` — POST

**`/api/bot/*`** (1)

- `/api/bot/telegram-sync` — GET POST (rate-limited)

**`/api/campus/*`** (2)

- `/api/campus/assistant` — POST
- `/api/campus/communities/[id]/moderate` — POST

**`/api/classes/*`** (3)

- `/api/classes` — GET POST (rate-limited)
- `/api/classes/[id]` — GET PATCH (rate-limited)
- `/api/classes/[id]/students` — GET (rate-limited)

**`/api/config/*`** (4)

- `/api/config/custom-reasons` — GET POST (rate-limited)
- `/api/config/custom-reasons/[id]` — DELETE PATCH
- `/api/config/student-rules` — GET POST PUT (rate-limited)
- `/api/config/subjects` — GET (rate-limited)

**`/api/dashboard/*`** (1)

- `/api/dashboard/hostel` — GET (rate-limited)

**`/api/delegations/*`** (1)

- `/api/delegations/graph` — GET (rate-limited)

**`/api/departments/*`** (2)

- `/api/departments` — DELETE GET PATCH POST
- `/api/departments/[dept]/classes` — GET (rate-limited)

**`/api/deployment/*`** (1)

- `/api/deployment/logs` — GET (rate-limited)

**`/api/dev/*`** (1)

- `/api/dev/contact` — GET POST (rate-limited)

**`/api/emergency/*`** (2)

- `/api/emergency/alerts/[id]/acknowledge` — PATCH
- `/api/emergency/alerts/[id]/resolve` — PATCH

**`/api/exam/*`** (7)

- `/api/exam/access` — GET POST (rate-limited)
- `/api/exam/access-exceptions` — GET PATCH POST (rate-limited)
- `/api/exam/candidate-attendance` — GET (rate-limited)
- `/api/exam/eligibility-rules` — GET POST (rate-limited)
- `/api/exam/hall-tickets/generate` — POST (rate-limited)
- `/api/exam/results/process` — POST (rate-limited)
- `/api/exam/results/publish` — POST (rate-limited)

**`/api/faculty/*`** (7)

- `/api/faculty` — GET (rate-limited)
- `/api/faculty/assignments` — GET POST (rate-limited)
- `/api/faculty/attendance` — GET
- `/api/faculty/marks` — GET POST (rate-limited)
- `/api/faculty/marks/correct` — POST
- `/api/faculty/materials` — GET POST (rate-limited)
- `/api/faculty/mentees` — GET (rate-limited)

**`/api/faculty-assignments/*`** (2)

- `/api/faculty-assignments` — GET POST (rate-limited)
- `/api/faculty-assignments/[id]` — DELETE

**`/api/feedback/*`** (1)

- `/api/feedback` — GET POST (rate-limited)

**`/api/gate/*`** (6)

- `/api/gate/devices` — GET (rate-limited)
- `/api/gate/scan` — POST (rate-limited)
- `/api/gate/stream` — GET
- `/api/gate/verify-face` — POST
- `/api/gate/verify-leave-chain` — GET (rate-limited)
- `/api/gate/verify-thumbprint` — POST

**`/api/gates/*`** (4)

- `/api/gates` — DELETE GET PATCH POST (rate-limited)
- `/api/gates/[id]` — DELETE PATCH
- `/api/gates/schedule` — GET POST
- `/api/gates/schedule/[id]` — DELETE PUT

**`/api/guardian/*`** (1)

- `/api/guardian/links/reverify` — POST

**`/api/hod/*`** (6)

- `/api/hod/dashboard` — GET
- `/api/hod/exam-review` — GET POST (rate-limited)
- `/api/hod/faculty` — GET (rate-limited)
- `/api/hod/pulse` — GET
- `/api/hod/retention` — GET
- `/api/hod/schedule` — GET

**`/api/hostel-manager/*`** (3)

- `/api/hostel-manager/incidents` — GET POST (rate-limited)
- `/api/hostel-manager/incidents/[id]/escalate` — POST
- `/api/hostel-manager/rooms/allot` — POST (rate-limited)

**`/api/integrations/*`** (9)

- `/api/integrations` — GET POST PUT
- `/api/integrations/[id]` — PATCH
- `/api/integrations/[id]/sync` — POST
- `/api/integrations/lms/attendance` — POST
- `/api/integrations/lms/configure` — POST
- `/api/integrations/lms/status` — GET
- `/api/integrations/lms/sync` — POST
- `/api/integrations/logs` — GET
- `/api/integrations/test` — POST

**`/api/mess/*`** (17)

- `/api/mess/analytics` — GET (rate-limited)
- `/api/mess/arrivals` — GET POST (rate-limited)
- `/api/mess/attendance` — GET (rate-limited)
- `/api/mess/bills` — GET (rate-limited)
- `/api/mess/consumption` — GET (rate-limited)
- `/api/mess/days` — GET POST (rate-limited)
- `/api/mess/inventory` — GET (rate-limited)
- `/api/mess/issues` — GET POST (rate-limited)
- `/api/mess/meal-counts` — GET (rate-limited)
- `/api/mess/menu` — GET (rate-limited)
- `/api/mess/menu-items` — GET POST (rate-limited)
- `/api/mess/operational-requests` — GET POST (rate-limited)
- `/api/mess/preference` — GET POST (rate-limited)
- `/api/mess/reconcile` — GET POST (rate-limited)
- `/api/mess/serve` — POST
- `/api/mess/token/[code]` — GET (rate-limited)
- `/api/mess/tokens/anomaly` — GET (rate-limited)

**`/api/occupancy/*`** (3)

- `/api/occupancy/current` — GET
- `/api/occupancy/history` — GET
- `/api/occupancy/presence-matrix` — GET (rate-limited)

**`/api/operator/*`** (11)

- `/api/operator/claim-gate` — POST
- `/api/operator/entry-type` — POST (rate-limited)
- `/api/operator/gate/device-health` — POST
- `/api/operator/last-scan` — GET (rate-limited)
- `/api/operator/lookup` — GET (rate-limited)
- `/api/operator/manual-entry` — GET POST (rate-limited)
- `/api/operator/mode` — POST
- `/api/operator/passes/batch-verify` — POST
- `/api/operator/register-thumbprint` — POST
- `/api/operator/stats` — GET
- `/api/operator/transactions` — GET (rate-limited)

**`/api/parent/*`** (1)

- `/api/parent/leave/acknowledge` — POST

**`/api/parents/*`** (2)

- `/api/parents` — GET POST (rate-limited)
- `/api/parents/link` — POST

**`/api/passes/*`** (2)

- `/api/passes/[passId]` — GET PUT (rate-limited)
- `/api/passes/[passId]/action` — POST

**`/api/permissions/*`** (1)

- `/api/permissions/bulk` — POST (rate-limited)

**`/api/persons/*`** (3)

- `/api/persons` — DELETE GET PATCH POST (rate-limited)
- `/api/persons/[uniqueId]` — GET (rate-limited)
- `/api/persons/[uniqueId]/history` — GET (rate-limited)

**`/api/principal/*`** (8)

- `/api/principal/audit` — GET (rate-limited)
- `/api/principal/catch-up` — GET (rate-limited)
- `/api/principal/dashboard` — GET
- `/api/principal/delegations` — GET POST (rate-limited)
- `/api/principal/digest` — GET (rate-limited)
- `/api/principal/retention` — GET
- `/api/principal/sla-heatmap` — GET (rate-limited)
- `/api/principal/week-digest` — GET (rate-limited)

**`/api/roles-graph/*`** (1)

- `/api/roles-graph` — GET (rate-limited)

**`/api/staff/*`** (7)

- `/api/staff/attendance` — GET
- `/api/staff/attendance-exceptions` — GET (rate-limited)
- `/api/staff/history` — GET (rate-limited)
- `/api/staff/my-day` — GET (rate-limited)
- `/api/staff/register` — GET (rate-limited)
- `/api/staff/requests-status` — GET (rate-limited)
- `/api/staff/stats` — GET (rate-limited)

**`/api/student/*`** (4)

- `/api/student/fees` — GET (rate-limited)
- `/api/student/library` — GET (rate-limited)
- `/api/student/marks` — GET (rate-limited)
- `/api/student/scholarships` — GET (rate-limited)

**`/api/students/*`** (5)

- `/api/students` — GET (rate-limited)
- `/api/students/[roll]` — DELETE GET PATCH (rate-limited)
- `/api/students/[roll]/history` — GET (rate-limited)
- `/api/students/register` — GET (rate-limited)
- `/api/students/stats` — GET (rate-limited)

**`/api/supervisor/*`** (10)

- `/api/supervisor/assignees` — GET (rate-limited)
- `/api/supervisor/claim-codes` — DELETE GET POST (rate-limited)
- `/api/supervisor/dashboard` — GET
- `/api/supervisor/escalations` — GET (rate-limited)
- `/api/supervisor/gate-live` — GET
- `/api/supervisor/retention` — GET
- `/api/supervisor/shift` — GET POST
- `/api/supervisor/team-roster` — GET
- `/api/supervisor/visitors/overstay` — GET (rate-limited)
- `/api/supervisor/visitors/watchlist` — GET POST (rate-limited)

**`/api/support/*`** (2)

- `/api/support/tickets` — GET POST
- `/api/support/tickets/[id]/comments` — GET POST

**`/api/sysadmin/*`** (18)

- `/api/sysadmin/actions` — GET (rate-limited)
- `/api/sysadmin/actions/[id]` — PATCH
- `/api/sysadmin/actions/[id]/approve` — POST
- `/api/sysadmin/application-health` — GET (rate-limited)
- `/api/sysadmin/approvals/two-person` — GET POST (rate-limited)
- `/api/sysadmin/automation-controls` — GET (rate-limited)
- `/api/sysadmin/automation-controls/[id]` — PATCH
- `/api/sysadmin/backup-status` — GET (rate-limited)
- `/api/sysadmin/bot/anomaly` — GET POST
- `/api/sysadmin/database-health` — GET (rate-limited)
- `/api/sysadmin/deployments` — GET (rate-limited)
- `/api/sysadmin/drills` — GET
- `/api/sysadmin/forecasts` — GET (rate-limited)
- `/api/sysadmin/redis-worker` — GET (rate-limited)
- `/api/sysadmin/rls/drift` — GET (rate-limited)
- `/api/sysadmin/security-posture` — GET
- `/api/sysadmin/services` — GET (rate-limited)
- `/api/sysadmin/worker-jobs` — GET (rate-limited)

**`/api/system/*`** (1)

- `/api/system/config` — GET PATCH (rate-limited)

**`/api/users/*`** (4)

- `/api/users/[id]` — DELETE PATCH
- `/api/users/bulk` — POST
- `/api/users/bulk/commit` — POST
- `/api/users/bulk/validate` — POST

**`/api/visitors/*`** (3)

- `/api/visitors` — GET POST PUT (rate-limited)
- `/api/visitors/freeze` — POST
- `/api/visitors/mine` — GET (rate-limited)

**`/api/voice/*`** (1)

- `/api/voice/interpret` — POST

**`/api/vp/*`** (4)

- `/api/vp/academics` — GET
- `/api/vp/dashboard` — GET
- `/api/vp/history` — GET
- `/api/vp/retention` — GET

**`/api/workers/*`** (5)

- `/api/workers/my-shift` — GET (rate-limited)
- `/api/workers/my-work` — GET (rate-limited)
- `/api/workers/my-work-orders` — GET (rate-limited)
- `/api/workers/personal-history` — GET (rate-limited)
- `/api/workers/shifts` — GET (rate-limited)

### Admin (`admin`) — 294 routes

**`/api/academic-status/*`** (2)

- `/api/academic-status` — GET POST (rate-limited)
- `/api/academic-status/pending` — GET POST (rate-limited)

**`/api/admin/*`** (97)

- `/api/admin/access/overview` — GET (rate-limited)
- `/api/admin/achievements/verify` — POST
- `/api/admin/alerts` — GET POST
- `/api/admin/alerts/overview` — GET (rate-limited)
- `/api/admin/alerts/rules` — GET PATCH POST
- `/api/admin/alerts/runbooks/overview` — GET (rate-limited)
- `/api/admin/alerts/safety/overview` — GET (rate-limited)
- `/api/admin/alerts/stream` — GET (rate-limited)
- `/api/admin/analytics/users/engagement` — GET
- `/api/admin/analytics/users/inactive` — GET
- `/api/admin/analytics/users/trends` — GET
- `/api/admin/announcements` — GET POST (rate-limited)
- `/api/admin/announcements/[id]` — DELETE GET PATCH (rate-limited)
- `/api/admin/audit` — GET (rate-limited)
- `/api/admin/audit-logs` — GET (rate-limited)
- `/api/admin/automation/deployments/overview` — GET (rate-limited)
- `/api/admin/automation/jobs/overview` — GET (rate-limited)
- `/api/admin/automation/maintenance/overview` — GET (rate-limited)
- `/api/admin/backup` — GET POST (rate-limited)
- `/api/admin/backup/stats` — GET
- `/api/admin/consent/stats` — GET
- `/api/admin/data/overview` — GET (rate-limited)
- `/api/admin/deployments` — POST
- `/api/admin/deployments/overview` — GET (rate-limited)
- `/api/admin/device-settings` — GET (rate-limited)
- `/api/admin/digital-twin` — GET
- `/api/admin/disk-status` — GET
- `/api/admin/exceptions` — GET (rate-limited)
- `/api/admin/export` — GET POST
- `/api/admin/gate-device-configuration` — GET (rate-limited)
- `/api/admin/gates` — GET POST (rate-limited)
- `/api/admin/gates/[id]/metrics` — GET (rate-limited)
- `/api/admin/gates/devices/overview` — GET (rate-limited)
- `/api/admin/gates/schedule` — GET PATCH POST (rate-limited)
- `/api/admin/governance/audit/overview` — GET (rate-limited)
- `/api/admin/governance/compliance/overview` — GET (rate-limited)
- `/api/admin/health/full` — GET
- `/api/admin/health/overview` — GET (rate-limited)
- `/api/admin/identity/people/overview` — GET (rate-limited)
- `/api/admin/institutional-configuration` — GET (rate-limited)
- `/api/admin/jobs` — GET
- `/api/admin/jobs/[id]` — PATCH
- `/api/admin/jobs/[id]/run` — POST
- `/api/admin/jobs/overview` — GET (rate-limited)
- `/api/admin/kb/documents` — POST
- `/api/admin/lockdown` — DELETE GET POST (rate-limited)
- `/api/admin/lockdown/stream` — GET
- `/api/admin/maintenance/overview` — GET (rate-limited)
- `/api/admin/monitoring/health/overview` — GET (rate-limited)
- `/api/admin/notification-settings` — GET (rate-limited)
- `/api/admin/overview` — GET (rate-limited)
- `/api/admin/people/[id]` — GET (rate-limited)
- `/api/admin/people/overview` — GET (rate-limited)
- `/api/admin/permission-policies` — GET (rate-limited)
- `/api/admin/platform/feature-flags/overview` — GET (rate-limited)
- `/api/admin/platform/integrations/overview` — GET (rate-limited)
- `/api/admin/platform/notifications/overview` — GET (rate-limited)
- `/api/admin/platform/reasons/overview` — GET (rate-limited)
- `/api/admin/platform/system/overview` — GET (rate-limited)
- `/api/admin/platform/webhooks/overview` — GET (rate-limited)
- `/api/admin/promotions/overview` — GET (rate-limited)
- `/api/admin/reference/departments/overview` — GET (rate-limited)
- `/api/admin/reference/hostel-tickets/overview` — GET (rate-limited)
- `/api/admin/reports` — GET POST
- `/api/admin/role-requests` — GET POST (rate-limited)
- `/api/admin/role-requests/[id]` — PATCH
- `/api/admin/roles/delegate` — GET POST
- `/api/admin/safety/overview` — GET (rate-limited)
- `/api/admin/scheduled-jobs` — GET
- `/api/admin/scheduling` — GET POST
- `/api/admin/scheduling/apply` — POST
- `/api/admin/scheduling/suggestions` — GET
- `/api/admin/security/stats` — GET
- `/api/admin/sessions` — GET
- `/api/admin/sms/compose` — POST
- `/api/admin/sms/queue` — GET
- `/api/admin/sms/queue/[id]` — DELETE GET
- `/api/admin/sms/queue/[id]/retry` — POST
- `/api/admin/sms/stats` — GET
- `/api/admin/sms/templates` — GET
- `/api/admin/sms/templates/[code]` — GET PATCH
- `/api/admin/support/metrics` — GET
- `/api/admin/support/tickets` — GET (rate-limited)
- `/api/admin/support/tickets/[id]` — PATCH
- `/api/admin/support/tickets/[id]/comments` — GET POST (rate-limited)
- `/api/admin/sustainability` — GET
- `/api/admin/sustainability/history` — GET
- `/api/admin/tables` — GET
- `/api/admin/ueba` — GET POST
- `/api/admin/users` — GET POST (rate-limited)
- `/api/admin/users/[id]` — GET PATCH (rate-limited)
- `/api/admin/users/[id]/enrollment-code` — POST
- `/api/admin/users/[id]/mobile-enrollment` — POST
- `/api/admin/users/[id]/roles` — GET POST
- `/api/admin/users/enrollment-codes` — GET
- `/api/admin/users/enrollment-codes/[id]` — DELETE
- `/api/admin/workflow-configuration` — GET (rate-limited)

**`/api/alerts/*`** (2)

- `/api/alerts/[id]` — PATCH
- `/api/alerts/assign` — POST (rate-limited)

**`/api/analytics/*`** (20)

- `/api/analytics/advanced` — GET
- `/api/analytics/daily` — GET
- `/api/analytics/daily-stats` — GET
- `/api/analytics/enhanced` — GET (rate-limited)
- `/api/analytics/export` — GET
- `/api/analytics/occupancy` — GET
- `/api/analytics/occupancy/retrain` — POST
- `/api/analytics/predictions` — GET
- `/api/analytics/predictions/history` — GET
- `/api/analytics/predictions/retrain` — POST
- `/api/analytics/reports` — GET POST
- `/api/analytics/reports/[id]` — DELETE
- `/api/analytics/reports/[id]/run` — POST
- `/api/analytics/sustainability` — GET (rate-limited)
- `/api/analytics/sustainability/retrain` — POST
- `/api/analytics/traffic` — GET (rate-limited)
- `/api/analytics/traffic/retrain` — POST
- `/api/analytics/visitors` — GET
- `/api/analytics/webhooks` — GET (rate-limited)
- `/api/analytics/webhooks/retrain` — POST

**`/api/announcements/*`** (2)

- `/api/announcements/[id]/dismiss` — POST
- `/api/announcements/active` — GET

**`/api/approver/*`** (1)

- `/api/approver/academics-department` — GET PATCH

**`/api/attendance_records/*`** (1)

- `/api/attendance_records` — GET POST (rate-limited)

**`/api/attention/*`** (1)

- `/api/attention/queue` — GET (rate-limited)

**`/api/audit/*`** (1)

- `/api/audit/photo-capture` — POST

**`/api/campus/*`** (2)

- `/api/campus/assistant` — POST
- `/api/campus/communities/[id]/moderate` — POST

**`/api/classes/*`** (3)

- `/api/classes` — GET POST (rate-limited)
- `/api/classes/[id]` — GET PATCH (rate-limited)
- `/api/classes/[id]/students` — GET (rate-limited)

**`/api/config/*`** (4)

- `/api/config/custom-reasons` — GET POST (rate-limited)
- `/api/config/custom-reasons/[id]` — DELETE PATCH
- `/api/config/student-rules` — GET POST PUT (rate-limited)
- `/api/config/subjects` — GET (rate-limited)

**`/api/dashboard/*`** (1)

- `/api/dashboard/hostel` — GET (rate-limited)

**`/api/delegations/*`** (1)

- `/api/delegations/graph` — GET (rate-limited)

**`/api/departments/*`** (2)

- `/api/departments` — DELETE GET PATCH POST
- `/api/departments/[dept]/classes` — GET (rate-limited)

**`/api/dev/*`** (1)

- `/api/dev/contact` — GET POST (rate-limited)

**`/api/emergency/*`** (2)

- `/api/emergency/alerts/[id]/acknowledge` — PATCH
- `/api/emergency/alerts/[id]/resolve` — PATCH

**`/api/exam/*`** (7)

- `/api/exam/access` — GET POST (rate-limited)
- `/api/exam/access-exceptions` — GET PATCH POST (rate-limited)
- `/api/exam/candidate-attendance` — GET (rate-limited)
- `/api/exam/eligibility-rules` — GET POST (rate-limited)
- `/api/exam/hall-tickets/generate` — POST (rate-limited)
- `/api/exam/results/process` — POST (rate-limited)
- `/api/exam/results/publish` — POST (rate-limited)

**`/api/faculty/*`** (7)

- `/api/faculty` — GET (rate-limited)
- `/api/faculty/assignments` — GET POST (rate-limited)
- `/api/faculty/attendance` — GET
- `/api/faculty/marks` — GET POST (rate-limited)
- `/api/faculty/marks/correct` — POST
- `/api/faculty/materials` — GET POST (rate-limited)
- `/api/faculty/mentees` — GET (rate-limited)

**`/api/faculty-assignments/*`** (2)

- `/api/faculty-assignments` — GET POST (rate-limited)
- `/api/faculty-assignments/[id]` — DELETE

**`/api/feedback/*`** (1)

- `/api/feedback` — GET POST (rate-limited)

**`/api/gate/*`** (6)

- `/api/gate/devices` — GET (rate-limited)
- `/api/gate/scan` — POST (rate-limited)
- `/api/gate/stream` — GET
- `/api/gate/verify-face` — POST
- `/api/gate/verify-leave-chain` — GET (rate-limited)
- `/api/gate/verify-thumbprint` — POST

**`/api/gates/*`** (4)

- `/api/gates` — DELETE GET PATCH POST (rate-limited)
- `/api/gates/[id]` — DELETE PATCH
- `/api/gates/schedule` — GET POST
- `/api/gates/schedule/[id]` — DELETE PUT

**`/api/guardian/*`** (1)

- `/api/guardian/links/reverify` — POST

**`/api/hod/*`** (6)

- `/api/hod/dashboard` — GET
- `/api/hod/exam-review` — GET POST (rate-limited)
- `/api/hod/faculty` — GET (rate-limited)
- `/api/hod/pulse` — GET
- `/api/hod/retention` — GET
- `/api/hod/schedule` — GET

**`/api/hostel-manager/*`** (3)

- `/api/hostel-manager/incidents` — GET POST (rate-limited)
- `/api/hostel-manager/incidents/[id]/escalate` — POST
- `/api/hostel-manager/rooms/allot` — POST (rate-limited)

**`/api/integrations/*`** (9)

- `/api/integrations` — GET POST PUT
- `/api/integrations/[id]` — PATCH
- `/api/integrations/[id]/sync` — POST
- `/api/integrations/lms/attendance` — POST
- `/api/integrations/lms/configure` — POST
- `/api/integrations/lms/status` — GET
- `/api/integrations/lms/sync` — POST
- `/api/integrations/logs` — GET
- `/api/integrations/test` — POST

**`/api/mess/*`** (17)

- `/api/mess/analytics` — GET (rate-limited)
- `/api/mess/arrivals` — GET POST (rate-limited)
- `/api/mess/attendance` — GET (rate-limited)
- `/api/mess/bills` — GET (rate-limited)
- `/api/mess/consumption` — GET (rate-limited)
- `/api/mess/days` — GET POST (rate-limited)
- `/api/mess/inventory` — GET (rate-limited)
- `/api/mess/issues` — GET POST (rate-limited)
- `/api/mess/meal-counts` — GET (rate-limited)
- `/api/mess/menu` — GET (rate-limited)
- `/api/mess/menu-items` — GET POST (rate-limited)
- `/api/mess/operational-requests` — GET POST (rate-limited)
- `/api/mess/preference` — GET POST (rate-limited)
- `/api/mess/reconcile` — GET POST (rate-limited)
- `/api/mess/serve` — POST
- `/api/mess/token/[code]` — GET (rate-limited)
- `/api/mess/tokens/anomaly` — GET (rate-limited)

**`/api/occupancy/*`** (3)

- `/api/occupancy/current` — GET
- `/api/occupancy/history` — GET
- `/api/occupancy/presence-matrix` — GET (rate-limited)

**`/api/operator/*`** (10)

- `/api/operator/entry-type` — POST (rate-limited)
- `/api/operator/gate/device-health` — POST
- `/api/operator/last-scan` — GET (rate-limited)
- `/api/operator/lookup` — GET (rate-limited)
- `/api/operator/manual-entry` — GET POST (rate-limited)
- `/api/operator/mode` — POST
- `/api/operator/passes/batch-verify` — POST
- `/api/operator/register-thumbprint` — POST
- `/api/operator/stats` — GET
- `/api/operator/transactions` — GET (rate-limited)

**`/api/parent/*`** (1)

- `/api/parent/leave/acknowledge` — POST

**`/api/parents/*`** (2)

- `/api/parents` — GET POST (rate-limited)
- `/api/parents/link` — POST

**`/api/passes/*`** (2)

- `/api/passes/[passId]` — GET PUT (rate-limited)
- `/api/passes/[passId]/action` — POST

**`/api/permissions/*`** (1)

- `/api/permissions/bulk` — POST (rate-limited)

**`/api/persons/*`** (3)

- `/api/persons` — DELETE GET PATCH POST (rate-limited)
- `/api/persons/[uniqueId]` — GET (rate-limited)
- `/api/persons/[uniqueId]/history` — GET (rate-limited)

**`/api/principal/*`** (7)

- `/api/principal/catch-up` — GET (rate-limited)
- `/api/principal/dashboard` — GET
- `/api/principal/delegations` — GET POST (rate-limited)
- `/api/principal/digest` — GET (rate-limited)
- `/api/principal/retention` — GET
- `/api/principal/sla-heatmap` — GET (rate-limited)
- `/api/principal/week-digest` — GET (rate-limited)

**`/api/roles-graph/*`** (1)

- `/api/roles-graph` — GET (rate-limited)

**`/api/staff/*`** (7)

- `/api/staff/attendance` — GET
- `/api/staff/attendance-exceptions` — GET (rate-limited)
- `/api/staff/history` — GET (rate-limited)
- `/api/staff/my-day` — GET (rate-limited)
- `/api/staff/register` — GET (rate-limited)
- `/api/staff/requests-status` — GET (rate-limited)
- `/api/staff/stats` — GET (rate-limited)

**`/api/student/*`** (4)

- `/api/student/fees` — GET (rate-limited)
- `/api/student/library` — GET (rate-limited)
- `/api/student/marks` — GET (rate-limited)
- `/api/student/scholarships` — GET (rate-limited)

**`/api/students/*`** (5)

- `/api/students` — GET (rate-limited)
- `/api/students/[roll]` — DELETE GET PATCH (rate-limited)
- `/api/students/[roll]/history` — GET (rate-limited)
- `/api/students/register` — GET (rate-limited)
- `/api/students/stats` — GET (rate-limited)

**`/api/supervisor/*`** (9)

- `/api/supervisor/assignees` — GET (rate-limited)
- `/api/supervisor/dashboard` — GET
- `/api/supervisor/escalations` — GET (rate-limited)
- `/api/supervisor/gate-live` — GET
- `/api/supervisor/retention` — GET
- `/api/supervisor/shift` — GET POST
- `/api/supervisor/team-roster` — GET
- `/api/supervisor/visitors/overstay` — GET (rate-limited)
- `/api/supervisor/visitors/watchlist` — GET POST (rate-limited)

**`/api/support/*`** (2)

- `/api/support/tickets` — GET POST
- `/api/support/tickets/[id]/comments` — GET POST

**`/api/sysadmin/*`** (13)

- `/api/sysadmin/actions` — GET (rate-limited)
- `/api/sysadmin/actions/[id]` — PATCH
- `/api/sysadmin/application-health` — GET (rate-limited)
- `/api/sysadmin/approvals/two-person` — GET POST (rate-limited)
- `/api/sysadmin/backup-status` — GET (rate-limited)
- `/api/sysadmin/bot/anomaly` — GET POST
- `/api/sysadmin/database-health` — GET (rate-limited)
- `/api/sysadmin/deployments` — GET (rate-limited)
- `/api/sysadmin/forecasts` — GET (rate-limited)
- `/api/sysadmin/redis-worker` — GET (rate-limited)
- `/api/sysadmin/security-posture` — GET
- `/api/sysadmin/services` — GET (rate-limited)
- `/api/sysadmin/worker-jobs` — GET (rate-limited)

**`/api/system/*`** (1)

- `/api/system/config` — GET PATCH (rate-limited)

**`/api/users/*`** (4)

- `/api/users/[id]` — DELETE PATCH
- `/api/users/bulk` — POST
- `/api/users/bulk/commit` — POST
- `/api/users/bulk/validate` — POST

**`/api/visitors/*`** (3)

- `/api/visitors` — GET POST PUT (rate-limited)
- `/api/visitors/freeze` — POST
- `/api/visitors/mine` — GET (rate-limited)

**`/api/voice/*`** (1)

- `/api/voice/interpret` — POST

**`/api/vp/*`** (4)

- `/api/vp/academics` — GET
- `/api/vp/dashboard` — GET
- `/api/vp/history` — GET
- `/api/vp/retention` — GET

**`/api/workers/*`** (5)

- `/api/workers/my-shift` — GET (rate-limited)
- `/api/workers/my-work` — GET (rate-limited)
- `/api/workers/my-work-orders` — GET (rate-limited)
- `/api/workers/personal-history` — GET (rate-limited)
- `/api/workers/shifts` — GET (rate-limited)

### Principal (`principal`) — 76 routes

**`/api/academic-status/*`** (1)

- `/api/academic-status/pending` — GET POST (rate-limited)

**`/api/admin/*`** (2)

- `/api/admin/lockdown` — DELETE GET POST (rate-limited)
- `/api/admin/security/stats` — GET

**`/api/alerts/*`** (2)

- `/api/alerts/[id]` — PATCH
- `/api/alerts/assign` — POST (rate-limited)

**`/api/announcements/*`** (2)

- `/api/announcements/[id]/dismiss` — POST
- `/api/announcements/active` — GET

**`/api/approver/*`** (1)

- `/api/approver/academics-department` — GET PATCH

**`/api/attendance_records/*`** (1)

- `/api/attendance_records` — GET POST (rate-limited)

**`/api/attention/*`** (1)

- `/api/attention/queue` — GET (rate-limited)

**`/api/campus/*`** (1)

- `/api/campus/assistant` — POST

**`/api/config/*`** (2)

- `/api/config/custom-reasons` — GET POST (rate-limited)
- `/api/config/custom-reasons/[id]` — DELETE PATCH

**`/api/dashboard/*`** (1)

- `/api/dashboard/hostel` — GET (rate-limited)

**`/api/delegations/*`** (1)

- `/api/delegations/graph` — GET (rate-limited)

**`/api/emergency/*`** (2)

- `/api/emergency/alerts/[id]/acknowledge` — PATCH
- `/api/emergency/alerts/[id]/resolve` — PATCH

**`/api/exam/*`** (4)

- `/api/exam/access` — GET POST (rate-limited)
- `/api/exam/access-exceptions` — GET PATCH POST (rate-limited)
- `/api/exam/candidate-attendance` — GET (rate-limited)
- `/api/exam/superintendent` — GET (rate-limited)

**`/api/faculty/*`** (1)

- `/api/faculty/attendance` — GET

**`/api/gate/*`** (1)

- `/api/gate/scan` — POST (rate-limited)

**`/api/hod/*`** (3)

- `/api/hod/dashboard` — GET
- `/api/hod/pulse` — GET
- `/api/hod/retention` — GET

**`/api/hostel-manager/*`** (2)

- `/api/hostel-manager/incidents` — GET POST (rate-limited)
- `/api/hostel-manager/incidents/[id]/escalate` — POST

**`/api/mess/*`** (12)

- `/api/mess/analytics` — GET (rate-limited)
- `/api/mess/arrivals` — GET POST (rate-limited)
- `/api/mess/attendance` — GET (rate-limited)
- `/api/mess/consumption` — GET (rate-limited)
- `/api/mess/days` — GET POST (rate-limited)
- `/api/mess/inventory` — GET (rate-limited)
- `/api/mess/issues` — GET POST (rate-limited)
- `/api/mess/meal-counts` — GET (rate-limited)
- `/api/mess/menu-items` — GET POST (rate-limited)
- `/api/mess/operational-requests` — GET POST (rate-limited)
- `/api/mess/serve` — POST
- `/api/mess/token/[code]` — GET (rate-limited)

**`/api/occupancy/*`** (1)

- `/api/occupancy/presence-matrix` — GET (rate-limited)

**`/api/operator/*`** (4)

- `/api/operator/lookup` — GET (rate-limited)
- `/api/operator/manual-entry` — GET POST (rate-limited)
- `/api/operator/stats` — GET
- `/api/operator/transactions` — GET (rate-limited)

**`/api/passes/*`** (2)

- `/api/passes/[passId]` — GET PUT (rate-limited)
- `/api/passes/[passId]/action` — POST

**`/api/permissions/*`** (1)

- `/api/permissions/bulk` — POST (rate-limited)

**`/api/persons/*`** (1)

- `/api/persons/[uniqueId]/history` — GET (rate-limited)

**`/api/principal/*`** (8)

- `/api/principal/audit` — GET (rate-limited)
- `/api/principal/catch-up` — GET (rate-limited)
- `/api/principal/dashboard` — GET
- `/api/principal/delegations` — GET POST (rate-limited)
- `/api/principal/digest` — GET (rate-limited)
- `/api/principal/retention` — GET
- `/api/principal/sla-heatmap` — GET (rate-limited)
- `/api/principal/week-digest` — GET (rate-limited)

**`/api/roles-graph/*`** (1)

- `/api/roles-graph` — GET (rate-limited)

**`/api/staff/*`** (2)

- `/api/staff/attendance` — GET
- `/api/staff/attendance-exceptions` — GET (rate-limited)

**`/api/students/*`** (2)

- `/api/students` — GET (rate-limited)
- `/api/students/register` — GET (rate-limited)

**`/api/supervisor/*`** (7)

- `/api/supervisor/assignees` — GET (rate-limited)
- `/api/supervisor/dashboard` — GET
- `/api/supervisor/escalations` — GET (rate-limited)
- `/api/supervisor/gate-live` — GET
- `/api/supervisor/retention` — GET
- `/api/supervisor/shift` — GET POST
- `/api/supervisor/team-roster` — GET

**`/api/support/*`** (2)

- `/api/support/tickets` — GET POST
- `/api/support/tickets/[id]/comments` — GET POST

**`/api/visitors/*`** (1)

- `/api/visitors/freeze` — POST

**`/api/vp/*`** (4)

- `/api/vp/academics` — GET
- `/api/vp/dashboard` — GET
- `/api/vp/history` — GET
- `/api/vp/retention` — GET

### Vice Principal (`vice_principal`) — 20 routes

**`/api/academic-status/*`** (1)

- `/api/academic-status/pending` — GET POST (rate-limited)

**`/api/approver/*`** (1)

- `/api/approver/academics-department` — GET PATCH

**`/api/attention/*`** (1)

- `/api/attention/queue` — GET (rate-limited)

**`/api/dashboard/*`** (1)

- `/api/dashboard/hostel` — GET (rate-limited)

**`/api/exam/*`** (4)

- `/api/exam/access` — GET POST (rate-limited)
- `/api/exam/access-exceptions` — GET PATCH POST (rate-limited)
- `/api/exam/candidate-attendance` — GET (rate-limited)
- `/api/exam/superintendent` — GET (rate-limited)

**`/api/occupancy/*`** (1)

- `/api/occupancy/presence-matrix` — GET (rate-limited)

**`/api/permissions/*`** (1)

- `/api/permissions/bulk` — POST (rate-limited)

**`/api/principal/*`** (3)

- `/api/principal/dashboard` — GET
- `/api/principal/digest` — GET (rate-limited)
- `/api/principal/retention` — GET

**`/api/roles-graph/*`** (1)

- `/api/roles-graph` — GET (rate-limited)

**`/api/staff/*`** (1)

- `/api/staff/attendance-exceptions` — GET (rate-limited)

**`/api/students/*`** (1)

- `/api/students` — GET (rate-limited)

**`/api/vp/*`** (4)

- `/api/vp/academics` — GET
- `/api/vp/dashboard` — GET
- `/api/vp/history` — GET
- `/api/vp/retention` — GET

### Dean (new — Associate Dean) (`dean`) — 2 routes

**`/api/academic-status/*`** (1)

- `/api/academic-status/pending` — GET POST (rate-limited)

**`/api/delegations/*`** (1)

- `/api/delegations/graph` — GET (rate-limited)

### HOD (`hod`) — 37 routes

**`/api/academic-status/*`** (1)

- `/api/academic-status` — GET POST (rate-limited)

**`/api/admin/*`** (1)

- `/api/admin/role-requests` — GET POST (rate-limited)

**`/api/approver/*`** (1)

- `/api/approver/academics-department` — GET PATCH

**`/api/attention/*`** (1)

- `/api/attention/queue` — GET (rate-limited)

**`/api/classes/*`** (3)

- `/api/classes` — GET POST (rate-limited)
- `/api/classes/[id]` — GET PATCH (rate-limited)
- `/api/classes/[id]/students` — GET (rate-limited)

**`/api/config/*`** (3)

- `/api/config/custom-reasons` — GET POST (rate-limited)
- `/api/config/custom-reasons/[id]` — DELETE PATCH
- `/api/config/subjects` — GET (rate-limited)

**`/api/departments/*`** (1)

- `/api/departments/[dept]/classes` — GET (rate-limited)

**`/api/exam/*`** (1)

- `/api/exam/superintendent` — GET (rate-limited)

**`/api/faculty/*`** (7)

- `/api/faculty` — GET (rate-limited)
- `/api/faculty/assignments` — GET POST (rate-limited)
- `/api/faculty/attendance` — GET
- `/api/faculty/marks` — GET POST (rate-limited)
- `/api/faculty/marks/submit` — POST
- `/api/faculty/materials` — GET POST (rate-limited)
- `/api/faculty/mentees` — GET (rate-limited)

**`/api/faculty-assignments/*`** (2)

- `/api/faculty-assignments` — GET POST (rate-limited)
- `/api/faculty-assignments/[id]` — DELETE

**`/api/hod/*`** (6)

- `/api/hod/dashboard` — GET
- `/api/hod/exam-review` — GET POST (rate-limited)
- `/api/hod/faculty` — GET (rate-limited)
- `/api/hod/pulse` — GET
- `/api/hod/retention` — GET
- `/api/hod/schedule` — GET

**`/api/permissions/*`** (1)

- `/api/permissions/bulk` — POST (rate-limited)

**`/api/staff/*`** (5)

- `/api/staff/attendance` — GET
- `/api/staff/attendance-exceptions` — GET (rate-limited)
- `/api/staff/my-day` — GET (rate-limited)
- `/api/staff/register` — GET (rate-limited)
- `/api/staff/stats` — GET (rate-limited)

**`/api/student/*`** (1)

- `/api/student/marks` — GET (rate-limited)

**`/api/students/*`** (3)

- `/api/students` — GET (rate-limited)
- `/api/students/register` — GET (rate-limited)
- `/api/students/stats` — GET (rate-limited)

### Faculty (`faculty`) — 39 routes

**`/api/admin/*`** (1)

- `/api/admin/role-requests` — GET POST (rate-limited)

**`/api/announcements/*`** (2)

- `/api/announcements/[id]/dismiss` — POST
- `/api/announcements/active` — GET

**`/api/attendance_records/*`** (1)

- `/api/attendance_records` — GET POST (rate-limited)

**`/api/attention/*`** (1)

- `/api/attention/queue` — GET (rate-limited)

**`/api/campus/*`** (2)

- `/api/campus/assistant` — POST
- `/api/campus/communities/[id]/moderate` — POST

**`/api/classes/*`** (2)

- `/api/classes/[id]` — GET PATCH (rate-limited)
- `/api/classes/[id]/students` — GET (rate-limited)

**`/api/config/*`** (1)

- `/api/config/subjects` — GET (rate-limited)

**`/api/faculty/*`** (10)

- `/api/faculty` — GET (rate-limited)
- `/api/faculty/assignments` — GET POST (rate-limited)
- `/api/faculty/attendance` — GET
- `/api/faculty/internal-exam/propose` — POST (rate-limited)
- `/api/faculty/marks` — GET POST (rate-limited)
- `/api/faculty/marks/submit` — POST
- `/api/faculty/materials` — GET POST (rate-limited)
- `/api/faculty/mentees` — GET (rate-limited)
- `/api/faculty/my-class/[id]` — GET (rate-limited)
- `/api/faculty/my-classes` — GET (rate-limited)

**`/api/faculty-assignments/*`** (1)

- `/api/faculty-assignments` — GET POST (rate-limited)

**`/api/hod/*`** (3)

- `/api/hod/faculty` — GET (rate-limited)
- `/api/hod/pulse` — GET
- `/api/hod/schedule` — GET

**`/api/occupancy/*`** (1)

- `/api/occupancy/presence-matrix` — GET (rate-limited)

**`/api/permissions/*`** (1)

- `/api/permissions/bulk` — POST (rate-limited)

**`/api/persons/*`** (3)

- `/api/persons` — DELETE GET PATCH POST (rate-limited)
- `/api/persons/[uniqueId]` — GET (rate-limited)
- `/api/persons/[uniqueId]/history` — GET (rate-limited)

**`/api/staff/*`** (6)

- `/api/staff/attendance` — GET
- `/api/staff/attendance-exceptions` — GET (rate-limited)
- `/api/staff/history` — GET (rate-limited)
- `/api/staff/my-day` — GET (rate-limited)
- `/api/staff/requests-status` — GET (rate-limited)
- `/api/staff/stats` — GET (rate-limited)

**`/api/students/*`** (2)

- `/api/students` — GET (rate-limited)
- `/api/students/stats` — GET (rate-limited)

**`/api/support/*`** (2)

- `/api/support/tickets` — GET POST
- `/api/support/tickets/[id]/comments` — GET POST

### Staff (`staff`) — 22 routes

**`/api/admin/*`** (1)

- `/api/admin/role-requests` — GET POST (rate-limited)

**`/api/announcements/*`** (2)

- `/api/announcements/[id]/dismiss` — POST
- `/api/announcements/active` — GET

**`/api/attention/*`** (1)

- `/api/attention/queue` — GET (rate-limited)

**`/api/campus/*`** (1)

- `/api/campus/assistant` — POST

**`/api/exam/*`** (1)

- `/api/exam/superintendent` — GET (rate-limited)

**`/api/faculty/*`** (2)

- `/api/faculty` — GET (rate-limited)
- `/api/faculty/attendance` — GET

**`/api/hod/*`** (1)

- `/api/hod/faculty` — GET (rate-limited)

**`/api/occupancy/*`** (1)

- `/api/occupancy/presence-matrix` — GET (rate-limited)

**`/api/persons/*`** (3)

- `/api/persons` — DELETE GET PATCH POST (rate-limited)
- `/api/persons/[uniqueId]` — GET (rate-limited)
- `/api/persons/[uniqueId]/history` — GET (rate-limited)

**`/api/staff/*`** (6)

- `/api/staff/attendance` — GET
- `/api/staff/attendance-exceptions` — GET (rate-limited)
- `/api/staff/history` — GET (rate-limited)
- `/api/staff/my-day` — GET (rate-limited)
- `/api/staff/requests-status` — GET (rate-limited)
- `/api/staff/stats` — GET (rate-limited)

**`/api/students/*`** (1)

- `/api/students/stats` — GET (rate-limited)

**`/api/support/*`** (2)

- `/api/support/tickets` — GET POST
- `/api/support/tickets/[id]/comments` — GET POST

### Operator (`operator`) — 44 routes

**`/api/admin/*`** (2)

- `/api/admin/security/stats` — GET
- `/api/admin/support/tickets/[id]/comments` — GET POST (rate-limited)

**`/api/analytics/*`** (2)

- `/api/analytics/daily` — GET
- `/api/analytics/occupancy` — GET

**`/api/announcements/*`** (2)

- `/api/announcements/[id]/dismiss` — POST
- `/api/announcements/active` — GET

**`/api/attendance_records/*`** (1)

- `/api/attendance_records` — GET POST (rate-limited)

**`/api/attention/*`** (1)

- `/api/attention/queue` — GET (rate-limited)

**`/api/audit/*`** (1)

- `/api/audit/photo-capture` — POST

**`/api/campus/*`** (1)

- `/api/campus/assistant` — POST

**`/api/emergency/*`** (1)

- `/api/emergency/alerts/[id]/acknowledge` — PATCH

**`/api/gate/*`** (5)

- `/api/gate/scan` — POST (rate-limited)
- `/api/gate/stream` — GET
- `/api/gate/verify-face` — POST
- `/api/gate/verify-leave-chain` — GET (rate-limited)
- `/api/gate/verify-thumbprint` — POST

**`/api/gates/*`** (2)

- `/api/gates` — DELETE GET PATCH POST (rate-limited)
- `/api/gates/schedule` — GET POST

**`/api/integrations/*`** (1)

- `/api/integrations/lms/attendance` — POST

**`/api/occupancy/*`** (2)

- `/api/occupancy/current` — GET
- `/api/occupancy/presence-matrix` — GET (rate-limited)

**`/api/operator/*`** (10)

- `/api/operator/claim-gate` — POST
- `/api/operator/entry-type` — POST (rate-limited)
- `/api/operator/gate/device-health` — POST
- `/api/operator/last-scan` — GET (rate-limited)
- `/api/operator/lookup` — GET (rate-limited)
- `/api/operator/manual-entry` — GET POST (rate-limited)
- `/api/operator/passes/batch-verify` — POST
- `/api/operator/register-thumbprint` — POST
- `/api/operator/stats` — GET
- `/api/operator/transactions` — GET (rate-limited)

**`/api/passes/*`** (1)

- `/api/passes/[passId]/action` — POST

**`/api/permissions/*`** (1)

- `/api/permissions/bulk` — POST (rate-limited)

**`/api/persons/*`** (3)

- `/api/persons` — DELETE GET PATCH POST (rate-limited)
- `/api/persons/[uniqueId]` — GET (rate-limited)
- `/api/persons/[uniqueId]/history` — GET (rate-limited)

**`/api/staff/*`** (1)

- `/api/staff/register` — GET (rate-limited)

**`/api/students/*`** (1)

- `/api/students/register` — GET (rate-limited)

**`/api/support/*`** (2)

- `/api/support/tickets` — GET POST
- `/api/support/tickets/[id]/comments` — GET POST

**`/api/users/*`** (1)

- `/api/users/me/gate` — PATCH

**`/api/visitors/*`** (2)

- `/api/visitors` — GET POST PUT (rate-limited)
- `/api/visitors/mine` — GET (rate-limited)

**`/api/voice/*`** (1)

- `/api/voice/interpret` — POST

### Supervisor (`supervisor`) — 44 routes

**`/api/admin/*`** (2)

- `/api/admin/lockdown` — DELETE GET POST (rate-limited)
- `/api/admin/security/stats` — GET

**`/api/alerts/*`** (1)

- `/api/alerts/assign` — POST (rate-limited)

**`/api/attendance_records/*`** (1)

- `/api/attendance_records` — GET POST (rate-limited)

**`/api/attention/*`** (1)

- `/api/attention/queue` — GET (rate-limited)

**`/api/campus/*`** (1)

- `/api/campus/assistant` — POST

**`/api/emergency/*`** (2)

- `/api/emergency/alerts/[id]/acknowledge` — PATCH
- `/api/emergency/alerts/[id]/resolve` — PATCH

**`/api/exam/*`** (1)

- `/api/exam/superintendent` — GET (rate-limited)

**`/api/gate/*`** (2)

- `/api/gate/stream` — GET
- `/api/gate/verify-leave-chain` — GET (rate-limited)

**`/api/gates/*`** (1)

- `/api/gates` — DELETE GET PATCH POST (rate-limited)

**`/api/occupancy/*`** (1)

- `/api/occupancy/presence-matrix` — GET (rate-limited)

**`/api/operator/*`** (6)

- `/api/operator/claim-gate` — POST
- `/api/operator/entry-type` — POST (rate-limited)
- `/api/operator/gate/device-health` — POST
- `/api/operator/last-scan` — GET (rate-limited)
- `/api/operator/mode` — POST
- `/api/operator/passes/batch-verify` — POST

**`/api/passes/*`** (1)

- `/api/passes/[passId]/action` — POST

**`/api/persons/*`** (1)

- `/api/persons/[uniqueId]/history` — GET (rate-limited)

**`/api/staff/*`** (4)

- `/api/staff/attendance` — GET
- `/api/staff/attendance-exceptions` — GET (rate-limited)
- `/api/staff/my-day` — GET (rate-limited)
- `/api/staff/register` — GET (rate-limited)

**`/api/students/*`** (2)

- `/api/students` — GET (rate-limited)
- `/api/students/register` — GET (rate-limited)

**`/api/supervisor/*`** (10)

- `/api/supervisor/assignees` — GET (rate-limited)
- `/api/supervisor/claim-codes` — DELETE GET POST (rate-limited)
- `/api/supervisor/dashboard` — GET
- `/api/supervisor/escalations` — GET (rate-limited)
- `/api/supervisor/gate-live` — GET
- `/api/supervisor/retention` — GET
- `/api/supervisor/shift` — GET POST
- `/api/supervisor/team-roster` — GET
- `/api/supervisor/visitors/overstay` — GET (rate-limited)
- `/api/supervisor/visitors/watchlist` — GET POST (rate-limited)

**`/api/visitors/*`** (1)

- `/api/visitors/freeze` — POST

**`/api/voice/*`** (1)

- `/api/voice/interpret` — POST

**`/api/workers/*`** (5)

- `/api/workers/my-shift` — GET (rate-limited)
- `/api/workers/my-work` — GET (rate-limited)
- `/api/workers/my-work-orders` — GET (rate-limited)
- `/api/workers/personal-history` — GET (rate-limited)
- `/api/workers/shifts` — GET (rate-limited)

### Student (`student`) — 26 routes

**`/api/announcements/*`** (2)

- `/api/announcements/[id]/dismiss` — POST
- `/api/announcements/active` — GET

**`/api/attention/*`** (1)

- `/api/attention/queue` — GET (rate-limited)

**`/api/campus/*`** (2)

- `/api/campus/assistant` — POST
- `/api/campus/communities/[id]/moderate` — POST

**`/api/config/*`** (1)

- `/api/config/subjects` — GET (rate-limited)

**`/api/faculty/*`** (2)

- `/api/faculty/assignments` — GET POST (rate-limited)
- `/api/faculty/materials` — GET POST (rate-limited)

**`/api/mess/*`** (4)

- `/api/mess/default` — GET PUT (rate-limited)
- `/api/mess/history` — GET (rate-limited)
- `/api/mess/menu` — GET (rate-limited)
- `/api/mess/preference` — GET POST (rate-limited)

**`/api/passes/*`** (1)

- `/api/passes/[passId]` — GET PUT (rate-limited)

**`/api/persons/*`** (2)

- `/api/persons/[uniqueId]` — GET (rate-limited)
- `/api/persons/[uniqueId]/history` — GET (rate-limited)

**`/api/student/*`** (7)

- `/api/student/attendance-calendar` — GET (rate-limited)
- `/api/student/curfew-acknowledge` — POST (rate-limited)
- `/api/student/dashboard` — GET
- `/api/student/fees` — GET (rate-limited)
- `/api/student/library` — GET (rate-limited)
- `/api/student/marks` — GET (rate-limited)
- `/api/student/scholarships` — GET (rate-limited)

**`/api/students/*`** (2)

- `/api/students/[roll]` — DELETE GET PATCH (rate-limited)
- `/api/students/[roll]/history` — GET (rate-limited)

**`/api/support/*`** (2)

- `/api/support/tickets` — GET POST
- `/api/support/tickets/[id]/comments` — GET POST

### Parent (`parent`) — 18 routes

**`/api/announcements/*`** (2)

- `/api/announcements/[id]/dismiss` — POST
- `/api/announcements/active` — GET

**`/api/attention/*`** (1)

- `/api/attention/queue` — GET (rate-limited)

**`/api/campus/*`** (1)

- `/api/campus/assistant` — POST

**`/api/faculty/*`** (1)

- `/api/faculty/materials` — GET POST (rate-limited)

**`/api/guardian/*`** (1)

- `/api/guardian/links/reverify` — POST

**`/api/parent/*`** (1)

- `/api/parent/leave/acknowledge` — POST

**`/api/passes/*`** (1)

- `/api/passes/[passId]` — GET PUT (rate-limited)

**`/api/persons/*`** (3)

- `/api/persons` — DELETE GET PATCH POST (rate-limited)
- `/api/persons/[uniqueId]` — GET (rate-limited)
- `/api/persons/[uniqueId]/history` — GET (rate-limited)

**`/api/student/*`** (4)

- `/api/student/attendance-calendar` — GET (rate-limited)
- `/api/student/fees` — GET (rate-limited)
- `/api/student/marks` — GET (rate-limited)
- `/api/student/scholarships` — GET (rate-limited)

**`/api/students/*`** (1)

- `/api/students` — GET (rate-limited)

**`/api/support/*`** (2)

- `/api/support/tickets` — GET POST
- `/api/support/tickets/[id]/comments` — GET POST

### Guardian (`guardian`) — 12 routes

**`/api/attention/*`** (1)

- `/api/attention/queue` — GET (rate-limited)

**`/api/campus/*`** (1)

- `/api/campus/assistant` — POST

**`/api/faculty/*`** (1)

- `/api/faculty/materials` — GET POST (rate-limited)

**`/api/guardian/*`** (1)

- `/api/guardian/links/reverify` — POST

**`/api/parent/*`** (1)

- `/api/parent/leave/acknowledge` — POST

**`/api/persons/*`** (2)

- `/api/persons/[uniqueId]` — GET (rate-limited)
- `/api/persons/[uniqueId]/history` — GET (rate-limited)

**`/api/student/*`** (4)

- `/api/student/attendance-calendar` — GET (rate-limited)
- `/api/student/fees` — GET (rate-limited)
- `/api/student/marks` — GET (rate-limited)
- `/api/student/scholarships` — GET (rate-limited)

**`/api/students/*`** (1)

- `/api/students` — GET (rate-limited)

### Visitor (`visitor`) — 6 routes

**`/api/attention/*`** (1)

- `/api/attention/queue` — GET (rate-limited)

**`/api/occupancy/*`** (1)

- `/api/occupancy/presence-matrix` — GET (rate-limited)

**`/api/visitors/*`** (4)

- `/api/visitors` — GET POST PUT (rate-limited)
- `/api/visitors/me/check-in` — POST
- `/api/visitors/me/check-out` — POST
- `/api/visitors/mine` — GET (rate-limited)

### Worker (`worker`) — 10 routes

**`/api/admin/*`** (1)

- `/api/admin/security/stats` — GET

**`/api/attention/*`** (1)

- `/api/attention/queue` — GET (rate-limited)

**`/api/campus/*`** (1)

- `/api/campus/assistant` — POST

**`/api/occupancy/*`** (1)

- `/api/occupancy/presence-matrix` — GET (rate-limited)

**`/api/persons/*`** (2)

- `/api/persons/[uniqueId]` — GET (rate-limited)
- `/api/persons/[uniqueId]/history` — GET (rate-limited)

**`/api/workers/*`** (4)

- `/api/workers/my-shift` — GET (rate-limited)
- `/api/workers/my-work` — GET (rate-limited)
- `/api/workers/my-work-orders` — GET (rate-limited)
- `/api/workers/personal-history` — GET (rate-limited)

### Caretaker (`caretaker`) — 5 routes

**`/api/attention/*`** (1)

- `/api/attention/queue` — GET (rate-limited)

**`/api/exam/*`** (1)

- `/api/exam/superintendent` — GET (rate-limited)

**`/api/occupancy/*`** (1)

- `/api/occupancy/presence-matrix` — GET (rate-limited)

**`/api/permissions/*`** (1)

- `/api/permissions/bulk` — POST (rate-limited)

**`/api/workers/*`** (1)

- `/api/workers/shifts` — GET (rate-limited)

### Deputy Warden (`deputy_warden`) — 7 routes

**`/api/attention/*`** (1)

- `/api/attention/queue` — GET (rate-limited)

**`/api/emergency/*`** (1)

- `/api/emergency/alerts/[id]/acknowledge` — PATCH

**`/api/exam/*`** (1)

- `/api/exam/superintendent` — GET (rate-limited)

**`/api/hostel-manager/*`** (2)

- `/api/hostel-manager/incidents` — GET POST (rate-limited)
- `/api/hostel-manager/rooms/allot` — POST (rate-limited)

**`/api/occupancy/*`** (1)

- `/api/occupancy/presence-matrix` — GET (rate-limited)

**`/api/permissions/*`** (1)

- `/api/permissions/bulk` — POST (rate-limited)

### Hostel Manager (`hostel_manager`) — 7 routes

**`/api/attention/*`** (1)

- `/api/attention/queue` — GET (rate-limited)

**`/api/emergency/*`** (1)

- `/api/emergency/alerts/[id]/acknowledge` — PATCH

**`/api/exam/*`** (1)

- `/api/exam/superintendent` — GET (rate-limited)

**`/api/hostel-manager/*`** (2)

- `/api/hostel-manager/incidents` — GET POST (rate-limited)
- `/api/hostel-manager/rooms/allot` — POST (rate-limited)

**`/api/occupancy/*`** (1)

- `/api/occupancy/presence-matrix` — GET (rate-limited)

**`/api/permissions/*`** (1)

- `/api/permissions/bulk` — POST (rate-limited)

### OIE (Officer-in-Charge) (`oie`) — 12 routes

**`/api/approver/*`** (1)

- `/api/approver/academics-department` — GET PATCH

**`/api/attention/*`** (1)

- `/api/attention/queue` — GET (rate-limited)

**`/api/config/*`** (2)

- `/api/config/custom-reasons` — GET POST (rate-limited)
- `/api/config/custom-reasons/[id]` — DELETE PATCH

**`/api/exam/*`** (5)

- `/api/exam/access` — GET POST (rate-limited)
- `/api/exam/access-exceptions` — GET PATCH POST (rate-limited)
- `/api/exam/candidate-attendance` — GET (rate-limited)
- `/api/exam/eligibility-rules` — GET POST (rate-limited)
- `/api/exam/superintendent` — GET (rate-limited)

**`/api/gate/*`** (1)

- `/api/gate/stream` — GET

**`/api/occupancy/*`** (1)

- `/api/occupancy/presence-matrix` — GET (rate-limited)

**`/api/permissions/*`** (1)

- `/api/permissions/bulk` — POST (rate-limited)

### Exam Superintendent (`exam_superintendent`) — 4 routes

**`/api/exam/*`** (3)

- `/api/exam/access` — GET POST (rate-limited)
- `/api/exam/access-exceptions` — GET PATCH POST (rate-limited)
- `/api/exam/superintendent` — GET (rate-limited)

**`/api/occupancy/*`** (1)

- `/api/occupancy/presence-matrix` — GET (rate-limited)

### Mess Incharge (`mess_incharge`) — 16 routes

**`/api/mess/*`** (16)

- `/api/mess/analytics` — GET (rate-limited)
- `/api/mess/arrivals` — GET POST (rate-limited)
- `/api/mess/attendance` — GET (rate-limited)
- `/api/mess/bills` — GET (rate-limited)
- `/api/mess/consumption` — GET (rate-limited)
- `/api/mess/days` — GET POST (rate-limited)
- `/api/mess/inventory` — GET (rate-limited)
- `/api/mess/issues` — GET POST (rate-limited)
- `/api/mess/meal-counts` — GET (rate-limited)
- `/api/mess/menu` — GET (rate-limited)
- `/api/mess/menu-items` — GET POST (rate-limited)
- `/api/mess/operational-requests` — GET POST (rate-limited)
- `/api/mess/reconcile` — GET POST (rate-limited)
- `/api/mess/serve` — POST
- `/api/mess/token/[code]` — GET (rate-limited)
- `/api/mess/tokens/anomaly` — GET (rate-limited)

### Controller of Examinations (new) (`controller_examinations`) — 3 routes

**`/api/exam/*`** (2)

- `/api/exam/eligibility-rules` — GET POST (rate-limited)
- `/api/exam/results/publish` — POST (rate-limited)

**`/api/hod/*`** (1)

- `/api/hod/exam-review` — GET POST (rate-limited)

### Addl. Controller — Academic (new) (`addl_controller_academic`) — 1 routes

**`/api/faculty/*`** (1)

- `/api/faculty/marks/correct` — POST

### Addl. Controller — Results (new) (`addl_controller_results`) — 1 routes

**`/api/exam/*`** (1)

- `/api/exam/results/process` — POST (rate-limited)

### Addl. Controller — Automation (new) (`addl_controller_automation`) — 1 routes

**`/api/exam/*`** (1)

- `/api/exam/hall-tickets/generate` — POST (rate-limited)

### Exam Branch (legacy, compat only) (`exam_branch`) — 8 routes

**`/api/approver/*`** (1)

- `/api/approver/academics-department` — GET PATCH

**`/api/attention/*`** (1)

- `/api/attention/queue` — GET (rate-limited)

**`/api/exam/*`** (5)

- `/api/exam/access` — GET POST (rate-limited)
- `/api/exam/access-exceptions` — GET PATCH POST (rate-limited)
- `/api/exam/eligibility-rules` — GET POST (rate-limited)
- `/api/exam/hall-tickets/generate` — POST (rate-limited)
- `/api/exam/superintendent` — GET (rate-limited)

**`/api/occupancy/*`** (1)

- `/api/occupancy/presence-matrix` — GET (rate-limited)

### EMO (Emergency Management Officer) (`emo`) — 0 routes (legacy/compat)

Legacy approver-surface key — recognized by `withAuthorization` but owns no 
dedicated route. The equivalent operations live under the mapped role.

### Hostel (legacy) (`hostel`) — 0 routes (legacy/compat)

Legacy approver-surface key — recognized by `withAuthorization` but owns no 
dedicated route. The equivalent operations live under the mapped role.

---

## Open self-service surface (any authenticated user)

231 routes have no `requiredRole` — they accept any logged-in user and 
enforce ownership server-side (students see their own data, parents their children, 
etc.). Grouped by domain below.

- **`/api/admin`** — 17 routes: `/api/admin/anti-ragging-alert-config`, `/api/admin/approval-password-status/[userId]`, `/api/admin/audit/export`, `/api/admin/complaint-categories`, `/api/admin/complaint-categories/[code]`, `/api/admin/dashboard`, `/api/admin/delegation-r…
- **`/api/alerts`** — 1 routes: `/api/alerts`
- **`/api/announcements`** — 2 routes: `/api/announcements/[id]`, `/api/announcements/[id]/follow`
- **`/api/anti-ragging`** — 3 routes: `/api/anti-ragging/cases`, `/api/anti-ragging/cases/[id]`, `/api/anti-ragging/report`
- **`/api/attachments`** — 1 routes: `/api/attachments/storage-status`
- **`/api/attention`** — 1 routes: `/api/attention/timeline`
- **`/api/auth`** — 17 routes: `/api/auth/_drill/token-short`, `/api/auth/approval-password/rotate`, `/api/auth/approval-password/set`, `/api/auth/bootstrap`, `/api/auth/change-password`, `/api/auth/lock`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/logout-all`, `/…
- **`/api/bot`** — 4 routes: `/api/bot/chat`, `/api/bot/feedback`, `/api/bot/session/current`, `/api/bot/telegram-verify`
- **`/api/campus`** — 15 routes: `/api/campus/achievements`, `/api/campus/communities`, `/api/campus/communities/[id]`, `/api/campus/communities/[id]/join`, `/api/campus/communities/[id]/leave`, `/api/campus/communities/[id]/posts`, `/api/campus/communities/[id]/report`, `…
- **`/api/campus-extra`** — 8 routes: `/api/campus-extra/analytics`, `/api/campus-extra/calendar`, `/api/campus-extra/feedback`, `/api/campus-extra/handover`, `/api/campus-extra/knowledge`, `/api/campus-extra/portfolio`, `/api/campus-extra/saved-views`, `/api/campus-extra/task-…
- **`/api/caretaker`** — 2 routes: `/api/caretaker/maintenance`, `/api/caretaker/summary`
- **`/api/classes`** — 1 routes: `/api/classes/[id]/attendance`
- **`/api/complaints`** — 31 routes: `/api/complaints`, `/api/complaints/[id]`, `/api/complaints/[id]/attachments`, `/api/complaints/[id]/attachments/[attId]`, `/api/complaints/[id]/call`, `/api/complaints/[id]/cosign`, `/api/complaints/[id]/feedback`, `/api/complaints/[id]/re…
- **`/api/config`** — 6 routes: `/api/config/college-info`, `/api/config/emergency-contacts`, `/api/config/exit-reasons`, `/api/config/navigation`, `/api/config/pass-types`, `/api/config/roles`
- **`/api/deputy-warden`** — 1 routes: `/api/deputy-warden/delegation`
- **`/api/docs`** — 1 routes: `/api/docs`
- **`/api/emergency`** — 2 routes: `/api/emergency/alerts`, `/api/emergency/sos`
- **`/api/features`** — 1 routes: `/api/features`
- **`/api/gate`** — 4 routes: `/api/gate/device-push`, `/api/gate/logs`, `/api/gate/scan/[id]`, `/api/gate/verify-pass`
- **`/api/gates`** — 1 routes: `/api/gates/schedule/current`
- **`/api/guardian`** — 1 routes: `/api/guardian/verify`
- **`/api/health`** — 1 routes: `/api/health`
- **`/api/home`** — 2 routes: `/api/home/generate`, `/api/home/live`
- **`/api/hostel`** — 4 routes: `/api/hostel/blocks`, `/api/hostel/blocks/[block]/rooms`, `/api/hostel/blocks/[block]/students`, `/api/hostel/returns-timeline`
- **`/api/hostel-manager`** — 2 routes: `/api/hostel-manager/housekeeping-tasks`, `/api/hostel-manager/summary`
- **`/api/lockdown`** — 1 routes: `/api/lockdown/active`
- **`/api/me`** — 3 routes: `/api/me/access-log`, `/api/me/consent`, `/api/me/health`
- **`/api/mess`** — 29 routes: `/api/mess/days/[id]`, `/api/mess/events/[id]/token/[tokenId]/regenerate-code`, `/api/mess/events/[id]/token/[tokenId]/unlock`, `/api/mess/events/[id]/tokens`, `/api/mess/meal-tokens/[mealDayId]`, `/api/mess/menu-items/[id]`, `/api/mess/my-…
- **`/api/metrics`** — 1 routes: `/api/metrics`
- **`/api/mobile`** — 5 routes: `/api/mobile/[...path]`, `/api/mobile/history`, `/api/mobile/idcard`, `/api/mobile/login`, `/api/mobile/profile`
- **`/api/my`** — 1 routes: `/api/my/pass-notifications`
- **`/api/notifications`** — 5 routes: `/api/notifications`, `/api/notifications/[id]`, `/api/notifications/preferences`, `/api/notifications/read-all`, `/api/notifications/stream`
- **`/api/occupancy`** — 1 routes: `/api/occupancy/stream`
- **`/api/oie`** — 1 routes: `/api/oie/queue`
- **`/api/onboarding`** — 3 routes: `/api/onboarding/complete`, `/api/onboarding/next`, `/api/onboarding/status`
- **`/api/operator`** — 1 routes: `/api/operator/kiosk-session`
- **`/api/parents`** — 5 routes: `/api/parents/me`, `/api/parents/me/children`, `/api/parents/me/children/[childId]/movements`, `/api/parents/me/children/[childId]/passes`, `/api/parents/me/consent`
- **`/api/passes`** — 1 routes: `/api/passes`
- **`/api/permissions`** — 20 routes: `/api/permissions`, `/api/permissions/[ticket]`, `/api/permissions/[ticket]/amend`, `/api/permissions/[ticket]/biometric`, `/api/permissions/[ticket]/comments`, `/api/permissions/[ticket]/document`, `/api/permissions/[ticket]/document/verif…
- **`/api/profile`** — 1 routes: `/api/profile`
- **`/api/status`** — 1 routes: `/api/status`
- **`/api/student`** — 7 routes: `/api/student/emergency-alert`, `/api/student/guardian`, `/api/student/guardian-link`, `/api/student/meal-opt-out`, `/api/student/meal-opt-out/[id]`, `/api/student/mess-bill`, `/api/student/next-exam`
- **`/api/students`** — 2 routes: `/api/students/me/guardian`, `/api/students/qr-token`
- **`/api/support`** — 1 routes: `/api/support/tickets/[id]`
- **`/api/sysadmin`** — 2 routes: `/api/sysadmin/drills/rearm`, `/api/sysadmin/drills/rearm/[id]/approve`
- **`/api/telegram`** — 1 routes: `/api/telegram/webhook`
- **`/api/users`** — 4 routes: `/api/users`, `/api/users/bulk-graduate`, `/api/users/lookup`, `/api/users/me/export`
- **`/api/visitors`** — 3 routes: `/api/visitors/[id]`, `/api/visitors/[id]/check-in`, `/api/visitors/[id]/check-out`
- **`/api/webhooks`** — 2 routes: `/api/webhooks/alertmanager`, `/api/webhooks/sms`
- **`/api/ws`** — 1 routes: `/api/ws`

---

## Bounded agents (cron, `x-cron-secret`-gated)

21 endpoints called by host cron from 
`/etc/cron.d/gate-jobs`, authenticated with the shared `x-cron-secret`. Each agent 
acts inside a role context and writes `audit_events` with `actor_type='agent'`. 
None can mutate state outside that boundary.

| Endpoint | Schedule | Bounded to | Function |
|---|---|---|---|
| `/api/cron/gate-reconcile` | */5 | operator | Auto-resolve unmatched manual gate scans; prepare operator prompts |
| `/api/cron/leave-chain` | */30 | deputy_warden | TTL reminders/escalations/auto-expiry on hostel leave chain; issues gate token |
| `/api/cron/complaint-triage` | */30 | supervisor | Categorize, route, duplicate-flag, SLA-escalate open complaints |
| `/api/cron/mess-reconcile` | 05:00 | mess_incharge | Hash-chained ledger: issued vs consumed vs boarders; anomaly blocks service |
| `/api/cron/exam-eligibility-manifest` | 22:00 | oie | Precompute + Ed25519-sign candidate eligibility for exam day |
| `/api/cron/birthday-check` | 00:30 | system | Personal in-app + Telegram birthday notification, once per year |
| `/api/cron/audit-chain` | 02:00 | sysadmin | Tamper-evident SHA256 chain over `audit_events`; broken link → critical alert |

Pre-existing housekeeping crons in the same file: `/api/cron/expire-passes` (15 min), 
`sla-breach-check` (hourly), `alerts-evaluate` (hourly), `retention-run` (daily), 
`audit-rotate` (daily), `mess-finalize` + `mess-no-show-check` (post-dinner).

---

## Cross-role security guarantees

- **HOD scope lock**: HOD APIs read/write only their own department (`auth.departmentId` must match; 403 otherwise). 
  Science/HSS HODs have their own `entity_scopes` rows — an EEE HOD never sees CSE data.
- **Parent scope lock**: parents see only their linked children (`guardian_id` = `auth.userId` unless admin).
- **Faculty scope lock**: faculty see only students in their assigned classes (`class_teacher_id` / `faculty_assignments`).
- **Guardian mapping**: wards resolved through `student_details.guardian_id`, not a guessed link table.
- **RLS on `users`**: specific select/update/insert policies; `relrowsecurity = on` verified; 
  nightly drift check at `/api/sysadmin/rls/drift`.
- **Telegram bot**: `/verify` scoped to the sender's linked account only (no code enumeration); 
  `/link` requires an explicit `confirm` flag before storing the binding.
- **Suspended / debarred students**: `users.flag_status` set alongside `academic_status` — 
  the gate scanner and RLS policies treat them as flagged automatically.
- **Two-person rule (maker-checker)**: DEBARRED/SUSPENDED flags and high-risk grants park in 
  `pending_approvals`; the DB `maker_ne_checker` CHECK is the floor, `/api/sysadmin/approvals/two-person` 
  is the queue. A HOD's DEBARRED write returns `{ pending: true }` until a Dean/Principal signs off.
- **Exam-desk separation of duties**: marks entry (faculty) ≠ result processing (`addl_controller_results`) 
  ≠ result sign-off/publish (`controller_examinations`). No single role can both enter and publish a result.
- **Delegation with TTL**: time-bound, scoped, revocable role grants (`delegations` table, 
  `no_self_delegation` + `valid_window` constraints). `withAuthorization` falls back to an active 
  delegation only when the native role is absent. Authority graph: `/api/delegations/graph`.
- **Tamper-evident audit**: nightly SHA256 hash chain over `audit_events` (`audit_chain` + checkpoints); 
  broken link fires a critical alert. The integrity proof behind accreditation/legal export.
- **Hostel leave gate chain**: gate pass valid only when `leave_requests.status = 'GATE_ISSUED'` 
  (warden + parent both done). `/api/gate/verify-leave-chain` reports exactly which link is missing.

---

## Telegram bot commands by role

Role-aware command menu — 102 commands total; each role sees only its own surface:

- **`student`** (12): /passes /curfew /alerts /announce /complaint /exam /mess /guardian /fees /library /marks /health
- **`parent`** (6): /child /curfew /announce /complaint /exam /mess
- **`guardian`** (5): /child /curfew /announce /complaint /exam
- **`faculty`** (11): /attendance /students /schedule /alerts /announce /classes /complaints /events /marks /assignments /mentees
- **`hod`** (7): /dept /attendance /alerts /complaints /announce /faculty /events
- **`operator`** (6): /gates /occupancy /alerts /announce /handover /visitor
- **`supervisor`** (7): /gates /alerts /occupancy /complaints /announce /visitor /events
- **`staff`** (7): /shifts /gates /occupancy /alerts /announce /handover /maintenance
- **`caretaker`** (6): /gates /occupancy /alerts /announce /maintenance /visitor
- **`hostel_manager`** (7): /occupancy /curfew /gates /alerts /announce /blocks /handover
- **`principal`** (8): /campus /attendance /alerts /complaints /occupancy /announce /events /delegation
- **`admin`** (9): /campus /users /gates /alerts /complaints /occupancy /announce /events /backup
- **`sysadmin`** (11): /campus /users /gates /alerts /complaints /occupancy /announce /events /backup /bot /audit

---

## Entity-aligned operational model (JNTUH CEJ)

The 6 new entity roles and the 7 hierarchy controls are detailed in 
`docs/JNTUH_CEJ_ROLE_HIERARCHY.md`. Key points:

- **Exam branch split** — one `exam_branch` role became four desks: `controller_examinations` 
  (sign-off/publish), `addl_controller_academic` (marks correction), `addl_controller_results` 
  (processing), `addl_controller_automation` (hall-ticket generation). The legacy `exam_branch` 
  string remains in the registry for approver-surface compatibility only — no user carries it.
- **Hostel re-cast** — `warden` was consolidated into `principal` (Chief Warden = Principal, 
  role context only, not a separate account). `deputy_warden` and `hostel_manager` remain distinct.
- **New `dean` role** — Associate Dean (Academics / Student Affairs), the two-person approver.
- **Hostel leave gate chain** — Deputy Warden approval + parent acknowledgement, run on the clock 
  by the `leave-chain` agent (TTL reminders, escalation, auto-expiry, gate-token issuance).
- **HOD scope extended** — covers science/HSS HODs (Physics, Chemistry, Mathematics, English) 
  via `entity_scopes` seeds.

---

## Related documents

- **`docs/JNTUH_CEJ_ROLE_HIERARCHY.md`** — entity-aligned operational model with 7 hierarchy controls
- **`docs/AUTONOMOUS_OPERATIONS.md`** — automation and resilience layer (control loops, threats, HA)
- **`docs/ROLE_EVOLUTION_2030.md`** — Phase 0–3 time-lapse evolution plan
- **`docs/IMPLEMENTATION_BLUEPRINT.md`** — STEP 0–7 build order + live status table
- **`docs/SECURITY_CHECKLIST.md`** §6 — entity/agent/two-person control checks
- **`docs/RUNBOOK.md`** — autonomous agent cron table + what-to-check-on-alert

---

## What is NOT yet in the live system (planned, spec-complete)

The personalization + register plan (12 design docs, 2026-11-17) is
spec-complete on paper. The emitter policy table (block-kind →
transition → priority → quiet-hours exemption → persona) is the single
config that makes it buildable without touching the security model.
What's been built and what's next:

| Built (this commit chain) | Status |
|---|---|
| `class_periods` (timetable clock) | ✅ schema live |
| `class_flexible` (extra/reschedule/substitute) | ✅ schema live |
| `class_register_drafts` + `attendance_register_sessions` | ✅ schema live |
| `class_reviews` (append-only trigger) | ✅ schema live |
| `class_messages` + `class_message_receipts` | ✅ schema live |
| `personalization_prefs` (4 settings) | ✅ schema live |
| `attendance_seen` (block-level continuity) | ✅ schema live |
| `users.is_cr`, `users.is_icr`, `users.duty_off_override` | ✅ schema live |
| `src/lib/personalization/prefs.ts` | ✅ live |
| `src/lib/register.ts` (keyboard, CSV, short labels) | ✅ live |
| `src/lib/bot-personas.ts` (/now /settings /register /review /classes-add /message) | ✅ live |
| Webhook register callbacks + answerCallbackQuery | ✅ live |
| `register-open` cron agent (timetable auto-open) | ✅ live, */5 |
| `faculty-review` cron agent (duty-off card) | ✅ live, 19:00 |
| **CSV upload via Telegram document** | ⏳ next — the `/register template` + `/register upload` commands; the validation + delta preview logic is already in `register.ts` |
| **Class-message relay fan-out + receipt tracking** | ⏳ next — the `class_messages` schema is live; the release-card → fan-out → receipt pipeline needs the webhook's `/message` handler |
| **Flexible-class approval HOD flow** | ⏳ next — the `class_flexible` schema + `/classes-add` command are live; HOD approve/reject buttons + reschedule notice fan-out |
| **Attendance-first /now for parent/guardian** | ⏳ next — the student's `/now` is live; parent/guardian child-scoped attendance block |
| **Quiet-hours gate on all P1/P2 pushes** | ⏳ next — `inQuietHours()` is live in `prefs.ts`; wiring it into the push dispatcher |
| **Tamper-evident chain over new audit actions** | ✅ already covered — `audit_events` is the chain's input; the new action names are registered |

The 12 plan pastes are the design source of truth. The emitter policy
table (one row per block-kind) is the next artifact to build — it's
the single config file that makes the push policy a living table, not
a launch artifact.

## Regeneration notes

This doc is generated, not hand-maintained. To re-verify after any
route/role change:

```bash
# 1. Tally (per-role counts, gated/open/cron) — stdlib-only, headless-safe:
python3 scripts/regen_role_map.py . | jq .
# 2. The summary JSON is the ground truth: total / gated / open / cron / by_role.
# 3. Cross-check the doc's 'Roles at a glance' and per-route entries against
#    the JSON, then commit + push (the deploy poller resets the tree to
#    origin/main — an uncommitted doc edit is lost on the next cycle).
```

*Last regenerated: 2026-11-17 · 583 routes total · 331 gated / 231 open / 21 cron ·
306 inline + 19 tier + 6 const gate kinds resolved · 0 unknown gates · commit 5073bf81*
