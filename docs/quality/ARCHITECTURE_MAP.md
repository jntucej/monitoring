# ARCHITECTURE_MAP — Gate Monitor

Evidence-based, read-only survey. Repo: `/root/monitoring` (git `main` @ `14948f8`),
live deploy: `/opt/monitoring/compose`. All paths cited.

## 1. Application entry points

| Layer | File | Role |
|---|---|---|
| Web server | `src/app` + `next.config.mjs` (`output: 'standalone'`) | Next.js 16 App Router; standalone build run via `node server.js` in the Docker `runner` stage (`Dockerfile` L31-48) |
| Root layout | `src/app/layout.tsx` | Global `<html>` shell, server theme from `src/lib/theme-cookie.ts`, `generateMetadata` reads `config_college_info` table |
| Route-group layouts | `src/app/(admin)/layout.tsx`, `(operator)`, `(supervisor)`, `(approver)`, `(student)`, `(mess)`, `(parent)`, `(sysadmin)/layout.tsx` + `(sysadmin)/sysadmin/layout.tsx`, `(mobile)/layout.tsx`, `src/app/login/layout.tsx` | Role-scoped UIs. Every group layout wraps children in `<AuthGuard allowedRoles=[...]>` (client-side `src/components/shared/AuthGuard`) — e.g. `src/app/(operator)/layout.tsx` allows `["operator","worker","admin","sysadmin"]` |
| Worker entry | `worker/index.mjs` | node-cron supervisor + health HTTP server on `:3001` (`/health`, `/status`) |
| RAG bot | `src/app/api/bot/chat/route.ts` | Harbor-style RAG chat (pg-embedded vector retrieval + external LLM) |

~112 page components under `src/app` (route groups above + public pages: `login`, `help`, `about`, `security`, `profile`, `settings/*`, `bootstrap`, `exam/superintendent`, `mess/default`, etc.).

## 2. API route tree (`src/app/api`, 206 route files)

Auth model: most routes wrap handlers with **`withAuthorization`** (`src/middleware/authorization.ts`) —
single validation point that verifies the JWT (access token from `Authorization` / cookie /
`x-session-token` header), checks user row + `session_version`, enforces `requiredRole`,
optionally `requiredPermission` / `resourceType` / `operation`, MFA (`isMfaRequiredForPrivileged`,
`enforceMfa` default true), then injects **trusted** identity headers `x-user-id`, `x-user-role`,
`x-user-email` that handlers must read. Pre-MFA routes use `withAuthorizationPreMfa`
(`auth/2fa/*`). `withRateLimit` (`src/lib/rate-limit.ts`, Redis-backed, per-key/IP) wraps most routes.
`assertCsrf` (`src/lib/csrf.ts`) gates state-changing browser routes.

Role tiers: `src/server/policy/roles.ts` — `TIER.PUBLIC/SELF/APPROVER/OPERATOR/ADMIN/SYSADMIN/MESS_INCHARGE`
(duplicated in `TIER.APPROVER`: `principal` appears twice — see risk register). Roles list in
`src/server/policy/routes.ts` (`ALL_ROLES`, 23 entries, `principal` duplicated at L8+L18).

### Unauthenticated / token-gated routes (no `withAuthorization`)

