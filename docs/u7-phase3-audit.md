# U7 Phase 3 — Multiline Wrapper Inventory & Audit

**Date:** 2026-11-26  
**Repository:** `/opt/monitoring/compose` (`git@github.com:jntucej/monitoring.git`, branch `main`)  
**Baseline:** `8468da7f` (`feat: U7 Phase 2 Batch C — migrate upload route + Phase 2 tests + ledger`)  
**Status:** Audit Only (no source-code changes, no deployment)

---

## 1. Exhaustive AST Inventory (`src/app/api/**/route.ts`)

Scanned all **798** API route files using the TypeScript compiler AST, covering **all 996 exported HTTP method sites** (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, including `export async function` declarations and `withMutationGuard` / `withAdminMutation` / `withMessMutation` wrappers, plus a check for aliased local `withAuthorization` variables):

| Category (Method-Level Sites) | Site Count | Notes |
|---|---:|---|
| Already migrated to `withApiChain` (U7 Phase 1 + 2) | 51 | 6 Phase 1 + 45 Phase 2 |
| **Inverted (`withRateLimit` → `withAuthorization`)** | **234** | **Across 229 unique files (0 aliased/indirect)** |
| Correctly ordered (`withAuthorization` → `withRateLimit`) | 7 | Already safe; no migration required |
| `withAuthorization` only (no `withRateLimit`) | 370 | No rate-limit wrapper |
| `withRateLimit` only (public / pre-auth) | 46 | IP/key-scoped by design |
| `withMutationGuard` / `withAdminMutation` / `withMessMutation` | 236 | Already correctly ordered (`withAuthorization` → `withRateLimit` → `assertCsrf`) |
| Unwrapped / `export async function` handlers | 52 | `/api/health`, `/api/cron/*`, `/api/webhooks/*`, `/api/csrf`, etc. |
| **Total exported HTTP method sites** | **996** | **`51 + 234 + 7 + 370 + 46 + 236 + 52 = 996` across 798 files** |

### File-Level Reconciliation (All 798 Unique `route.ts` Files)

| File-Level Bucket (Mutually Exclusive) | File Count | Notes |
|---|---:|---|
| Contains inverted `withRateLimit` → `withAuthorization` | 229 | Holds all 234 inverted sites |
| Migrated to `withApiChain` (Phase 1 + 2) | 48 | Holds all 51 `withApiChain` sites |
| Correctly ordered `withAuthorization` → `withRateLimit` | 6 | Holds all 7 correctly ordered sites |
| `withAuthorization` only | 318 | No `withRateLimit` |
| `withRateLimit` only (public / pre-auth) | 33 | IP/key-scoped |
| `withMutationGuard` / `withAdminMutation` / `withMessMutation` only | 115 | Already correctly ordered |
| Unwrapped / `export async function` only | 49 | 30 `cron` (`requireCronAuth`), 3 `webhook` (HMAC/secret), 2 inline `rateLimit`, 14 public/unwrapped |
| **Total unique `route.ts` files** | **798** | **`229 + 48 + 6 + 318 + 33 + 115 + 49 = 798` (0 unaccounted)** |

### Inverted Sites Breakdown (234 sites across 229 files)
- **By HTTP method:** `GET`: 216, `POST`: 16, `PATCH`: 2
- **Classification:** All **234** sites are **Confirmed migration required** (all require `withAuthorization`, none are public/pre-auth, 0 false positives).
- **Special flags:** `admin/sysadmin`: 80, `assertCsrf`: 21, `SSE`: 1 (`GET /api/admin/alerts/stream`), `Upload`: 0.

---

## 2. Behavioral Risk Analysis

1. **IP-based → User-based Rate-Limit Buckets:** All 234 sites currently bucket by IP because `withRateLimit` runs before `withAuthorization`. Migrating to `withApiChain` switches them to verified `u:<userId>` buckets, eliminating shared-NAT collisions and preventing unauthenticated 401 probes from consuming rate-limit quota.
2. **Auth & RBAC Ordering:** `withAuthorization` runs first, preserving `requiredRole`, `requiredPermission`, device binding, and `passwordMustChange` gates.
3. **CSRF Exceptions:** 16 of 18 mutating sites already call `assertCsrf`. Two auth mutations (`POST /api/auth/logout-all`, `POST /api/auth/step-up`) do not call `assertCsrf` at the route level (edge `src/middleware.ts` still checks `validateCsrf`); preserve `csrf: false` or explicitly confirm `csrf: true` before Batch 3A.
4. **SSE Streaming:** `GET /api/admin/alerts/stream` returns `text/event-stream`; `withApiChain` without `bodySchema` does not buffer responses.
5. **Logging & Headers:** U6 `metricsMiddleware` emits exactly one `http.request` JSON line and strips internal `x-auth-*` / `x-u6-*` headers.

---

## 3. Proposed Migration Batches

### Batch 3A — Mutating `POST` / `PATCH` Sites (18 sites, High Priority)

| # | Method | Route | Lines | Auth / RBAC | Rate Limit | Flags |
|---|---|---|---|---|---|---|
| 1 | `POST` | `/api/academic-status` | `295-298` | `{ requiredRole: ["hod", "dean", "principal", "vice_principal", "chief_warden", "admin", "sysadmin"] }` | `{ keyPrefix: "academic-status-post", maxRequests: 20, windowMs: 60_000 }` | CSRF,JSON |
| 2 | `POST` | `/api/admin/backup` | `148-151` | `{ requiredRole: ["sysadmin"] }` | `{ keyPrefix: "admin_backup_post", maxRequests: 20, windowMs: 60 * 1000 }` | CSRF,JSON |
| 3 | `PATCH` | `/api/admin/gates/[id]` | `150-153` | `{ requiredRole: ["sysadmin"] }` | `adminLimit` | CSRF,JSON |
| 4 | `POST` | `/api/alerts/assign` | `99-105` | `{ requiredRole: ["sysadmin", "admin", "supervisor", "principal"] as Role[] }` | `{ windowMs: 60_000, maxRequests: 60, }` | CSRF,JSON |
| 5 | `POST` | `/api/auth/logout-all` | `59-62` | default | `{ windowMs: 60 * 1000, maxRequests: 10, keyPrefix: "logout_all_limit" }` | — |
| 6 | `POST` | `/api/auth/step-up` | `65-68` | default | `{ windowMs: 60_000, maxRequests: 6, keyPrefix: "step-up" }` | JSON |
| 7 | `POST` | `/api/bot/telegram-sync` | `409-412` | `{ requiredRole: ["sysadmin"] }` | `{ keyPrefix: "telegram_sync", maxRequests: 30 }` | CSRF,JSON |
| 8 | `POST` | `/api/campus/events/[id]/attend` | `138-141` | `{ requiredRole: [...ATTEND_ROLES] }` | `attendLimit` | CSRF,JSON |
| 9 | `POST` | `/api/conduct/flags/[userId]/clear` | `43-46` | `{ requiredRole: ["admin", "sysadmin"] }` | `{ keyPrefix: "conduct-flag-clear", maxRequests: 10, windowMs: 60_000 }` | CSRF,JSON |
| 10 | `POST` | `/api/conduct/flags/[userId]/set` | `54-57` | `{ requiredRole: ["admin", "sysadmin"] }` | `{ keyPrefix: "conduct-flag-set", maxRequests: 10, windowMs: 60_000 }` | CSRF,JSON |
| 11 | `POST` | `/api/gate/scan` | `30-135` | `{ requiredRole: TIER.OPERATOR }` | `{ keyPrefix: "gate_scan", maxRequests: 5_000, windowMs: 60_000 }` | CSRF,JSON |
| 12 | `POST` | `/api/guardian/verify` | `65-68` | `{ requiredRole: ["guardian", "parent", "admin", "sysadmin"] }` | `{ windowMs: 60_000, maxRequests: 5 }` | CSRF,JSON |
| 13 | `PATCH` | `/api/hod/flexible-class/[id]` | `99-102` | `{ requiredRole: ["hod", "principal", "admin", "sysadmin", "vice_principal", "dean"] }` | `{ keyPrefix: "hod-flex-approval", maxRequests: 30, windowMs: 60_000 }` | CSRF,JSON |
| 14 | `POST` | `/api/operator/entry-type` | `467-473` | `{ requiredRole: ["operator", "supervisor", "admin", "sysadmin"] as Role[] }` | `{ windowMs: 60_000, maxRequests: 60, }` | CSRF,JSON |
| 15 | `POST` | `/api/operator/manual-entry` | `156-159` | `{ requiredRole: TIER.OPERATOR }` | `{ keyPrefix: "manual_entry", maxRequests: 20, windowMs: 60_000 }` | CSRF,JSON |
| 16 | `POST` | `/api/permissions/bulk` | `279-300` | `{ requiredRole: [ "caretaker", "deputy_warden", "hostel_manager", "principal", "principal", "vice_principal", "hod", "faculty", "oie", "operator", "admin", "sysadmin", ], }` | `{ keyPrefix: "permission_bulk", maxRequests: 30, }` | CSRF,JSON |
| 17 | `POST` | `/api/student/curfew-acknowledge` | `62-65` | `{ requiredRole: ["student"] }` | `{ windowMs: 60_000, maxRequests: 5 }` | CSRF,JSON |
| 18 | `POST` | `/api/sysadmin/operations` | `104-107` | `{ requiredRole: ["sysadmin"] }` | `{ keyPrefix: "sysadmin_operations", maxRequests: 30 }` | CSRF,JSON |

