# API_INDEX — 669 API Routes

**Discovery date:** 2026-11-24
**Method:** `find src/app/api -name "route.ts"` + sub-tree inspection
**Evidence level:** OBSERVED

## Top-Level Sub-Trees (by route count)

| Sub-tree | Routes | Key Endpoints |
|---|---|---|
| `admin/` | 131 | users (CRUD + bulk + reset-password + enrollment-codes), gates, lockdown, health, retention-policies, compliance, jobs, scheduled-jobs, anti-ragging, gate-device-configuration, permission-policies, announcements, academic-automation |
| `mess/` | 49 | analytics, menu, inventory, meal-counts, attendance, token/[code], serve, reviews, special-events, issues, operational-requests, consumption, my-token |
| `complaints/` | 32 | CRUD + config + permissions + feedback + attachments |
| `cron/` | 30 | 13+ sub-jobs (mess, gate-reconcile, sla-breach, academic-automation, class-*, expire-passes) |
| `permissions/` | 23 | GET/POST (create), [ticket] (PATCH + verify + can-act + comments + upload + forward + qr + revoke + document/verify), bulk, active, approved, export, my-counts, preview, direct-generate |
| `sysadmin/` | 22 | actions, automation-controls, forecasts, services, security posture, database-health, docker-services, backup, maintenance, infrastructure, autonomous-monitoring |
| `analytics/` | 20 | daily-stats, visitors, predictions, campus-extra |
| `student/` | 19 | attendance (overview + dispute), marks, fees, library, scholarships, next-exam, mess-bill, meal-opt-out |
| `campus/` | 19 | events, extra analytics |
| `principal/` | 17 | decisions, attention, escalations, inbound/[id]/respond |
| `operator/` | 17 | mode, claim-gate, manual-entry, lookup, last-scan, scans/[id]/category, recent-scans/summary |
| `auth/` | 17 | login, logout, refresh, session, MFA, lockout |
| `faculty/` | 13 | attendance, my-classes, assignments |
| `supervisor/` | 10 | dashboard, escalations, team-roster, claim-codes |
| `gate/` | 10 | verify-pass, verify-thumbprint, devices |
| `config/` | 10 | app-constants, consoles, pass-ranks |
| `users/` | 9 | CRUD |
| `integrations/` | 9 | telegram, webhooks |
| `visitors/` | 8 | mine, me/check-in, me/check-out, registration |
| `exam/` | 8 | access, candidate-attendance, eligibility-rules, access-exceptions, superintendent, hall-tickets, results |
| `class-sessions/` | 8 | CRUD |
| `campus-extra/` | 8 | analytics by role |
| `students/` | 7 | CRUD + stats + qr-token |
| `staff/` | 7 | my-day, my-day-exceptions, stats |
| `parents/` | 7 | CRUD |
| `hod/` | 7 | dashboard, faculty, schedule |
| `vp/` | 6 | hostel-summary, academics |
| `passes/` | 5 | GET list, POST create (ORPHAN), [passId]/feedback, [passId]/action, [passId]/status |
| `workers/` | 5 | my-shift, shifts |
| `notifications/` | 5 | CRUD + preferences |
| `mobile/` | 5 | PWA endpoints |
| `hostel-manager/` | 5 | complaints, allocations |
| `gates/` | 5 | CRUD + metrics |
| `bot/` | 5 | telegram-sync, telegram-verify, commands |
| `assignments/` | 5 | CRUD |
| `occupancy/` | 4 | current, history, zones |
| `guardian/` | 2 | verify (OTP), links/reverify |
| `oie/` | 1 | queue?status=… |
| `lockdown/` | 1 | GET/POST/DELETE active |
| `academic-status/` | 2 | roster (GET/POST) + pending (GET/POST, two-person queue, UNWIRED) |
| `academic-automation/` | 1 | POST path |
| `disputes/` | 1 | attendance disputes |
| `emergency/` | 4 | alerts, response |
| `conduct/` | 4 | anti-ragging |
| `alerts/` | 3 | list, resolve |
| `audit/` | 1 | write |
| `ws/` | 1 | WebSocket |
| `voice/` | 1 | voice ops |
| `traits/` | 1 | user traits |
| `telegram/` | 1 | bot |
| `teaching-bindings/` | 1 | faculty |
| `system/` | 1 | health |
| `status/` | 1 | health |
| `roles-graph/` | 1 | role tree |
| `records/` | 1 | CRUD |
| `profile/` | 1 | update |
| `my/` | 1 | self-service |
| `metrics/` | 1 | Prometheus |
| `features/` | 1 | feature flags |
| `engagement/` | 1 | engagement |
| `docs/` | 1 | docs |
| `feedback/` | 1 | feedback |
| `dev/` | 1 | dev tools |
| `delegations/` | 1 | delegation |
| `deployment/` | 1 | deploy |
| `deputy-warden/` | 1 | curfew |
| `dashboard/` | 1 | overview |
| `class-coordinators/` | 1 | coordinators |
| `class-requests/` | 2 | open/resolve |
| `class-messages/` | 2 | post/release |
| `class-level-issues/` | 2 | resolve |
| `cases/` | 2 | CRUD |
| `caretaker/` | 2 | summary |
| `attention/` | 1 | principal attention |
| `approver/` | 2 | approver surface |
| `attachments/` | 1 | upload |
| `actions/` | 1 | automation |
| `anti-ragging/` | 3 | alert-config |
| `announcements/` | 4 | active, CRUD |
| `classes/` | 4 | CRUD |
| `departments/` | 2 | CRUD |
| `faculty-assignments/` | 2 | CRUD |
| `guardian/` | 2 | verify, reverify |
| `hostel/` | 4 | permissions |
| `me/` | 4 | self |
| `onboarding/` | 3 | enrollment |
| `persons/` | 3 | [id], [id]/history |
| `preferences/` | 2 | theme, settings |
| `support/` | 3 | tickets |
| `traits/` | 1 | traits |