| Route | Verbs | Auth mechanism |
|---|---|---|
| `api/health/route.ts` | GET | Public (docker healthcheck target; also inserts `api_metrics`) |
| `api/auth/login`, `pin-login`, `verify-pin`(w/ wAuth), `refresh`, `logout`, `bootstrap`, `mfa/bootstrap`, `2fa/{setup,verify,authenticate,disable,disable-self}`, `reset-password`, `sso` (GET=OIDC callback) | POST/GET | No session required by design; rate-limited + CSRF where applicable; `2fa/*` via `withAuthorizationPreMfa` |
| `api/session`, `api/auth/session` (GET session check/refresh) | GET | Public entry: accepts own access/refresh token, else 401 — not `withAuthorization` |
| `api/mobile/*` (`login`, `history`, `idcard`, `profile`, catch-all `[...path]`) | POST/GET | Separate **mobile token** system (`src/lib/mobile-auth.ts`, `validateMobileToken` + `x-device-id`), per-uniqueId rate limit; disable switch `MOBILE_LOGIN_ENABLED` |
| `api/operator/kiosk-session` | GET | **Unauthenticated by design**: mints a short-lived JWT for the kiosk-default operator (`src/lib/kiosk-operator.ts`), IP rate-limited 20/15min, audit-logged |
| `api/ws` | GET | Static 501 placeholder — real WebSocket is proxied by Caddy to a separate service |
| `api/cron/{mess-reminder,mess-no-show-check,mess-finalize,reports}` | POST/GET | `CRON_SECRET` shared-secret header check (`x-cron-secret` or Bearer) |
| `src/app/metrics/route.ts` (`/metrics`) | GET | Prometheus scrape with `METRICS_SCRAPE_TOKEN` (timing-safe compare) |

### All other routes — `withAuthorization` (+ observed role grants)

Format: `path → VERBS → requiredRole (line ref omitted for brevity; see `src/app/api/.../route.ts`)`.
"SELF" = `TIER.SELF` (any authenticated role, no `requiredRole` arg).