### Batch 3B — Privileged `admin/` & `sysadmin/` `GET` Sites (77 sites, Medium Priority)

| # | Method | Route | Lines | Auth / RBAC | Rate Limit | Flags |
|---|---|---|---|---|---|---|
| 1 | `GET` | `/api/admin/access/overview` | `67-134` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ keyPrefix: "admin_access_overview", windowMs: 60_000, maxRequests: 60 }` | — |
| 2 | `GET` | `/api/admin/alerts/overview` | `72-255` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ keyPrefix: "admin_alerts_overview", windowMs: 60_000, maxRequests: 120 }` | — |
| 3 | `GET` | `/api/admin/alerts/runbooks/overview` | `46-77` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ keyPrefix: "admin_alerts_runbooks_overview", windowMs: 60_000, maxRequests: 120 }` | — |
| 4 | `GET` | `/api/admin/alerts/safety/overview` | `52-118` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ keyPrefix: "admin_alerts_safety_overview", windowMs: 60_000, maxRequests: 120 }` | — |
| 5 | `GET` | `/api/admin/alerts/stream` | `151-154` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ keyPrefix: "admin_alerts_stream", maxRequests: 120 }` | SSE |
| 6 | `GET` | `/api/admin/announcements/[id]` | `26-29` | `{ requiredRole: ["admin", "sysadmin"] }` | `{ keyPrefix: "admin_announcements", ...RATE_LIMITS.read }` | JSON |
| 7 | `GET` | `/api/admin/announcements` | `46-49` | `{ requiredRole: ["admin", "sysadmin"] }` | `{ keyPrefix: "admin_announcements", ...RATE_LIMITS.read }` | — |
| 8 | `GET` | `/api/admin/audit-logs` | `185-188` | `{ requiredRole: ["admin", "sysadmin"] }` | `{ keyPrefix: "admin_audit_logs", maxRequests: 300 }` | — |
| 9 | `GET` | `/api/admin/audit` | `63-66` | `{ requiredRole: ["admin", "sysadmin"] }` | `{ keyPrefix: "admin_audit", maxRequests: 60 }` | — |
| 10 | `GET` | `/api/admin/automation/deployments/overview` | `37-117` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ windowMs: 60_000, maxRequests: 60 }` | — |
| 11 | `GET` | `/api/admin/automation/jobs/overview` | `21-167` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ windowMs: 60_000, maxRequests: 60 }` | — |
| 12 | `GET` | `/api/admin/automation/maintenance/overview` | `12-59` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ windowMs: 60_000, maxRequests: 60 }` | — |
| 13 | `GET` | `/api/admin/backup` | `143-146` | `{ requiredRole: ["admin", "sysadmin"] }` | `{ keyPrefix: "admin_backup_get", maxRequests: 30 }` | CSRF,JSON |
| 14 | `GET` | `/api/admin/dashboard` | `19-22` | `{ requiredRole: ['admin', 'sysadmin'] }` | `{ keyPrefix: 'admin_dashboard', maxRequests: 60 }` | — |
| 15 | `GET` | `/api/admin/data/overview` | `50-142` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ windowMs: 60_000, maxRequests: 60 }` | — |
| 16 | `GET` | `/api/admin/deployments/overview` | `66-149` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ windowMs: 60_000, maxRequests: 60 }` | — |
| 17 | `GET` | `/api/admin/device-settings` | `57-65` | `{ requiredRole: ["sysadmin", "admin"], }` | `{ keyPrefix: "device_settings_get", maxRequests: 100, }` | — |
| 18 | `GET` | `/api/admin/exceptions` | `110-113` | `{ requiredRole: TIER.ADMIN }` | `{ keyPrefix: "admin_exceptions", maxRequests: 60 }` | — |
| 19 | `GET` | `/api/admin/faculty-tracking/monthly` | `166-169` | `{ requiredRole: ["admin", "sysadmin", "principal", "hod"] }` | `{ keyPrefix: "admin-faculty-monthly", maxRequests: 20, windowMs: 60_000 }` | — |
| 20 | `GET` | `/api/admin/gate-device-configuration` | `73-76` | `{ requiredRole: ["admin", "sysadmin"] }` | `{ keyPrefix: "admin_gate_device_config", maxRequests: 60 }` | — |
| 21 | `GET` | `/api/admin/gates/[id]/metrics` | `173-176` | `{ requiredRole: ["admin", "sysadmin"] }` | `readLimit` | — |
| 22 | `GET` | `/api/admin/gates/[id]` | `145-148` | `{ requiredRole: ["sysadmin"] }` | `adminLimit` | CSRF,JSON |
| 23 | `GET` | `/api/admin/gates/devices/overview` | `55-58` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ windowMs: 60000, maxRequests: 60 }` | — |
| 24 | `GET` | `/api/admin/gates` | `161-164` | `{ requiredRole: ["admin", "sysadmin"] }` | `readLimit` | JSON |
| 25 | `GET` | `/api/admin/gates/schedule` | `250-253` | `{ requiredRole: ["admin", "sysadmin"] }` | `readLimit` | JSON |
| 26 | `GET` | `/api/admin/governance/audit/overview` | `73-134` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ windowMs: 60_000, maxRequests: 60 }` | — |
| 27 | `GET` | `/api/admin/governance/compliance/overview` | `54-162` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ windowMs: 60_000, maxRequests: 60 }` | — |
| 28 | `GET` | `/api/admin/health/overview` | `38-156` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ windowMs: 60_000, maxRequests: 60 }` | — |
| 29 | `GET` | `/api/admin/identity/people/overview` | `29-140` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ windowMs: 60_000, maxRequests: 120 }` | — |
| 30 | `GET` | `/api/admin/institutional-configuration` | `139-142` | `{ requiredRole: ["admin", "sysadmin"] }` | `{ keyPrefix: "admin_institutional_config", maxRequests: 60 }` | — |
| 31 | `GET` | `/api/admin/jobs/overview` | `48-188` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ windowMs: 60_000, maxRequests: 60 }` | — |
| 32 | `GET` | `/api/admin/kiosk` | `112-115` | `{ requiredRole: ["sysadmin"] }` | `adminLimit` | JSON |
| 33 | `GET` | `/api/admin/lockdown` | `64-67` | `{ requiredRole: ["admin", "sysadmin", "operator", "principal", "supervisor"] }` | `{ keyPrefix: "lockdown_get", maxRequests: 120 }` | JSON |
| 34 | `GET` | `/api/admin/maintenance/overview` | `58-119` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ windowMs: 60_000, maxRequests: 60 }` | — |
| 35 | `GET` | `/api/admin/monitoring/health/overview` | `33-210` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ windowMs: 60_000, maxRequests: 60 }` | — |
| 36 | `GET` | `/api/admin/monitoring` | `49-52` | `{ requiredRole: ["sysadmin"] }` | `{ keyPrefix: "mon_proxy", maxRequests: 120 }` | — |
| 37 | `GET` | `/api/admin/notification-settings` | `70-73` | `{ requiredRole: ["admin", "sysadmin"] }` | `{ keyPrefix: "admin_notification_settings", maxRequests: 60 }` | — |
| 38 | `GET` | `/api/admin/overview` | `35-253` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ windowMs: 60_000, maxRequests: 120 }` | — |
| 39 | `GET` | `/api/admin/people/[id]` | `32-171` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ windowMs: 60_000, maxRequests: 60 }` | — |
| 40 | `GET` | `/api/admin/people/overview` | `27-193` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ windowMs: 60_000, maxRequests: 60 }` | — |
| 41 | `GET` | `/api/admin/permission-policies` | `103-106` | `{ requiredRole: ["admin", "sysadmin"] }` | `{ keyPrefix: "admin_permission_policies", maxRequests: 60 }` | — |
| 42 | `GET` | `/api/admin/platform/feature-flags/overview` | `20-84` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ windowMs: 60000, maxRequests: 60 }` | — |
| 43 | `GET` | `/api/admin/platform/integrations/overview` | `28-99` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ windowMs: 60000, maxRequests: 60 }` | — |
| 44 | `GET` | `/api/admin/platform/notifications/overview` | `29-177` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ windowMs: 60000, maxRequests: 60 }` | — |
| 45 | `GET` | `/api/admin/platform/reasons/overview` | `19-48` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ windowMs: 60000, maxRequests: 60 }` | — |
| 46 | `GET` | `/api/admin/platform/system/overview` | `26-76` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ windowMs: 60000, maxRequests: 60 }` | — |
| 47 | `GET` | `/api/admin/platform/webhooks/overview` | `21-90` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ windowMs: 60000, maxRequests: 60 }` | — |
| 48 | `GET` | `/api/admin/promotions/overview` | `36-217` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ windowMs: 60_000, maxRequests: 60 }` | — |
| 49 | `GET` | `/api/admin/reference/departments/overview` | `93-96` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ windowMs: 60000, maxRequests: 60 }` | — |
| 50 | `GET` | `/api/admin/reference/hostel-tickets/overview` | `104-107` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ windowMs: 60000, maxRequests: 60 }` | — |
| 51 | `GET` | `/api/admin/safety/overview` | `42-139` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ keyPrefix: "admin_safety_overview", windowMs: 60_000, maxRequests: 120 }` | — |
| 52 | `GET` | `/api/admin/security/lockout` | `123-126` | `{ requiredRole: ["sysadmin"] }` | `adminLimit` | JSON |
| 53 | `GET` | `/api/admin/security/password-policy` | `112-115` | `{ requiredRole: ["sysadmin"] }` | `adminLimit` | JSON |
| 54 | `GET` | `/api/admin/staff-tracking/monthly` | `145-148` | `{ requiredRole: ["admin", "sysadmin"] }` | `{ keyPrefix: "admin-staff-monthly", maxRequests: 20, windowMs: 60_000 }` | — |
| 55 | `GET` | `/api/admin/support/tickets/[id]/comments` | `83-86` | `{ requiredRole: ["admin", "sysadmin", "operator"] }` | `{ keyPrefix: "ticket_comments_get", maxRequests: 60 }` | JSON |
| 56 | `GET` | `/api/admin/support/tickets` | `40-43` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ keyPrefix: "admin_support_tickets", ...RATE_LIMITS.read }` | — |
| 57 | `GET` | `/api/admin/users/[id]` | `305-308` | `{ requiredRole: ["admin", "sysadmin"] }` | `{ keyPrefix: "admin_user_get", maxRequests: 300, windowMs: 60_000 }` | JSON |
| 58 | `GET` | `/api/admin/worker-shifts/monthly` | `148-151` | `{ requiredRole: ["admin", "sysadmin"] }` | `{ keyPrefix: "admin-worker-monthly", maxRequests: 20, windowMs: 60_000 }` | — |
| 59 | `GET` | `/api/admin/workflow-configuration` | `100-103` | `{ requiredRole: ["admin", "sysadmin"] }` | `{ keyPrefix: "admin_workflow_config", maxRequests: 60 }` | — |
| 60 | `GET` | `/api/sysadmin/actions` | `83-86` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ keyPrefix: "sysadmin_actions", maxRequests: 120 }` | — |
| 61 | `GET` | `/api/sysadmin/application-health` | `48-51` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ keyPrefix: "sysadmin_app_health", maxRequests: 120 }` | — |
| 62 | `GET` | `/api/sysadmin/approvals/two-person` | `83-86` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ keyPrefix: "two-person-get", maxRequests: 30, windowMs: 60_000 }` | JSON |
| 63 | `GET` | `/api/sysadmin/automation-controls` | `56-59` | `{ requiredRole: ["sysadmin"] }` | `{ keyPrefix: "sysadmin_automation_controls", maxRequests: 120 }` | — |
| 64 | `GET` | `/api/sysadmin/backup-status` | `77-80` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ keyPrefix: "sysadmin_backup_status", maxRequests: 60 }` | — |
| 65 | `GET` | `/api/sysadmin/database-health` | `71-74` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ keyPrefix: "sysadmin_db_health", maxRequests: 60 }` | — |
| 66 | `GET` | `/api/sysadmin/deployments` | `76-79` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ keyPrefix: "sysadmin_deployments", maxRequests: 60 }` | — |
| 67 | `GET` | `/api/sysadmin/domains/monthly-review` | `96-99` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ keyPrefix: "sysadmin-monthly-review", maxRequests: 20, windowMs: 60_000 }` | — |
| 68 | `GET` | `/api/sysadmin/forecasts` | `123-126` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ keyPrefix: "sysadmin_forecasts", maxRequests: 120 }` | — |
| 69 | `GET` | `/api/sysadmin/infrastructure` | `106-109` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ keyPrefix: "sysadmin_infrastructure", maxRequests: 120 }` | — |
| 70 | `GET` | `/api/sysadmin/logs` | `76-79` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ keyPrefix: "sysadmin_logs", maxRequests: 120 }` | — |
| 71 | `GET` | `/api/sysadmin/network` | `87-90` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ keyPrefix: "sysadmin_network", maxRequests: 60 }` | — |
| 72 | `GET` | `/api/sysadmin/operations/agent-status` | `35-38` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ keyPrefix: "sysadmin_agent_status", maxRequests: 120 }` | — |
| 73 | `GET` | `/api/sysadmin/redis-worker` | `59-62` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ keyPrefix: "sysadmin_redis_worker", maxRequests: 60 }` | — |
| 74 | `GET` | `/api/sysadmin/redis` | `132-135` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ keyPrefix: "sysadmin_redis", maxRequests: 60 }` | — |
| 75 | `GET` | `/api/sysadmin/rls/drift` | `65-68` | `{ requiredRole: ["sysadmin"] }` | `{ keyPrefix: "rls-drift", maxRequests: 5, windowMs: 300_000 }` | — |
| 76 | `GET` | `/api/sysadmin/services` | `75-78` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ keyPrefix: "sysadmin_services", maxRequests: 120 }` | — |
| 77 | `GET` | `/api/sysadmin/worker-jobs` | `40-106` | `{ requiredRole: ["sysadmin", "admin"] }` | `{ keyPrefix: "sysadmin_worker_jobs", maxRequests: 60 }` | — |

### Batch 3C — Domain & Role `GET` Sites (139 sites, Standard Priority)

| # | Method | Route | Lines | Auth / RBAC | Rate Limit | Flags |
|---|---|---|---|---|---|---|
| 1 | `GET` | `/api/academic-status/pending` | `132-135` | `{ requiredRole: APPROVER_ROLES }` | `{ keyPrefix: "academic-status-pending-get", maxRequests: 30, windowMs: 60_000 }` | JSON |
| 2 | `GET` | `/api/academic-status` | `290-293` | `{ requiredRole: ["hod", "admin", "sysadmin"] }` | `{ keyPrefix: "academic-status-get", maxRequests: 30, windowMs: 60_000 }` | CSRF,JSON |
| 3 | `GET` | `/api/alerts` | `86-89` | `{ requiredRole: ['admin', 'sysadmin', 'supervisor', 'principal', 'vice_principal', 'dean', 'hod'] }` | `{ keyPrefix: 'alerts_list', maxRequests: 60 }` | — |
| 4 | `GET` | `/api/analytics/enhanced` | `134-137` | `{ requiredRole: ["admin", "sysadmin"] }` | `{ keyPrefix: "enhanced_analytics", maxRequests: 60 }` | — |
| 5 | `GET` | `/api/analytics/sustainability` | `22-25` | `{ requiredRole: ["admin", "sysadmin"] }` | `{ keyPrefix: "sustainability_analytics", maxRequests: 60 }` | — |
| 6 | `GET` | `/api/analytics/traffic` | `22-25` | `{ requiredRole: ["admin", "sysadmin"] }` | `{ keyPrefix: "traffic_analytics", maxRequests: 60 }` | — |
| 7 | `GET` | `/api/analytics/webhooks` | `22-25` | `{ requiredRole: ["admin", "sysadmin"] }` | `{ keyPrefix: "webhooks_analytics", maxRequests: 60 }` | — |
| 8 | `GET` | `/api/approver/decision-history` | `120-123` | `{}` | `{ keyPrefix: "approver-decision-history", maxRequests: 30, windowMs: 60_000 }` | — |
| 9 | `GET` | `/api/attendance_records` | `76-81` | `{ requiredRole: ["admin", "sysadmin", "operator", "faculty", "principal", "supervisor"], }` | `{ keyPrefix: "att_records", maxRequests: 60 }` | JSON |
| 10 | `GET` | `/api/attention/queue` | `669-672` | `{ requiredRole: ALL_ROLES }` | `readLimit` | — |
| 11 | `GET` | `/api/attention/timeline` | `241-244` | `{ requiredRole: [...ALL_ROLES] }` | `readLimit` | — |
| 12 | `GET` | `/api/bot/session/current` | `127-130` | `{ requiredRole: [...TIER.APP] }` | `{ keyPrefix: "bot_session_get", maxRequests: 60 }` | — |
| 13 | `GET` | `/api/bot/telegram-sync` | `404-407` | `{ requiredRole: ["sysadmin"] }` | `{ keyPrefix: "telegram_sync_get", maxRequests: 60 }` | CSRF,JSON |
| 14 | `GET` | `/api/campus-extra/saved-views` | `149-152` | default | `readLimit` | JSON |
| 15 | `GET` | `/api/campus/communities/[id]/posts` | `275-278` | `{ requiredRole: [...READ_ROLES] }` | `{ ...RATE_LIMITS.read, keyPrefix: "community_posts" }` | JSON |
| 16 | `GET` | `/api/campus/communities/[id]` | `126-129` | `{ requiredRole: [...READ_ROLES] }` | `{ ...RATE_LIMITS.read, keyPrefix: "communities" }` | — |
| 17 | `GET` | `/api/campus/communities` | `241-244` | `{ requiredRole: [...READ_ROLES] }` | `{ ...RATE_LIMITS.read, keyPrefix: "communities" }` | JSON |
| 18 | `GET` | `/api/campus/events/me/registrations` | `39-42` | `{ requiredRole: ["student", "guardian", "parent", "admin"] }` | `{ keyPrefix: "events-me-regs", maxRequests: 60, windowMs: 60_000 }` | — |
| 19 | `GET` | `/api/caretaker/maintenance` | `138-141` | `{ requiredRole: [...ROLES] }` | `readLimit` | — |
| 20 | `GET` | `/api/caretaker/summary` | `174-177` | `{ requiredRole: [...ROLES] }` | `readLimit` | — |
| 21 | `GET` | `/api/classes/[id]` | `15-69` | `{ requiredRole: ["hod", "faculty", "admin", "sysadmin"] }` | `{ keyPrefix: "class_id", maxRequests: 30, windowMs: 60_000 }` | JSON |
| 22 | `GET` | `/api/classes/[id]/students` | `66-137` | `{ requiredRole: ["hod", "faculty", "admin", "sysadmin"] }` | `{ keyPrefix: "class_students", maxRequests: 30, windowMs: 60_000 }` | — |
| 23 | `GET` | `/api/classes` | `45-81` | `{ requiredRole: ["hod", "admin", "sysadmin"] }` | `{ keyPrefix: "classes", maxRequests: 30, windowMs: 60_000 }` | JSON |
| 24 | `GET` | `/api/complaints/monthly-review` | `132-135` | `{ requiredRole: ["admin", "sysadmin", "principal"] }` | `{ keyPrefix: "complaints-monthly-review", maxRequests: 20, windowMs: 60_000 }` | — |
| 25 | `GET` | `/api/conduct/events` | `55-58` | `{ requiredRole: ["student", "guardian", "parent", "admin", "sysadmin", "principal", "deputy_warden", "hostel_manager"] }` | `{ keyPrefix: "conduct-events", maxRequests: 30, windowMs: 60_000 }` | — |
| 26 | `GET` | `/api/conduct/flags/[userId]` | `51-54` | `{ requiredRole: ["student", "guardian", "parent", "admin", "sysadmin", "principal", "deputy_warden", "hostel_manager"] }` | `{ keyPrefix: "conduct-flag", maxRequests: 30, windowMs: 60_000 }` | — |
| 27 | `GET` | `/api/config/pass-types` | `95-98` | `{ requiredRole: ['student', 'parent', 'admin', 'sysadmin', 'faculty', 'principal'] }` | `{ keyPrefix: 'config_pass_types_get', maxRequests: 100 }` | JSON |
| 28 | `GET` | `/api/config/subjects` | `35-59` | `{ requiredRole: ["faculty", "hod", "admin", "student", "sysadmin"] }` | `{ keyPrefix: "subjects", maxRequests: 30, windowMs: 60_000 }` | — |
| 29 | `GET` | `/api/dashboard/hostel` | `85-88` | `{ requiredRole: ["admin", "sysadmin", "principal", "vice_principal"] }` | `{ keyPrefix: "dashboard_hostel", maxRequests: 60 }` | — |
| 30 | `GET` | `/api/delegations/graph` | `64-67` | `{ requiredRole: ["admin", "sysadmin", "principal", "dean"] }` | `{ keyPrefix: "delegation-graph", maxRequests: 20, windowMs: 60_000 }` | — |
| 31 | `GET` | `/api/departments/[dept]/classes` | `56-100` | `{ requiredRole: ["hod", "admin", "sysadmin"] }` | `{ keyPrefix: "dept_classes", maxRequests: 30, windowMs: 60_000 }` | — |
| 32 | `GET` | `/api/deployment/logs` | `42-45` | `{ requiredRole: ["sysadmin"] }` | `{ keyPrefix: "deployment_logs", maxRequests: 20 }` | — |
| 33 | `GET` | `/api/disputes` | `84-87` | `{ requiredRole: ["student", "guardian", "parent", "admin", "sysadmin"] }` | `{ keyPrefix: "disputes-get", maxRequests: 60, windowMs: 60_000 }` | JSON |
| 34 | `GET` | `/api/engagement/achievements/review` | `92-95` | `{ requiredRole: ["student", "parent", "guardian", "admin", "sysadmin"] }` | `{ keyPrefix: "engagement-ach-review", maxRequests: 30, windowMs: 60_000 }` | — |
| 35 | `GET` | `/api/exam/access-exceptions` | `146-151` | `{ requiredRole: ["oie", "exam_superintendent", "exam_branch", "admin", "sysadmin", "principal", "vice_principal"], }` | `{ keyPrefix: "exam_access_exceptions", maxRequests: 60 }` | JSON |
| 36 | `GET` | `/api/exam/access` | `107-112` | `{ requiredRole: ["exam_superintendent", "exam_branch", "oie", "vice_principal", "principal", "admin", "sysadmin"], }` | `{ keyPrefix: "exam_access", maxRequests: 60 }` | — |
| 37 | `GET` | `/api/exam/candidate-attendance` | `72-77` | `{ requiredRole: ["oie", "admin", "sysadmin", "principal", "vice_principal"], }` | `{ keyPrefix: "exam_candidate_attendance", maxRequests: 60 }` | — |
| 38 | `GET` | `/api/exam/eligibility-rules` | `64-67` | `{ requiredRole: ["controller_examinations", "oie", "exam_branch", "admin", "sysadmin"] }` | `{ keyPrefix: "exam-elig-get", maxRequests: 20, windowMs: 60_000 }` | JSON |
| 39 | `GET` | `/api/exam/superintendent` | `7-16` | `{ requiredRole: TIER.APPROVER }` | `{ ...RATE_LIMITS.read, keyPrefix: "exam_superintendent_get" }` | — |
| 40 | `GET` | `/api/faculty-assignments` | `15-55` | `{ requiredRole: ["hod", "faculty", "admin", "sysadmin"] }` | `{ keyPrefix: "faculty_assignments", maxRequests: 30, windowMs: 60_000 }` | JSON |
| 41 | `GET` | `/api/faculty/assignments` | `67-70` | `{ requiredRole: ["faculty", "student", "hod", "admin", "sysadmin"] }` | `{ keyPrefix: "faculty-assignments-get", maxRequests: 30, windowMs: 60_000 }` | JSON |
| 42 | `GET` | `/api/faculty/attendance/roster` | `190-193` | `{ requiredRole: ["faculty", "hod", "admin", "sysadmin"] }` | `{ keyPrefix: "faculty-roster", maxRequests: 30, windowMs: 60_000 }` | — |
| 43 | `GET` | `/api/faculty/attendance/student-disputes` | `72-75` | `{ requiredRole: TIER.OPERATOR }` | `{ keyPrefix: "faculty-student-disputes", maxRequests: 30, windowMs: 60_000 }` | — |
| 44 | `GET` | `/api/faculty/marks` | `116-119` | `{ requiredRole: ["faculty", "hod", "admin", "sysadmin"] }` | `{ keyPrefix: "faculty-marks-get", maxRequests: 30, windowMs: 60_000 }` | JSON |
| 45 | `GET` | `/api/faculty/materials` | `73-76` | `{ requiredRole: ["faculty", "student", "parent", "guardian", "hod", "admin", "sysadmin"] }` | `{ keyPrefix: "faculty-materials-get", maxRequests: 30, windowMs: 60_000 }` | JSON |
| 46 | `GET` | `/api/faculty/mentees` | `48-51` | `{ requiredRole: ["faculty", "hod", "admin", "sysadmin"] }` | `{ keyPrefix: "faculty-mentees", maxRequests: 30, windowMs: 60_000 }` | — |
| 47 | `GET` | `/api/faculty/my-class/[id]` | `251-254` | `{ requiredRole: ["faculty"] }` | `{ keyPrefix: "my_class", maxRequests: 30, windowMs: 60_000 }` | — |
| 48 | `GET` | `/api/faculty/my-classes` | `152-155` | `{ requiredRole: ["faculty"] }` | `{ keyPrefix: "my_classes", maxRequests: 30, windowMs: 60_000 }` | — |
| 49 | `GET` | `/api/faculty` | `41-44` | `{ requiredRole: ["admin", "sysadmin", "hod", "faculty", "staff"] }` | `{ keyPrefix: "faculty_list", maxRequests: 30 }` | — |
| 50 | `GET` | `/api/gate/devices` | `193-196` | `{ requiredRole: ["admin", "sysadmin"] }` | `{ keyPrefix: "gate_devices", maxRequests: 60 }` | — |
| 51 | `GET` | `/api/gate/logs` | `49-52` | `{ requiredRole: ['admin', 'sysadmin', 'operator'] }` | `{ keyPrefix: 'gate_logs_list', maxRequests: 100 }` | — |
| 52 | `GET` | `/api/gate/verify-leave-chain` | `76-79` | `{ requiredRole: ["operator", "supervisor", "admin", "sysadmin"] }` | `{ keyPrefix: "gate-verify-leave-chain", maxRequests: 30, windowMs: 60_000 }` | — |
| 53 | `GET` | `/api/gates` | `114-117` | `{ requiredRole: ["admin", "sysadmin", "operator", "supervisor", "principal"] }` | `{ keyPrefix: "gate_get", maxRequests: 50 }` | JSON |
| 54 | `GET` | `/api/hod/exam-review` | `71-74` | `{ requiredRole: ["hod", "controller_examinations", "admin", "sysadmin"] }` | `{ keyPrefix: "hod-exam-review-get", maxRequests: 30, windowMs: 60_000 }` | JSON |
| 55 | `GET` | `/api/hod/faculty` | `48-51` | `{ requiredRole: ["admin", "sysadmin", "faculty", "hod", "staff"] }` | `{ keyPrefix: "hod_faculty", maxRequests: 30 }` | — |
| 56 | `GET` | `/api/hostel-manager/housekeeping-tasks` | `101-104` | `{ requiredRole: [...ROLES] }` | `readLimit` | — |
| 57 | `GET` | `/api/hostel-manager/incidents` | `104-107` | `{ requiredRole: ["hostel_manager", "deputy_warden", "chief_warden", "principal", "admin", "sysadmin"] }` | `{ keyPrefix: "hostel-incidents-get", maxRequests: 30, windowMs: 60_000 }` | JSON |
| 58 | `GET` | `/api/hostel-manager/summary` | `88-91` | `{ requiredRole: [...ROLES] }` | `readLimit` | — |
| 59 | `GET` | `/api/mess/analytics` | `133-136` | `{ requiredRole: TIER.MESS_INCHARGE }` | `{ keyPrefix: "mess_analytics_get" }` | — |
| 60 | `GET` | `/api/mess/arrivals` | `161-164` | `{ requiredRole: TIER.MESS_INCHARGE }` | `{ keyPrefix: "mess_arrivals_get" }` | JSON |
| 61 | `GET` | `/api/mess/attendance` | `69-72` | `{ requiredRole: TIER.MESS_INCHARGE }` | `{ keyPrefix: "mess_attendance_get" }` | — |
| 62 | `GET` | `/api/mess/bills` | `38-41` | `{ requiredRole: ["mess_incharge", "admin", "sysadmin"] }` | `{ keyPrefix: "mess-bills", maxRequests: 20, windowMs: 60_000 }` | — |
| 63 | `GET` | `/api/mess/consumption` | `83-86` | `{ requiredRole: TIER.MESS_INCHARGE }` | `{ keyPrefix: "mess_consumption_get" }` | — |
| 64 | `GET` | `/api/mess/days` | `112-115` | `{ requiredRole: TIER.MESS_INCHARGE }` | `{ keyPrefix: "mess_days_get" }` | JSON |
| 65 | `GET` | `/api/mess/default` | `88-91` | `{ requiredRole: ["student"] }` | `{ keyPrefix: "mess_default_get" }` | JSON |
| 66 | `GET` | `/api/mess/history` | `76-79` | `{ requiredRole: ["student"] }` | `{ keyPrefix: "mess_history_get" }` | — |
| 67 | `GET` | `/api/mess/inventory` | `51-54` | `{ requiredRole: TIER.MESS_INCHARGE }` | `{ keyPrefix: "mess_inventory_get" }` | — |
| 68 | `GET` | `/api/mess/issues` | `92-95` | `{ requiredRole: TIER.MESS_INCHARGE }` | `{ keyPrefix: "mess_issues_get" }` | JSON |
| 69 | `GET` | `/api/mess/meal-counts` | `93-96` | `{ requiredRole: TIER.MESS_INCHARGE }` | `{ keyPrefix: "mess_meal_counts_get" }` | — |
| 70 | `GET` | `/api/mess/menu-items` | `106-109` | `{ requiredRole: TIER.MESS_INCHARGE }` | `{ keyPrefix: "mess_menu_items_get" }` | JSON |
| 71 | `GET` | `/api/mess/menu` | `83-88` | `{ requiredRole: ["student", "admin", "sysadmin", "mess_incharge"], }` | `{ keyPrefix: "mess_menu_get" }` | — |
| 72 | `GET` | `/api/mess/operational-requests` | `109-112` | `{ requiredRole: TIER.MESS_INCHARGE }` | `{ keyPrefix: "mess_op_requests_get" }` | JSON |
| 73 | `GET` | `/api/mess/preference` | `208-211` | `{ requiredRole: ["student", "admin", "sysadmin"] }` | `{ keyPrefix: "mess_preference_get" }` | JSON |
| 74 | `GET` | `/api/mess/reconcile` | `93-96` | `{ requiredRole: ["mess_incharge", "admin", "sysadmin"] }` | `{ keyPrefix: "mess-reconcile-get", maxRequests: 30, windowMs: 60_000 }` | JSON |
| 75 | `GET` | `/api/mess/token/[code]` | `75-78` | `{ requiredRole: TIER.MESS_INCHARGE }` | `{ keyPrefix: "mess_token_get", maxRequests: 200 }` | — |
| 76 | `GET` | `/api/mess/tokens/anomaly` | `34-37` | `{ requiredRole: ["mess_incharge", "admin", "sysadmin"] }` | `{ keyPrefix: "mess-tokens-anomaly", maxRequests: 30, windowMs: 60_000 }` | — |
| 77 | `GET` | `/api/notifications` | `47-50` | default | `{ keyPrefix: 'notifications_list', maxRequests: 60 }` | — |
| 78 | `GET` | `/api/occupancy/presence-matrix` | `92-95` | `{ requiredRole: ["admin", "sysadmin", "operator", "supervisor", "principal", "vice_principal", "caretaker", "deputy_warden", "hostel_manager", "exam_branch", "oie", "exam_superintendent", "faculty", "staff", "worker", "visitor"] }` | `{ keyPrefix: "presence_matrix", maxRequests: 60 }` | — |
| 79 | `GET` | `/api/oie/queue` | `168-171` | `{ requiredRole: [...VIEW_ROLES] }` | `readLimit` | — |
| 80 | `GET` | `/api/operator/last-scan` | `57-60` | `{ requiredRole: ["operator", "supervisor", "admin", "sysadmin"] }` | `{ keyPrefix: "operator_last_scan", maxRequests: 60 }` | — |
| 81 | `GET` | `/api/operator/lookup` | `88-91` | `{ requiredRole: TIER.OPERATOR }` | `{ keyPrefix: "operator_lookup", maxRequests: 30 }` | — |
| 82 | `GET` | `/api/operator/manual-entry` | `161-164` | `{ requiredRole: TIER.OPERATOR }` | `{ keyPrefix: "manual_entry_list", maxRequests: 60, windowMs: 60_000 }` | CSRF,JSON |
| 83 | `GET` | `/api/operator/recent-scans/summary` | `137-140` | `{ requiredRole: TIER.OPERATOR }` | `{ keyPrefix: "operator-recent-scans-summary", maxRequests: 30, windowMs: 60_000 }` | — |
| 84 | `GET` | `/api/operator/scans/[id]/edits` | `56-59` | `{ requiredRole: TIER.OPERATOR }` | `{ keyPrefix: "operator-scan-edits", maxRequests: 30, windowMs: 60_000 }` | — |
| 85 | `GET` | `/api/operator/stats/exit-reasons` | `110-113` | `{ requiredRole: TIER.OPERATOR }` | `{ keyPrefix: "operator-exit-reasons", maxRequests: 30, windowMs: 60_000 }` | — |
| 86 | `GET` | `/api/operator/transactions` | `126-129` | `{ requiredRole: TIER.OPERATOR }` | `{ keyPrefix: "operator_transactions", maxRequests: 60 }` | — |
| 87 | `GET` | `/api/parent/child-activity` | `199-202` | `{ requiredRole: ["parent", "guardian", "admin", "sysadmin"] }` | `{ keyPrefix: "parent-child-activity", maxRequests: 30, windowMs: 60_000 }` | — |
| 88 | `GET` | `/api/parent/now` | `108-111` | `{ requiredRole: ["parent", "guardian", "admin", "sysadmin"] }` | `{ keyPrefix: "parent-now", maxRequests: 20, windowMs: 60_000 }` | — |
| 89 | `GET` | `/api/parent/weekly-digest` | `169-172` | `{ requiredRole: ["parent", "guardian"] }` | `{ keyPrefix: "parent-weekly-digest", maxRequests: 20, windowMs: 60_000 }` | — |
| 90 | `GET` | `/api/parents/me` | `154-157` | `{ requiredRole: [...ROLES] }` | `readLimit` | — |
| 91 | `GET` | `/api/parents` | `194-197` | `{ requiredRole: ["admin", "sysadmin"] }` | `{ keyPrefix: "parents_list", maxRequests: 60 }` | JSON |
| 92 | `GET` | `/api/passes/[passId]` | `152-155` | `{ requiredRole: ["admin", "sysadmin", "parent", "student", "principal", "principal"] }` | `{ keyPrefix: "passes_get", maxRequests: 100 }` | JSON |
| 93 | `GET` | `/api/passes/[passId]/status` | `76-81` | `{ requiredRole: ["student", "guardian", "parent", "admin", "sysadmin"], }` | `{ keyPrefix: "passes-status", maxRequests: 60, windowMs: 60_000 }` | — |
| 94 | `GET` | `/api/passes` | `272-275` | `{ requiredRole: ['admin', 'sysadmin', 'operator', 'parent', 'guardian', 'student', 'supervisor', 'principal', 'visitor'] }` | `{ keyPrefix: 'passes_list', maxRequests: 1000, windowMs: 60_000 }` | JSON |
| 95 | `GET` | `/api/permissions/[ticket]/can-act` | `91-94` | `{ requiredRole: ["admin", "principal", "deputy_warden", "hostel_manager", "caretaker", "faculty", "hod", "vice_principal", "exam_branch", "sysadmin", "oie", "mess_incharge"] }` | `{ keyPrefix: "perm-can-act", maxRequests: 60, windowMs: 60_000 }` | — |
| 96 | `GET` | `/api/permissions/[ticket]/track` | `82-87` | `{ requiredRole: ["student", "guardian", "parent", "admin", "sysadmin"], }` | `{ keyPrefix: "perm-track", maxRequests: 60, windowMs: 60_000 }` | — |
| 97 | `GET` | `/api/permissions/approved` | `113-119` | default | `{ keyPrefix: "permissions_approved_get", maxRequests: 100, }` | — |
| 98 | `GET` | `/api/persons/[uniqueId]/history` | `57-62` | `{ requiredRole: ["admin", "sysadmin", "operator", "student", "faculty", "staff", "worker", "parent", "guardian", "principal", "supervisor"], }` | `{ keyPrefix: "person_history", maxRequests: 60 }` | — |
| 99 | `GET` | `/api/persons/[uniqueId]` | `87-90` | `{ requiredRole: ["admin", "sysadmin", "student", "parent", "guardian", "faculty", "staff", "operator", "worker"] }` | `{ keyPrefix: "person_details", maxRequests: 100 }` | — |
| 100 | `GET` | `/api/persons` | `334-337` | `{ requiredRole: ["operator", "admin", "sysadmin", "parent", "guardian", "faculty", "staff"] }` | `{ keyPrefix: "persons_get", maxRequests: 100 }` | JSON |
| 101 | `GET` | `/api/principal/audit` | `35-38` | `{ requiredRole: ["principal", "sysadmin"] }` | `{ keyPrefix: "principal_audit", maxRequests: 30 }` | — |
| 102 | `GET` | `/api/principal/catch-up` | `104-107` | `{ requiredRole: ["principal", "admin", "sysadmin"] }` | `{ keyPrefix: "principal_catchup", maxRequests: 60 }` | — |
| 103 | `GET` | `/api/principal/delegations` | `197-200` | `{ requiredRole: ["principal", "admin", "sysadmin"] }` | `{ keyPrefix: "principal_delegations_get", maxRequests: 30 }` | JSON |
| 104 | `GET` | `/api/principal/digest` | `67-70` | `{ requiredRole: ["principal", "vice_principal", "admin", "sysadmin"] }` | `limit` | — |
| 105 | `GET` | `/api/principal/inbox/review` | `110-113` | `{ requiredRole: ["principal", "admin", "sysadmin"] }` | `{ keyPrefix: "principal-inbox-review", maxRequests: 20, windowMs: 60_000 }` | — |
| 106 | `GET` | `/api/principal/sla-heatmap` | `68-71` | `{ requiredRole: ["principal", "admin", "sysadmin"] }` | `{ keyPrefix: "principal_sla_heatmap", maxRequests: 30 }` | — |
| 107 | `GET` | `/api/principal/week-digest` | `86-89` | `{ requiredRole: ["principal", "admin", "sysadmin"] }` | `{ keyPrefix: "principal_weekdigest", maxRequests: 60 }` | — |
| 108 | `GET` | `/api/records/me` | `118-121` | `{ requiredRole: ["student", "guardian", "parent", "admin", "sysadmin"] }` | `{ keyPrefix: "records-me", maxRequests: 30, windowMs: 60_000 }` | — |
| 109 | `GET` | `/api/staff/attendance-exceptions` | `133-147` | `{ requiredRole: [ "admin", "sysadmin", "hod", "faculty", "staff", "principal", "vice_principal", "supervisor", ], }` | `{ keyPrefix: "staff_att_exceptions", maxRequests: 30 }` | — |
| 110 | `GET` | `/api/staff/history` | `42-45` | `{ requiredRole: ["admin", "sysadmin", "staff", "faculty"] }` | `{ keyPrefix: "staff_history", maxRequests: 60 }` | — |
| 111 | `GET` | `/api/staff/my-day` | `137-140` | `{ requiredRole: ["admin", "sysadmin", "staff", "hod", "supervisor", "faculty"] }` | `{ keyPrefix: "staff_my_day", maxRequests: 60 }` | — |
| 112 | `GET` | `/api/staff/register` | `37-42` | `{ requiredRole: ["admin", "sysadmin", "hod", "operator", "supervisor"], }` | `{ keyPrefix: "staff_register", maxRequests: 60 }` | — |
| 113 | `GET` | `/api/staff/requests-status` | `40-43` | `{ requiredRole: ["admin", "sysadmin", "staff", "faculty"] }` | `{ keyPrefix: "staff_requests_status", maxRequests: 60 }` | — |
| 114 | `GET` | `/api/staff/stats` | `139-142` | `{ requiredRole: ["admin", "sysadmin", "hod", "faculty", "staff"] }` | `{ keyPrefix: "staff_stats", maxRequests: 120 }` | — |
| 115 | `GET` | `/api/student/attendance-calendar` | `125-128` | `{ requiredRole: ["student", "parent", "guardian"] }` | `{ keyPrefix: "student_attendance_calendar", maxRequests: 60 }` | — |
| 116 | `GET` | `/api/student/attendance/overview` | `246-249` | `{ requiredRole: ["student"] }` | `{ keyPrefix: "student-attendance-overview", maxRequests: 30, windowMs: 60_000 }` | — |
| 117 | `GET` | `/api/student/attendance` | `186-189` | `{ requiredRole: ["student"] }` | `{ keyPrefix: "student-attendance", maxRequests: 30, windowMs: 60_000 }` | — |
| 118 | `GET` | `/api/student/fees` | `37-40` | `{ requiredRole: ["student", "parent", "guardian", "admin", "sysadmin"] }` | `{ keyPrefix: "student-fees", maxRequests: 30, windowMs: 60_000 }` | — |
| 119 | `GET` | `/api/student/library` | `38-41` | `{ requiredRole: ["student", "admin", "sysadmin"] }` | `{ keyPrefix: "student-library", maxRequests: 30, windowMs: 60_000 }` | — |
| 120 | `GET` | `/api/student/marks` | `37-40` | `{ requiredRole: ["student", "parent", "guardian", "hod", "admin", "sysadmin"] }` | `{ keyPrefix: "student-marks", maxRequests: 30, windowMs: 60_000 }` | — |
| 121 | `GET` | `/api/student/scholarships` | `31-34` | `{ requiredRole: ["student", "parent", "guardian", "admin", "sysadmin"] }` | `{ keyPrefix: "student-scholarships", maxRequests: 30, windowMs: 60_000 }` | — |
| 122 | `GET` | `/api/students/[roll]/history` | `67-70` | `{ requiredRole: ["admin", "sysadmin", "student"] }` | `{ keyPrefix: "student_history", maxRequests: 50 }` | — |
| 123 | `GET` | `/api/students/me/class` | `30-33` | `{ requiredRole: ["student", "admin", "sysadmin"] }` | `{ keyPrefix: "student_me_class", maxRequests: 60 }` | — |
| 124 | `GET` | `/api/students/register` | `47-52` | `{ requiredRole: ["admin", "sysadmin", "principal", "operator", "supervisor", "hod"], }` | `{ keyPrefix: "student_register", maxRequests: 60 }` | — |
| 125 | `GET` | `/api/students` | `159-164` | `{ requiredRole: ["admin", "sysadmin", "parent", "guardian", "principal", "vice_principal", "supervisor", "hod", "faculty"], }` | `{ keyPrefix: "students_list", maxRequests: 100 }` | — |
| 126 | `GET` | `/api/students/stats` | `250-253` | `{ requiredRole: ["admin", "sysadmin", "hod", "faculty", "staff", "supervisor"] }` | `{ keyPrefix: "student_stats", maxRequests: 30 }` | — |
| 127 | `GET` | `/api/supervisor/assignees` | `59-64` | `{ requiredRole: ["supervisor", "admin", "sysadmin", "principal"], }` | `{ keyPrefix: "supervisor_assignees", maxRequests: 30 }` | — |
| 128 | `GET` | `/api/supervisor/claim-codes` | `217-220` | `{ requiredRole: ["supervisor", "sysadmin"] }` | `limit` | JSON |
| 129 | `GET` | `/api/supervisor/escalations` | `177-182` | `{ requiredRole: ["supervisor", "admin", "sysadmin", "principal"], }` | `{ keyPrefix: "supervisor_escalations", maxRequests: 30 }` | — |
| 130 | `GET` | `/api/supervisor/visitors/overstay` | `44-47` | `{ requiredRole: ["supervisor", "admin", "sysadmin"] }` | `{ keyPrefix: "visitors-overstay", maxRequests: 20, windowMs: 60_000 }` | — |
| 131 | `GET` | `/api/supervisor/visitors/watchlist` | `65-68` | `{ requiredRole: ["supervisor", "admin", "sysadmin"] }` | `{ keyPrefix: "watchlist-get", maxRequests: 20, windowMs: 60_000 }` | JSON |
| 132 | `GET` | `/api/system/config` | `130-133` | `{ requiredRole: ["admin", "sysadmin"] }` | `{ keyPrefix: "sys_config_get", maxRequests: 60 }` | JSON |
| 133 | `GET` | `/api/visitors/mine` | `164-167` | `{ requiredRole: ["visitor", "operator", "admin", "sysadmin"] }` | `{ keyPrefix: "visitors_mine", maxRequests: 60 }` | — |
| 134 | `GET` | `/api/visitors` | `117-120` | `{ requiredRole: ["operator", "admin", "sysadmin", "visitor"] }` | `{ keyPrefix: "visitors_get", maxRequests: 100 }` | JSON |
| 135 | `GET` | `/api/workers/my-shift` | `64-67` | `{ requiredRole: ["admin", "sysadmin", "worker", "supervisor"] }` | `{ keyPrefix: "worker_my_shift", maxRequests: 60 }` | — |
| 136 | `GET` | `/api/workers/my-work-orders` | `69-72` | `{ requiredRole: ["admin", "sysadmin", "worker", "supervisor"] }` | `{ keyPrefix: "worker_my_work_orders", maxRequests: 60 }` | — |
| 137 | `GET` | `/api/workers/my-work` | `73-76` | `{ requiredRole: ["admin", "sysadmin", "worker", "supervisor"] }` | `{ keyPrefix: "worker_my_work", maxRequests: 60 }` | — |
| 138 | `GET` | `/api/workers/personal-history` | `74-77` | `{ requiredRole: ["admin", "sysadmin", "worker", "supervisor"] }` | `{ keyPrefix: "worker_personal_history", maxRequests: 60 }` | — |
| 139 | `GET` | `/api/workers/shifts` | `97-100` | `{ requiredRole: ["admin", "sysadmin", "caretaker", "supervisor"] }` | `{ keyPrefix: "worker_shifts", maxRequests: 60 }` | — |

---

## 4. Verification & Rollback Plan

- **Per-batch gate:** `npx tsc --noEmit`, `vitest` (including same-IP multi-user bucket isolation + 401-before-RL tests + SSE stream test for `/api/admin/alerts/stream`).
- **Final gate:** Full `npm run test:vitest`, `npx unslop-ui src/app/api --strict`, `npm run build`, and AST assertion that `invertedSites.length === 0`.
- **Rollback:** Per-batch `git revert <commit>` (zero DB, env, or Docker changes).