## Write Endpoints with UI Consumers (verified)
| Endpoint | UI Consumer |
|---|---|
| `POST /api/permissions` | `PassCreateFormV2.tsx:150`, `CaretakerCommandBar.tsx` |
| `PATCH /api/permissions/[ticket]` | `CaretakerCommandBar.tsx:171`, `VicePrincipal pending-approvals:108-110`, `CoSignModal.tsx:46`, `ScanDetailModal.tsx:119` |
| `POST /api/permissions/direct-generate` | `principal/passes/page.tsx:67` |
| `POST /api/permissions/bulk` | **NONE (orphan)** |
| `POST /api/passes` | **NONE (orphan; UI uses /api/permissions)** |
| `GET/POST /api/academic-status/pending` | **NONE (orphan; two-person queue unwired)** |
| `PATCH /api/admin/users/[id]` | `UserManagementPanel.tsx:133` |
| `POST /api/admin/users/[id]/reset-password` | `UserManagementPanel.tsx:181` |
| `POST /api/admin/users/bulk/commit` | `UserManagementPanel.tsx:245` |
| `POST/DELETE /api/admin/lockdown` | `admin/lockdown/page.tsx:56,73` |
| `POST /api/academic-automation/{path}` | `admin/academic-automation/page.tsx:102` |
| `PATCH /api/admin/anti-ragging-alert-config` | `admin/anti-ragging-config/page.tsx:26` |
| `POST /api/mess/serve` | `mess/scan/page.tsx:65` |
| `POST /api/mess/issues` | `mess/mess-issues/page.tsx:163` |
| `POST /api/mess/operational-requests` | `mess/operational-requests/page.tsx:138` |
| `POST /api/visitors/me/check-in` | `visitor/visit/page.tsx:65` |
| `POST /api/student/attendance/dispute` | `StudentAttendancePage.tsx:243` |
| `POST /api/student/meal-opt-out` | `student/mess-bill/page.tsx:35` |
| `POST /api/complaints` | `ComplaintForm.tsx:39` |
| `PATCH /api/complaints/[id]` | `ComplaintDetail.tsx:37-79` |
| `POST /api/operator/claim-gate` | `operator/claim/page.tsx:42` |
| `POST /api/operator/mode` | `operator/mode/page.tsx:99` |
| `POST /api/operator/manual-entry` | `operator/manual-entry/page.tsx:139` |
| `PATCH /api/gate/verify-thumbprint` | `BiometricPrompt.tsx:56` |
| `GET /api/gate/verify-pass` | `PassPreview.tsx:137` |
| `PATCH /api/faculty/attendance/roster/[id]` | `FacultyRosterPanel.tsx:153` (component NOT mounted in any page) |

## Broken Client-Side Fetch (OBSERVED)
| Page | Fetches | Status |
|---|---|---|
| `guardian/child-status/page.tsx:39` | `GET /api/pass-requests?wardRoll=…` | **ENDPOINT DOES NOT EXIST.** No `src/app/api/pass-requests/` route. 404 swallowed by catch → empty timeline. |

## Verification Log (2026-11-24)
- 669 total API routes: **CONFIRMED**
- admin/ 131 routes: **CONFIRMED**
- mess/ 49 routes: **CONFIRMED**
- complaints/ 32 routes: **CONFIRMED**
- cron/ 30 routes: **CONFIRMED**
- permissions/ 23 routes: **CONFIRMED**
- sysadmin/ 22 routes: **CONFIRMED**
- analytics/ 20 routes: **CONFIRMED**
- student/ 19 routes: **CONFIRMED**
- passes/ 5 routes: **CONFIRMED**
- academic-status/ 2 routes: **CONFIRMED**
- `/api/pass-requests/` does NOT exist: **CONFIRMED** (ls returns NOT FOUND) — guardian fetch is broken
- `/api/permissions/bulk/route.ts` exists: **CONFIRMED** (orphan, zero UI consumers)
- `/api/permissions/[ticket]/revoke/route.ts` exists: **CONFIRMED** (orphan, zero UI consumers)
- 4 orphan write endpoints (bulk, academic-status/pending, revoke, roster PATCH): **CONFIRMED**
| Page | Fetches | Status |
|---|---|---|
| `guardian/child-status/page.tsx:39` | `GET /api/pass-requests?wardRoll=…` | **ENDPOINT DOES NOT EXIST.** No `src/app/api/pass-requests/` route. 404 swallowed by catch → empty timeline. |