**admin/** (50 routes; all `withAuthorization`; admin-tier)
- `admin/dashboard` GET ['admin','sysadmin'] · `admin/audit` GET ['admin','sysadmin'] · `admin/sessions` GET same, `sessions/[id]` DELETE ['sysadmin'] · `admin/backup` GET ['admin','sysadmin'] / POST ['sysadmin'] · `admin/backup/stats` GET ['sysadmin','admin'] · `admin/backup/verify` GET/POST ['sysadmin'] · `admin/compliance/anonymize` POST ['sysadmin'] · `admin/compliance/export` POST ['sysadmin'] · `admin/export` GET/POST ['sysadmin','admin'] · `admin/jobs` GET ['admin','sysadmin'] · `jobs/[id]` PATCH ['sysadmin'] · `jobs/[id]/run` POST ['sysadmin'] · `admin/scheduled-jobs` GET ['sysadmin','admin'] · `admin/device-settings` GET ['sysadmin','admin'] · `[id]` PATCH same · `admin/security/ip-allowlist` POST ['sysadmin'] · `admin/security/stats` GET ['sysadmin','admin','warden','principal','operator','worker','supervisor'] · `admin/scheduling/suggestions` GET ['admin','sysadmin'] · `admin/scheduling/apply` POST ['admin','sysadmin'] · `admin/alerts/rules` GET ['sysadmin','admin'], POST/PATCH ['sysadmin'] · `admin/support/metrics` GET ['sysadmin','admin'] · `admin/support/tickets` GET ['sysadmin','admin'] · `[id]` PATCH same · `[id]/comments` GET/POST ['admin','sysadmin','operator'] · `admin/lockdown` GET ['admin','sysadmin','operator','warden','principal','supervisor'], POST/DELETE ['admin','sysadmin','warden','principal','supervisor'] · `admin/lockdown/stream` GET ['sysadmin','admin'] (SSE) · `admin/announcements` GET/POST ['sysadmin','admin'] · `[id]` PATCH/DELETE same · `admin/sso` GET/PATCH ['sysadmin'] · `admin/ldap/sync` POST ['sysadmin'] · `admin/retention-policies` GET/PATCH ['sysadmin'] · `admin/retention/run` POST ['sysadmin'] · `admin/role-requests` GET/POST `ADMIN_ROLES` · `[id]` PATCH ['admin','sysadmin'] · `admin/users/enrollment-codes` GET ['admin','sysadmin'] · `[id]` DELETE same · `admin/users/[id]/enrollment-code` POST ['admin','sysadmin'] · `[id]/mobile-enrollment` POST ['admin','sysadmin'] · `[id]/roles` GET/POST ['admin','sysadmin'] · `admin/monitoring` GET ['sysadmin'] (prom/loki query proxy, `src/lib/monitoring.ts`) · `admin/digital-twin` GET ['admin','sysadmin'] · `admin/disk-status` GET ['sysadmin','admin'] · `admin/tables` GET ['sysadmin','admin'] · `admin/kb/documents` POST ['admin','sysadmin'] · `admin/sustainability` GET ['admin','sysadmin'] · `sustainability/history` GET ['admin','sysadmin'] · `admin/analytics/users/{engagement,inactive,trends}` GET ['admin','sysadmin'] · `admin/deployment/logs` GET ['sysadmin'] · `admin/docs` GET ['sysadmin'] (OpenAPI spec)

**Other top-level groups** (roles as observed):
- `alerts` GET ['admin','sysadmin','supervisor','warden','principal'] · `alerts/[id]` PATCH ['admin','sysadmin','warden','principal']
- `analytics/*` — `daily-stats` GET TIER.SELF · `occupancy` GET ['admin','sysadmin','operator'] · `predictions` GET ['admin','sysadmin'] · `predictions/retrain` POST ['admin','sysadmin'] · `predictions/history` GET ['admin','sysadmin'] · `reports` GET/POST ['sysadmin','admin'] · `reports/[id]` DELETE ['sysadmin','admin'] · `reports/[id]/run` POST ['sysadmin','admin'] · `export` GET ['admin','sysadmin'] · `advanced` GET ['sysadmin','admin'] · `enhanced` GET ['admin','sysadmin'] · `daily` GET TIER.SELF · `visitors` GET ['admin','sysadmin']
- `announcements/active` GET ['sysadmin','admin','operator','faculty','student','parent','warden','principal','staff'] · `announcements/[id]/dismiss` POST (self)
- `attendance_records` GET ['admin','sysadmin','operator','faculty','warden','principal','supervisor']
- `audit/photo-capture` POST ['operator','admin','sysadmin']
- `bot/chat` POST (self; `withRateLimit` 20/60s) · `bot/feedback` POST (self)
- `config/college-info` GET/PATCH ['admin','sysadmin'] · `config/custom-reasons` GET/POST ['sysadmin','admin','principal','hod','oie'], `[id]` PATCH/DELETE ['sysadmin'] · `config/exit-reasons` GET/PATCH ['sysadmin','admin'] (+POST), `[id]` PATCH/DELETE ['sysadmin'] · `config/navigation` GET/PATCH/DELETE ['sysadmin'] · `config/pass-types` GET ['student','parent','admin','sysadmin','faculty','warden'], PATCH ['admin','sysadmin'] · `config/roles` CRUD ['sysadmin'] · `config/student-rules` GET/PATCH ['admin','sysadmin'], POST/PUT ['admin','sysadmin']
- `departments` GET (self) / POST/PATCH ['sysadmin','admin'] / DELETE ['sysadmin']
- `dev/contact` POST (self, audit+telegram forward) / GET ['sysadmin','admin']
- `faculty/attendance` GET ['admin','sysadmin','hod','faculty','staff','principal']
- `feedback` POST (self, rate-limited) / GET ['admin','sysadmin']
- `gate/scan` POST TIER.OPERATOR + CSRF · `gate/scan/[id]` PATCH ['admin','sysadmin'] · `gate/logs` GET ['admin','sysadmin','operator'], POST ['operator'] · `gate/devices` GET ['admin','sysadmin'] · `gate/stream` GET (SSE) ['sysadmin','admin','operator','supervisor'] · `gate/verify-face` POST ['operator','admin','sysadmin'] · `gate/verify-thumbprint` POST ['operator','admin','sysadmin']
- `gates` GET ['admin','sysadmin','operator'] / POST/PATCH ['admin','sysadmin'] / DELETE ['sysadmin'] · `gates/[id]` PATCH/DELETE ['admin','sysadmin'] · `gates/schedule` GET ['sysadmin','admin','operator'] / POST ['sysadmin','admin'] · `gates/schedule/[id]` PUT/DELETE ['sysadmin','admin'] · `gates/schedule/current` GET (self)
- `hod/faculty` GET ['admin','sysadmin','faculty','hod','staff']
- `integrations` GET/POST/PUT ['sysadmin','admin'] · `[id]` PATCH, `[id]/sync` POST ['sysadmin','admin'] · `lms/{configure,status}` POST/GET ['admin','sysadmin'] · `lms/sync` POST ['admin','sysadmin'] · `lms/attendance` POST ['admin','sysadmin','operator'] · `test` POST ['sysadmin','admin'] · `logs` GET ['sysadmin','admin']
- `mess/*` (13 routes): menu `GET ['student','admin','sysadmin','mess_incharge']` · `menu-items` GET/POST ['admin','sysadmin'], `[id]` PATCH/DELETE ['admin','sysadmin'] · `days` GET/POST ['admin','sysadmin'], `[id]` PATCH/DELETE ['admin','sysadmin'] · `default` GET/PUT ['student'] · `history` GET ['student'] · `preference` GET/POST ['student','admin','sysadmin'] · `analytics` GET TIER.MESS_INCHARGE · `arrivals` GET/POST TIER.MESS_INCHARGE · `serve` POST TIER.MESS_INCHARGE · `revoke` POST TIER.MESS_INCHARGE · `token/[code]` GET TIER.MESS_INCHARGE
- `notifications` GET ['admin','sysadmin','parent','student'] · `notifications/preferences` GET/PUT/POST (self, rate-limited) · `notifications/stream` GET (SSE, self)
- `occupancy/current` GET ['admin','sysadmin','operator'] · `occupancy/history` GET ['admin','sysadmin'] · `occupancy/stream` GET (SSE, self) · `occupancy/presence-matrix` GET (12-role approver set)
- `onboarding/{complete,next,status}` POST/GET (self)
- `operator/kiosk-session` GET **public** (see above) · `operator/stats` GET TIER.OPERATOR · `operator/register-thumbprint` POST ['admin','sysadmin','operator']
- `parents` GET/POST ['admin','sysadmin'] · `parents/link` POST ['admin','sysadmin']
- `passes` GET (9-role read set) / POST ['student','parent','guardian','admin','sysadmin','operator'] · `passes/[passId]` GET (5-role), PUT ['admin','sysadmin','principal'] · `passes/[passId]/action` POST ['admin','sysadmin','operator','warden','supervisor','principal']
- `permissions` POST/GET (self; role filtering enforced in-handler, `src/app/api/permissions/route.ts` L28-138: student/parent/guardian/approver-stage scoping) · `permissions/bulk` POST (10-role approver set) · `[ticket]` GET/PATCH/POST (self, handler-internal stage checks) · `[ticket]/verify` GET (self) · `[ticket]/document` GET (self, rate-limited) · `[ticket]/document/verify` GET (self) · `[ticket]/upload` POST (self, rate-limited) · `[ticket]/sign` POST (self, rate-limited) · `[ticket]/biometric` POST (9-role approver incl. operators)
- `persons` GET ['operator','admin','sysadmin','parent','faculty','staff'] / POST/PATCH/DELETE ['admin','sysadmin'] · `persons/[uniqueId]` GET (10-role), `/history` GET (11-role)
- `principal/dashboard` GET ['principal','sysadmin'] · `principal/audit` GET ['principal','sysadmin']
- `profile` GET/PATCH (self + CSRF)
- `roles-graph` GET ['sysadmin','admin','principal','vice_principal']
- `staff/attendance` GET ['admin','sysadmin','hod','faculty','staff','principal','supervisor'] · `staff/stats` GET ['admin','sysadmin','hod','faculty','staff'] · `staff/register` GET ['admin','sysadmin','hod','operator','supervisor']
- `student/dashboard` GET ['student']
- `students` GET ['admin','sysadmin','parent','guardian','principal','supervisor'] · `students/[roll]` GET ['admin','sysadmin','student'] / PATCH ['admin','sysadmin'] / DELETE ['sysadmin'] · `students/[roll]/history` GET ['admin','sysadmin','student'] · `students/qr-token` GET 'student' · `students/register` GET ['admin','sysadmin','principal','operator','supervisor','hod'] · `students/stats` GET ['admin','sysadmin','hod','faculty','staff']
- `support/tickets` GET/POST (8-role) · `[id]/comments` GET/POST (8-role)
- `system/config` GET/PATCH ['admin','sysadmin']
- `users` GET/POST ['admin','sysadmin'], PATCH (admin-tier, rate-limited) · `users/[id]` PATCH ['admin','sysadmin'] / DELETE ['sysadmin'] · `users/bulk` + `bulk/validate` + `bulk/commit` POST ['admin','sysadmin'] · `users/bulk-graduate` POST 'sysadmin' · `users/me/export` GET/POST (self, rate-limited)
- `visitors` GET/POST/PUT ['operator','admin','sysadmin']
- `voice/interpret` POST ['admin','sysadmin','operator','supervisor']
- `workers/shifts` GET ['admin','sysadmin']

**Caveat:** `requiredRole` absence on `withAuthorization(handler)` means *any* authenticated
user (TIER.SELF semantics) — this includes all `permissions/*`, `onboarding/*`, `bot/*`,
`profile`, `occupancy/stream`, `notifications/*`, `users/me/export`, `gates/schedule/current`.
Several `permissions/[ticket]/*` self-graded routes rely on **in-handler** stage checks
(`canApproveAtStageWithBranch`, `src/lib/permission-workflow.ts`) rather than `requiredRole`.

## 3. Server libraries

- `src/lib` (~89 `.ts` modules). Core:
  - **DB:** `postgres.ts` (pg `Pool` from `DATABASE_URL`/`POSTGRES_*`; RLS-style `app.current_user_id`
    GUC via `query()`/`withTransaction()`; `PostgresQueryBuilder` emulating a PostgREST-style
    fluent client incl. embedded relations; `db.rpc()` allow-list of 7 functions; `authAdmin`
    user CRUD; **JSONB serialization fix** in `insert/update/upsert` — L623-650, per merge #298).
    Legacy shim `dbClient.ts` maps `supabase`/service-client to `db` (supabase-js 2.x is still a dep
    but the real client is self-hosted).
  - **Auth:** `auth-token.ts` (JWT access/refresh/reset tokens, `jose`), `authContext.ts`
    (`requireAuthenticatedUser`, `requireRole`, `requirePermission`, `validateResourceOperation`,
    MFA gating; 30s user-row cache + `invalidateAuthCache` — issue #382), `sso.ts` (OIDC),
    `totp.ts`, `webauthn.ts`, `mfa-enroll.ts`, `mfa-secret.ts`, `login-lockout.ts`,
    `mobile-auth.ts` (device-bound mobile tokens), `qr-token.ts`, `ldap.ts`, `passwords` via `src/server/policy/passwords.ts`.
  - **Security plumbing:** `csrf.ts`, `rate-limit.ts` (Redis, `rate-limiter-flexible`),
    `idempotency.ts`, `body-cache.ts` (single-body-cache fix #56), `access-control.ts`,
    `security.ts`, `env.ts` (fail-fast env validation; `scripts/validate-env.js` prebuild),
    `schema.sql` (reference schema), `verification` of `process_gate_scan` etc.
  - **Domain:** `permission-workflow.ts` (stage resolution: `resolveInitialStage`, ticket numbers,
    `WorkflowType`), `document-signature.ts`, `bulk-permission.ts`, `occupancy.ts`,
    `occupancy-analytics.ts`, `predictive.ts`, `alerting.ts`, `alert-hierarchy.ts`,
    `notification-service.ts`, `backup.ts`, `user-import.ts`, `student-exit-flow.ts`,
    `student-register.ts`, `staff-register.ts`, `kiosk-operator.ts`, `face-match.ts`,
    `geo.ts`, `barcode.ts`, `scheduling-assistant.ts`, `sso.ts`, `ldap.ts`,
    `integrations/` (email, sms, lms, hr-sync, visitor-registration), `rag/` (prompt,
    retriever, llm, ingest, translate, workflows, roles, config).
- `src/server/policy` — pure business rules (testable w/o HTTP): `roles.ts` (TIERs),
  `routes.ts` (default role→route map, 23 roles), `gate-access.ts`, `student-exit.ts`,
  `lockdown.ts`, `lockout.ts`, `dates.ts`, `anomalies.ts`, `passwords.ts`,
  `health/sanitize.ts`.
- `src/server/services` + `src/server/repositories` — thin data services for occupancy,
  scans, alerts, audit, health, analytics, operator stats (used by some routes; the large
  majority of routes still call `db`/`query` directly).
- `src/server/http` — `response.ts` / `errors.ts` typed response helpers.

## 4. Middleware / authorization boundaries

- **No Next.js `middleware.ts`** — no edge layer. Authorization is per-route via
  `withAuthorization` (`src/middleware/authorization.ts`, 286 lines; also
  `withAuthorizationPreMfa`, `requireRole`, `requirePermission`, `combineMiddleware`,
  `withAccountStatusValidation`, `getAuthenticatedUser`).
- Boundary semantics: identity headers are **overwritten** server-side after token validation —
  client-supplied `x-user-*` headers cannot spoof identity (documented at top of the file,
  re-asserted in `src/app/api/verify-pin` L28-30 and `admin/scheduling/apply` L17).
- CSRF: `assertCsrf` for browser-initiated state changes (gate/scan, profile, auth endpoints).
- MFA: `enforceMfa` default true inside `withAuthorization`; privileged roles
  (`isMfaRequiredForPrivileged`, `src/lib/roles.ts`) must pass TOTP.
- Rate limits: `withRateLimit` (Redis; default keys per route `keyPrefix`; kiosk fix #295
  added kiosk-specific limits).
- UI boundary: `AuthGuard` (client) in every route-group layout + `src/lib/ui-gates.ts`
  client-side feature gating — defense in depth, not the security boundary (API layer is).

## 5. Realtime (SSE / hooks)

- SSE endpoints (all `text/event-stream`, authed except `ws` placeholder):
  `api/gate/stream` (45s `maxDuration`), `api/occupancy/stream`, `api/notifications/stream`,
  `api/admin/lockdown/stream`.
- Client hooks: `src/hooks/usePolling.ts`, `useLiveRefresh.ts` (global Live Data toggle),
  `useKioskOperator.ts` (auto-kiosk-session minting), `useAuth.ts`, `useAuthHeaders.ts`,
  `useDashboardData.ts`, plus `NotificationBell.tsx` (`EventSource`).
- Caddy: `flush_interval -1` on `reverse_proxy web:3000` for streaming responses (`Caddyfile` L25).
- Worker exposes `:3001/health` + `/status` (stale detection >1h) consumed by docker healthchecks
  and `src/lib/health.ts` (web-side service liveness).

## 6. Worker ↔ Web relationship

- Separate container `gate_worker` (Dockerfile `worker` stage, `node worker/index.mjs`),
  same `gate-net`, same `DATABASE_URL`/`REDIS_URL` as web — **shared DB + Redis, no API calls to web**.
- Cron jobs (`worker/jobs/*`): `cleanup_ephemeral` */15m · `backfill_daily_stats` 02:00 ·
  `dispatch_notifications` */30m (drains `notification_{email,sms,push}_queue` tables) ·
  `cleanup_expired_passes` 03:00 · `audit_log_rotation` Sun 04:00 (retention: 180d audit,
  30d integrations, 90d alerts — `AUDIT_LOG_RETENTION_DAYS` etc.).
- Optional **sync-bridge** child process (`scripts/sync-bridge/index.ts`, spawned by the worker
  when `ENABLE_SYNC_BRIDGE=true`; exponential-backoff restart, 30s stability reset; H0201
  biometric-terminal log polling → `movement_logs` + `attendance_records`).
- Web-side "worker" liveness is answered by `api/health` (checks `gate_worker` HTTP 3001) and
  `api/cron/*` are **web-routed** cron entrypoints secured by `CRON_SECRET` — i.e. scheduled
  mess/report jobs run from an external scheduler calling the web API, not from the worker.
- No queueing between web and worker: notification dispatch is the worker polling DB queues
  written by web routes (e.g. `addNotification`).
