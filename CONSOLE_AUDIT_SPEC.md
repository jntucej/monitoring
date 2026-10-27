# Console Audit & Fix — Full Role→Pages→Endpoints Inventory

Repo: JNTUCEJ monitoring. Next.js App Router + TS + Zustand + Supabase/Postgres + Framer Motion.
Each console = `src/app/(<group>)/<role>/`. Goal: every page fetches a DISTINCT endpoint OR is deleted;
every endpoint the UI calls returns 200 with the shape the UI reads; tsc clean.

## Red-flag consoles (highest ROI first)

| # | Console | Pages | Distinct endpoints | Ratio | Verdict |
|---|---------|-------|--------------------|-------|---------|
| 1 | Caretaker | 9 | 1 | 9.0 | 89% stub — every page hits /api/caretaker/summary |
| 2 | Visitor | 8 | 1 | 8.0 | 87% stub — every page hits /api/visitors/mine |
| 3 | Staff | 10 | 2 | 5.0 | 80% stub — 6/10 hit /api/staff/my-day |
| 4 | Hostel Manager | 9 | 2 | 4.5 | 78% stub |
| 5 | Principal | 17 | 8 | 2.1 | Real but endpoint-starved |
| 6 | OIE | 15 | 5 + 3 redirects | 3.0 | 20% redirects + thin endpoints |
| 7 | VP | 18 | 6 + 8 redirects | 3.0 | 44% redirect stubs |
| 8 | Warden | 10 | 0 | ∞ | All redirects — delete group |
| 9+ | Admin, Sysadmin, Operator, Student, Faculty, HOD, Deputy Warden, Supervisor, Guardian, Mess, Parent, Exam-Superintendent, Exam-Branch | — | — | — | Real; verify-only |

## Full role → pages → endpoints map (as provided by the user)
(Saved verbatim below for the agents to work from.)

<role-map>
PRINCIPAL: all-pass-requests→GET /api/permissions; approval-centre→GET /api/permissions?status=PENDING|REJECTED|ESCALATED; approvals→GET /api/permissions + GET /api/principal/dashboard; attendance→GET /api/staff/attendance; audit→GET /api/principal/audit; delegation-manager→GET+POST /api/principal/delegations; department-analytics→GET /api/campus-extra/analytics; departments→GET /api/departments; emergency-decisions→GET /api/permissions?workflow_type=emergency; examination-oversight→GET /api/campus-extra/analytics + /api/exam/access; gate-activity→GET /api/occupancy/presence-matrix + /api/hostel-manager/summary + /api/permissions?workflow_type=hostel; hostel-oversight→GET /api/hostel-manager/summary + /api/occupancy/presence-matrix; incidents→GET /api/alerts; permission-management→GET /api/permissions + PATCH /api/permissions/[ticket]; permissions→GET /api/permissions; reports→GET /api/campus-extra/analytics.
VICE_PRINCIPAL: academics→GET /api/approver/academics-department; attendance-exceptions→GET /api/staff/attendance-exception; decision-history→GET /api/permissions?status=APPROVED|REJECTED; delegated-responsibilities→(static); department-performance→GET /api/departments + /api/campus-extra/analytics; escalated-requests→GET /api/permissions?status=ESCALATED; examination-coordination→GET /api/permissions?workflow_type=exam; hostel-security-summaries→GET /api/occupancy/presence-matrix + /api/alerts; pending-approvals→GET /api/permissions?status=PENDING.
ADMIN (49): alerts→GET/PATCH /api/alerts(+[id]); analytics/*→GET /api/analytics/{...}; announcements→GET/POST /api/admin/announcements; application-reports→redirect; attendance→GET /api/attendance_records; audit-logs→GET /api/admin/audit-logs; dashboard→redirect /admin/overview; faculty→GET /api/faculty/attendance; gate-device-configuration→GET /api/admin/gate-device-configuration; gates→GET /api/admin/gates; gates/[id]→GET /api/admin/gates/[id]/metrics; gates/schedule→GET /api/admin/gates/schedule; health→GET /api/health + /api/sysadmin/services; institutional-configuration→GET /api/admin/institutional-configuration; mess→GET /api/mess/{menu-items|days|analytics}; notification-settings→GET /api/admin/notification-settings; occupancy→GET /api/occupancy/presence-matrix; overview→GET /api/admin/overview; permission-policies→GET /api/admin/permission-policies; reports→GET /api/admin/dashboard; role-assignments→redirect; roles→GET /api/roles-graph; settings→GET /api/config/college-info; staff→GET /api/staff/stats; students→GET /api/students/stats; support→GET /api/admin/support/tickets; sustainability→GET /api/admin/sustainability; user-management→redirect /admin/users; users→GET /api/users + /api/departments; workers→GET /api/workers/shifts; workflow-configuration→GET /api/admin/workflow-configuration.
SYSADMIN (40): access(hub); access-keys→GET /api/admin/users/enrollment-codes; alerts→GET /api/alerts; alerts/rules→GET /api/admin/alerts/rules; alumni→GET /api/students; application-health→GET /api/sysadmin/application-health; audit→GET /api/admin/audit-logs; backup→GET /api/admin/backup/status; compliance→GET /api/admin/compliance/export; data(hub); database-health→GET /api/sysadmin/database-health; departments→GET/POST/DELETE /api/departments; deployments→GET /api/sysadmin/deployments; devices→GET /api/admin/device-settings; docker-services→GET /api/sysadmin/services; exit-reasons→GET /api/config/exit-reasons; gates→GET /api/gates + /api/admin/kiosk; health→GET /api/health; hostel-tickets→GET /api/admin/hostel-tickets; infrastructure→GET /api/sysadmin/services; integrations→GET /api/integrations; jobs→GET /api/admin/jobs; navigation→GET /api/config/navigation; parents→GET /api/parents; people(hub); profile→GET /api/profile; promotions→GET /api/admin/role-requests; reasons→GET /api/config/custom-reasons; redis-worker→GET /api/sysadmin/redis-worker; roles→GET /api/roles-graph + /api/config/roles; safety(hub); scheduled-jobs→GET /api/admin/scheduled-jobs; scheduling→GET /api/admin/scheduling/suggestions; security→GET /api/admin/security/stats; sessions→GET /api/admin/sessions; sso→GET /api/admin/sso; staff→GET /api/staff/stats; students→GET /api/students; system(hub).
OPERATOR (8): page→GET /api/operator/stats; scan→GET /api/gates; exceptions→GET /api/operator/transactions; manual-entry→GET /api/operator/lookup + POST /api/operator/manual-entry; pass-verification→GET /api/permissions; transactions→GET /api/operator/transactions; gate/[gateId]→GET /api/operator/stats + POST /api/gate/scan; worker/page→GET /api/workers/my-shift.
STUDENT (16): page→GET /api/student/dashboard; attendance-calendar→GET /api/student/attendance-calendar; gate-pass→GET /api/passes; history→GET /api/persons/[uniqueId]/history; id→GET /api/students/qr-token; leave-requests→GET/POST /api/permissions; notifications→GET /api/notifications + /api/announcements/active; pass-application→POST /api/passes; passes→GET/POST /api/passes; permissions→GET /api/permissions; permissions/new→POST /api/permissions; profile→GET /api/profile; profile-security→GET /api/profile + /api/auth/2fa/setup; request-tracking→GET /api/permissions.
FACULTY (16): page→GET /api/faculty/my-classes; attendance/[id]→GET /api/faculty/attendance; attendance-management→GET /api/faculty/attendance; class/[id]→GET /api/classes/[id]/students; class-attendance-reports→GET /api/faculty/attendance; correction-requests→GET /api/permissions; my-classes→GET /api/faculty/my-classes; notifications→GET /api/notifications; permissions→GET /api/permissions; reports→GET /api/faculty/attendance; request-history→GET /api/permissions; student-directory→GET /api/faculty/attendance; student-requests→GET /api/permissions; subject/[id]→GET /api/faculty/my-class/[id]; subject/page→GET /api/faculty/my-classes; attendance(root)→GET /api/faculty/attendance.
HOD (9): page→GET /api/permissions; attendance-exceptions→GET /api/faculty/attendance; department-attendance→GET /api/staff/attendance; department-pass-requests→GET /api/permissions; department-reports→GET /api/students/stats; escalation-centre→GET /api/permissions?status=ESCALATED; faculty-overview→GET /api/hod/faculty; permissions→GET /api/permissions; student-directory→GET /api/students/stats.
HOSTEL_MANAGER (9): page→GET /api/hostel-manager/summary; housekeeping-tasks→GET /api/hostel-manager/summary; maintenance-requests→GET /api/hostel-manager/summary; occupancy-reports→GET /api/hostel-manager/summary; operational-reports→GET /api/hostel-manager/summary; resident-service-requests→GET /api/hostel-manager/summary; resource-management→GET /api/occupancy/presence-matrix; room-bed-allocation→GET /api/hostel-manager/summary; tickets→GET /api/permissions?workflow_type=hostel.
DEPUTY_WARDEN (9): daily-overview→GET /api/occupancy/presence-matrix + /api/permissions; decision-history→GET /api/permissions; delegated-approvals→GET /api/permissions + /api/deputy-warden/delegation; gate-movement→GET /api/permissions; incident-reporting→GET /api/permissions; leave-requests→GET /api/permissions; outpass-queue→GET /api/permissions; resident-attendance→GET /api/permissions; shift-handover→GET /api/campus-extra/handover.
CARETAKER (9): page/assets/facilities/faults/history/maintenance/reports/work-orders/workers→ all GET /api/caretaker/summary (RED FLAG: 9 pages, 1 endpoint).
OIE (15, 3 stubs): page→GET /api/oie/queue; access-exceptions→GET /api/exam/access-exceptions; approvals→GET /api/permissions; candidate-attendance→GET /api/exam/candidate-attendance; decision-history→GET /api/permissions; exam-branch-coordination→GET /api/permissions; examination-day-access→GET /api/exam/access + /api/permissions; examination-overview→redirect; examination-pass-requests→redirect; examination-reports→GET /api/campus-extra/analytics; incidents→GET /api/alerts; logs→GET /api/admin/audit-logs; pending-approvals→redirect; queue→GET /api/oie/queue; records→GET /api/permissions; tasks→GET /api/permissions.
STAFF (10): page/assigned-tasks/duties/history/leaves/my-day/my-profile/notifications/request-status/requests→ mostly GET /api/staff/my-day (RED FLAG: 6/10 stub).
SUPERVISOR (10): approvals→GET /api/passes; curfew→GET /api/supervisor/escalations; escalation-centre→GET /api/supervisor/escalations; exceptions→GET /api/permissions; gate-activity→GET /api/occupancy/presence-matrix; gates→GET /api/occupancy/presence-matrix + /api/lockdown/active; handover→GET /api/campus-extra/handover; incidents→GET /api/alerts + /api/supervisor/assignees; reports→GET /api/campus-extra/analytics; shifts→GET /api/staff/attendance.
GUARDIAN (10): page→GET /api/parents/me; child-attendance→GET /api/parents/me; child-requests→GET /api/permissions; child-status→GET /api/persons + /api/persons/[id]; contact-info→GET /api/profile; movement-info→GET /api/persons; notifications→GET /api/notifications; pass-leave-submission→POST /api/passes; request-status→GET /api/permissions; visit-schedule→GET /api/campus-extra/calendar.
MESS (8): page→GET /api/mess/menu; consumption-reports→GET /api/mess/consumption; daily-meal-counts→GET /api/mess/meal-counts; inventory-stock→GET /api/mess/inventory; meal-attendance→GET /api/mess/attendance; menu-management→GET /api/mess/menu; mess-issues→GET /api/mess/issues; operational-requests→GET /api/mess/operational-requests; scan→GET /api/mess/token/[code] + POST /api/mess/serve.
PARENT (4): page→GET /api/parents/me; child→GET /api/parents/me; passes→GET/POST /api/passes; settings→GET /api/profile.
EXAM_SUPERINTENDENT (5): page→GET /api/exam/superintendent; access→GET /api/exam/access; incidents→GET /api/alerts; reports→GET /api/campus-extra/analytics; schedule→GET /api/permissions?workflow_type=exam.
EXAM_BRANCH (11): page→GET /api/oie/queue; calendar→GET /api/campus-extra/calendar; discrepancies→GET /api/alerts; docs→GET /api/campus-extra/knowledge; oie-approval-requests→GET /api/permissions; oie-handoff→GET /api/oie/queue; pass-queue→GET /api/permissions; records→GET /api/permissions; reports→GET /api/campus-extra/analytics; verification→GET /api/occupancy/presence-matrix.
WARDEN (10, all redirect): warden/* → redirect to /deputy-warden/* or /hostel-manager/* (DELETE GROUP).
VISITOR (8): page/approval-status/checkin-out/history/host-info/request/visit-details→ all GET /api/visitors/mine; registration→POST /api/visitors (RED FLAG: 7/8 stub).
</role-map>

## The 7-step cookie-cutter (run once per role, highest ROI first)
1. **Inventory** (read-only): for each page.tsx under the role dir, list its useApiResource/useApi/fetch calls + exact URL/method + fields read. Output a table.
2. **Verify endpoints exist**: for each unique URL, grep `src/app/api/`. Missing → STUB ENDPOINT. Present → read response shape, compare to UI fields. Output table.
3. **Detect stub pages**: a page is a stub if its only fetch is a shared endpoint used by 3+ pages AND it renders no page-specific computation. List each with a one-line reason.
4. **Fix missing endpoints**: create the route (withAuthorization + withRateLimit + ok/fail + query, scoped by auth). Return the shape the UI already destructures; never invent fields; if a DB column is missing, return derived/null, never throw.
5. **Fix shape mismatches**: adjust endpoint OR UI (never both at once).
6. **Wire stub pages**: Option A (dedicated endpoint + page-specific computation) if the page has a distinct purpose; Option B (delete page + its nav entry + href links) if redundant. State which + why.
7. **Verify**: tsc --noEmit, lint, test:unit. Report files created/modified/deleted, endpoints added, stubs converted.

## Constraints
- Do NOT modify files outside the role's page dir + `src/app/api/` (except consoles.ts nav entries for Option B).
- Do NOT change the `withAuthorization` signature. Do NOT add npm deps. Do NOT rename existing endpoints.
- Preserve existing UI text/layout (data-wiring fix, not redesign).
- Seed data: use the DUMMY users only (STUDENT + the role users PRINCIPAL/OIE/...), never the 1386 production students.

## Priority order (run in this order, spawn agents in parallel on disjoint role dirs)
1. Caretaker (9 pages / 1 endpoint) — biggest stub ratio
2. Visitor (8 / 1)
3. Staff (10 / 2)
4. Hostel Manager (9 / 2)
5. Principal (17 / 8)
6. OIE (15 / 5 + 3 redirects)
7. VP (18 / 6 + 8 redirects)
8. Warden (10 dead redirects → delete group)
9+. Admin, Sysadmin, Operator, Student, Faculty, HOD, Deputy Warden, Supervisor, Guardian, Mess, Parent, Exam-Superintendent, Exam-Branch (verify-only)

---

## Priority fix list (cross-cutting + role-specific, already triaged)

These are the confirmed/high-leverage defects found during the broader Principal/VP/Sysadmin/Admin
audit. The cookie-cutter agents should treat items in **their own role's** list as in-scope; the
cross-cutting items are owned by the main agent and will land in a separate commit.

### Cross-cutting (all consoles — owned by main agent, already in flight)
- [x] **`useApiResource` deep-equal `setData`** — `src/hooks/useApiResource.ts`: added a structural
  `deepEqual` and gated `setData` on it, so a poll returning identical data keeps the previous object
  reference and does not re-render every consuming panel. This is the single highest-leverage
  flicker fix; it touches every console.
- [ ] **Self-scheduling `usePolling`** — already self-scheduling + visibility-aware (no overlap bug).
  No change needed.

### Principal
- [ ] **Revoke: allow `CANCEL` from `APPROVED`** in the permission state machine
  (`database/migrations/20261011000035_permission_state_machine.sql` restricts `APPROVED` to
  `COMPLETED` only, so the principal's Revoke button on approved tickets throws
  "Invalid status transition: APPROVED -> CANCELLED"). Either add a new migration widening the
  allowed transition, or disable the Revoke button on `APPROVED`/`COMPLETED`/`CANCELLED` rows in the
  UI.
- [ ] **`all-pass-requests` re-animates the list every poll** — the `useMemo` over `rows` re-runs
  because `useApiResource` minted a new reference each poll. The deep-equal fix above largely
  addresses this; verify the `AnimatePresence` no longer re-enters rows on unchanged data.
- [ ] **4 duplicate page pairs** (`attendance`/`reports`, `gate-activity`/`hostel-oversight`,
  `departments`/`department-analytics`, `incidents`/`audit`+`emergency-decisions`) — candidates for
  consolidation; lowest priority.

### Vice-Principal
- [ ] **`_probe.ts` silently swallows 403** — `ProbeResult.restricted` is set on 403 but most
  `useProbe` callers only destructure `{ data, loading, error }`, so a 403 renders an empty state
  forever with no error. Audit every `useProbe` caller under `src/app/(approver)/vice-principal/`
  and surface `restricted`.
- [ ] **6 redirect stubs** (`vp/analytics`, `vp/approvals`, `vp/attendance`, `vp/gates`, `vp/reports`,
  `vp/tasks`) are one-line `redirect(...)` wrappers still listed in the VP nav — delete the pages or
  the nav entries.

### Sysadmin
- [ ] **Duplicate bulk-user-import endpoints** — `/api/users/bulk/*` and
  `/api/admin/users/bulk/*` both exist (validate + commit). Identify which set is live (grep
  `CsvBulkImporter` + `BulkUserImportModal`) and delete the dead set.
- [ ] **`sysadmin/hostel-tickets` expects `requester_name`** — the DB column is
  `requester_user_id`; the endpoint must join `users` to produce the name, else the table renders
  blank cells.
- [ ] **`sysadmin/deployments` reads `/var/log`** — the Docker container has no host `/var/log`
    volume, so the endpoint always returns `{ source: "unavailable", deployments: [] }`. Either
    mount a volume or read deployments from a DB/API source.
- [ ] **`sysadmin/scheduled-jobs` falls back to seed data** — when `/api/admin/scheduled-jobs`
    returns empty, the panel shows hardcoded `SEED_SCHEDULED_JOBS` (jobs that don't exist in the
    DB). Remove the deceptive seed fallback.
- [ ] **5 pure-navigation hub pages** (`access`, `data`, `people`, `safety`, `system`) render only
    link-card grids; they duplicate what the sidebar already does — candidates for deletion.

### Admin
- [ ] **Analytics predictions use `randomInt`** — `src/lib/predictive.ts` +
  `/api/analytics/advanced` generate fake numbers dressed as ARIMA. Either replace with a real model
  or disable the feature and label the panels "no model available".
- [ ] **`sustainability_metrics` table is never populated** — `admin/sustainability` +
  `admin/analytics/sustainability` always show zeros. Insert seed data or remove the pages.
- [ ] **4 redirect stubs** (`admin/application-reports`, `admin/dashboard`, `admin/role-assignments`,
  `admin/user-management`).
- [ ] **`admin/reports` "generated reports" vanish on refresh** — they're `useState`-only; persist
    them or remove the fake-persistence UX.
- [ ] **Two config pages overlap** (`admin/settings` ⊂ `admin/institutional-configuration`).
- [ ] **`admin/attendance` reads `attendance_records`** — only a biometric-device bridge writes to it;
    on a fresh deploy the table is empty.
- [ ] **3 nearly-identical staff-tracking pages** (`faculty`/`staff`/`workers`).

### Warden (all 10 pages are redirects)
- [ ] Delete all 10 warden pages + the warden console entry + the warden nav in `useNavigation.ts`.
