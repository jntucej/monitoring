# Self-Hosted Architecture Audit — Gate Monitor

**Date:** 2026-10-06
**Repo state:** `main` @ `5bdd7fc5` ("chore: remove study portal and study login module")
**Scope:** analysis only — no code modified in this pass (rule §37).

This audit is the required first deliverable of the JCODE self-hosting task. Every finding below was verified by direct inspection of the repository (file reads + grep), not assumed from docs. Where docs and code disagree, **the code wins** and the discrepancy is called out.

---

## 1. Current Architecture (as built)

```text
Browser (React 19 / Next.js 16.3.1 App Router, "use client" stores)
   │  fetch("/api/*", Authorization: Bearer <JWT>, X-Session-Token: <handle>)
   ▼
Next.js API Route Handlers (src/app/api/**, 125 route.ts files)
   │  wrapped by src/middleware/authorization.ts (withAuthorization, 266 usages)
   │  and src/middleware/auth.ts (withAuth, 10 usages)
   ├──────────────► Supabase (hosted)
   │                 ├── GoTrue Auth  (signInWithPassword, admin.createUser, admin.generateLink, verifyOtp, refreshSession)
   │                 ├── PostgREST    (.from().select/insert/update/delete/upsert, .rpc())
   │                 ├── Realtime     (1 subscription: NotificationBell postgres_changes INSERT on notifications)
   │                 └── (no Storage usage found)
   ├──────────────► Upstash Redis REST (rate-limit branch #1, UPSTASH_REDIS_REST_URL/TOKEN)
   │
   ├── 4 SSE routes (poll + 45s serverless lifetime cap):
   │     src/app/api/notifications/stream, occupancy/stream, gate/stream, admin/lockdown/stream
   ├── worker/index.mjs  (node-cron: backfill_daily_stats 02:00, cleanup_expired_passes 03:00, audit_log_rotation Sun 04:00)
   │     └── spawns `npx tsx scripts/sync-bridge/index.ts` (H0201 biometric device bridge → Supabase)
   └── src/app/api/cron/reports (CRON_SECRET-gated, Vercel-Cron-shaped but no vercel.json crons entry)
```

**Deployment today:** `vercel.json` (framework marker), `.vercel/` directory, `.env.vercel` — app is deployed to **Vercel**. A partial self-hosted stack already exists: `docker-compose.yml` (postgres:15, redis:7, web, worker, cloudflared), `Dockerfile` multi-stage with `runner`/`worker` targets, `Caddyfile`, `systemd/gate-stack.service`, `docker-compose.base.yml`. This stack is real and should be **preserved and completed**, not replaced.

**Package facts:**
- Next 16.3.1, React 19.2.8, TS strict, App Router, `output: 'standalone'`, port 3000.
- Runtime deps already present that matter for the migration: `jose` (HS256 JWT), `bcryptjs` (password/PIN hashing), `node-cron`, `rate-limiter-flexible`, `@simplewebauthn/{browser,server}`, `zustand`, `tsx`.
- **Missing:** no `pg` (node-postgres) and no Redis client in `package-lock.json` (verified via lock scan). No ORM anywhere (keep it that way, §6).
- `@supabase/supabase-js` pulls 7 packages (`auth-js`, `functions-js`, `phoenix`, `postgrest-js`, `realtime-js`, `storage-js`, `supabase-js`).

**Test/build facts:**
- No unit test runner (only `@playwright/test` declared; **no playwright.config, no spec files** → `npm run test:e2e` is non-functional today).
- `npx tsc --noEmit` currently reports **pre-existing errors** in `src/data/cheatsheet/atcd.ts` (strict-mode `unknown`/implicit-any) — unrelated to this migration but it means "typecheck passes" is not a green baseline yet. `npm run build` is the gate that matters (see §Risks).

---

## 2. Vercel Dependencies

| Item | Location | Action |
|---|---|---|
| `vercel.json` (`{"framework":"nextjs"}`) | repo root | **REMOVE** (deployment infrastructure only) |
| `.vercel/` project dir | repo root | **REMOVE** (already gitignored) |
| `.env.vercel` (`VERCEL_OIDC_TOKEN`) | repo root (gitignored) | **REMOVE** |
| `env.ts` `VERCEL_URL` fallback for `allowedOrigin` | `src/lib/env.ts:31` | **REPLACE** with `PUBLIC_URL`/`APP_URL` |
| Serverless assumptions in comments & SSE lifetimes | `src/app/api/notifications/stream/route.ts` (45s auto-close), doc comments | **KEEP behavior** (EventSource auto-reconnects), re-document |
| Vercel Cron | **none found** (`vercel.json` has no `crons`) | nothing to migrate; `/api/cron/reports` keeps its `CRON_SECRET` gate as an ops-only trigger, worker is the scheduler |
| Vercel Blob / Edge middleware | none found (`src/middleware.ts` does not exist; auth lives in per-route wrappers) | nothing to do |
| `validate-env` requires `NEXT_PUBLIC_SUPABASE_*` | `scripts/validate-env.js` (runs as `prebuild`) | **REPLACE** with new env contract |

There is **no Vercel SDK import anywhere** — Vercel dependency is purely deploy config + env + mental model. Clean removal is low risk.

---

## 3. Supabase Dependencies (complete inventory)

### 3.1 Client module (the choke point)

`src/lib/supabaseClient.ts` (131 lines) exports:
- `supabase` — **anon browser client** (autoRefresh, persistSession, detectSessionInUrl)
- `getSupabaseServiceClient()` — **service-role client** (bypasses RLS) — the workhorse; used by ~74 files
- `getReadOnlyClient()` — read-replica variant (**zero external callers found** → dead code)
- `createEphemeralSupabaseClient()` — used only by `auth/pin-login` for OTP exchange
- `resolveLoginIdentifier()`, `canUserAuthenticate()` — RPC wrappers
- `invalidateAllUserSessions()` — Admin signOut + `invalidate_all_user_sessions` RPC (called by `db.ts` `updateAccountStatus` / `updateUserRole`)

Imported by **~80 files**: 74 API routes, `src/lib/db.ts`, `src/lib/authContext.ts`, `src/lib/health.ts`, `src/middleware/{auth,authorization}.ts`, plus:

| File | Kind | How supabase is used |
|---|---|---|
| `src/app/layout.tsx` | **server component** | `generateMetadata()` reads `config_college_info` |
| `src/components/operator/ManualEntryDialog.tsx` | **client component** | direct browser query `gate_passes` by roll + `final_status IN (...)` |
| `src/components/shared/NotificationBell.tsx` | **client component** | SSE **plus** a `postgres_changes` INSERT subscription on `notifications` filtered by `user_id` |

### 3.2 Call-site volume (drives the migration strategy)

| Pattern | Count | Where |
|---|---|---|
| `.from('x')` occurrences | **369** total (33 distinct tables in routes, 35 in `src/lib`, 56 distinct tables repo-wide incl. scripts) | `src/app/api/**`, `src/lib/**` |
| `await … .from(...)` | 135 | |
| **assigned-to-variable builders** (conditional `.select().eq().order()` chains) | **115** | everywhere, incl. `db.ts` filter chains |
| `getDbClient()` call sites outside `db.ts` | 87 (23 lib files + 10 routes + 2 stores) | |
| `withAuthorization` wrappers | 266 | `src/app/api/**` |
| `auth.admin.*` (provisioning) | 17 call sites in 6 files: `users`, `users/bulk`, `persons`, `auth/pin-login`, `auth/change-password`, `auth/logout` | |
| `.rpc()` | 4: `resolve_login_identifier`, `can_user_authenticate`, `invalidate_all_user_sessions` (`supabaseClient.ts`), `process_gate_scan` (`db.ts:1559`) | |
| Supabase Realtime | 1 subscription (`NotificationBell.tsx:75-88`) | |
| Supabase Storage | **0** (verified: no `.storage.from`, no `@vercel/blob`) | — |
| Edge functions / webhooks / auth callbacks | **0** | — |

### 3.3 Client-side (browser) Supabase usage — the tricky part

1. **`layout.tsx generateMetadata()`** — server-side → replace with a direct DB read (no route needed).
2. **`ManualEntryDialog`** — browser reads `gate_passes` by roll + `final_status IN ('APPROVED','APPROVED_PARENT','APPROVED_ADMIN')`. Equivalent authenticated API exists (`/api/passes?roll=…`) and its GET handler **allows `operator`** (verified) → route this dialog through `/api/passes` with a small status-list param; no new endpoint.
3. **`NotificationBell`** — SSE already delivers the same data (`loadNotifications()` runs on every SSE tick); the `postgres_changes` subscription is a **redundant second channel** → drop it, keep SSE (§17).

Also: `operatorStore` and `adminStore` import **`@/lib/db` functions directly** (`statsToday`, `findGateById`, `dashboard`, `getAlerts`, `resolveAlert`, `getNotifications`). On the browser those run through the anon client → **blocked by RLS today** (comments in both stores admit this); they degrade/fail silently while API routes are the real path. Post-migration they must become API fetches (verified equivalents: `/api/operator/stats`, `/api/admin/dashboard`, `/api/alerts`, `/api/notifications`, `/api/gates`).

`authStore` persists `token` + `refreshToken` in **sessionStorage**, sent as `Authorization: Bearer` + `X-Session-Token`. The server sets HttpOnly cookies (`session-token`, `refresh-token`) but **no route reads them** — write-only decoration today. Security finding + §12 opportunity.

### 3.4 `src/lib/db.ts` — the domain layer (2,391 lines, 57 exported functions)

Domain functions (`findPass`, `addScan`, `dashboard`, `statsToday`, `createLockdown`, mappers `mPerson`/`mStu`) over a Supabase client: `db.from` (21), `client.from` (21), conditional builder chains, one `client.rpc('process_gate_scan')`, dynamic `await import('./supabaseClient')` in 25 functions, `getDbClient()` = **service on server / anon on browser**. Three `typeof window` branches (lines 10, 999, 1072).

Other `src/lib` service-client importers: `alerting, authContext, health, jobs, ldap, rate-limit, security, sso`; `getDbClient()` users: `audit, backup, departments, export, integrations/*, mobile-auth, notification-service, occupancy, predictive, scheduling-assistant, sustainability, user-analytics`.

`src/middleware/metrics.ts` writes `api_metrics` via the anon client (RLS ⇒ likely failing silently today — flagged, not confirmed against live DB).

---
## 4. Authentication Flow (exact, verified)

### 4.1 Password login — `POST /api/auth/login`
1. `resolveIdentifierToEmail(login)` — service query on `users.login_identifier` / `users.unique_id` (status ACTIVE).
2. `supabase.auth.signInWithPassword({email, password})` → **GoTrue is the sole credential authority**; password hashes live in `auth.users`.
3. Service query `users` for profile (ACTIVE).
4. **Mints its own custom JWT** (`jose` `SignJWT` HS256 via `getSigningKey()` from `src/lib/qr-token.ts`, payload `{sub, email, role, iat, exp+1h}`) → returned as `access_token` **and** set as HttpOnly `session-token` cookie (1h) + `refresh-token` cookie (30d, Supabase refresh token value).
5. Response body carries `{token, refreshToken, user}` → authStore stores them in **sessionStorage**.

Key asymmetry: the token the client actually uses (`Authorization: Bearer`) is **already an app-minted JWT**, not the Supabase access token. Supabase JWTs are re-verified only at:
- `src/middleware/authorization.ts` → `requireAuthenticatedUser(token)` → `createAuthContext(token)` → **`supabase.auth.getUser(token)`** (GoTrue round-trip **per request**) — 266 routes.
- `src/middleware/auth.ts` `withAuth` (10 routes) — same.
- `/api/auth/session` → `getUser(token)` + `refreshSession(refresh_token)`.
- `/api/auth/logout` → `getDbClient().auth.getUser(rawToken)` then `service.auth.admin.signOut(rawToken)` + `users.handle = null`.

**Single-device session factor:** `users.handle` stores a per-login opaque token; clients send `X-Session-Token`; both middlewares compare it to `profile.handle` → mismatch = 401 `SESSION_EXPIRED`. Set by `pin-login:207`, cleared by logout, by `updateUserRole`/`updateAccountStatus` (invalidation on role/status change), and by admin `sessions` routes. **App-owned → stays.**

### 4.2 PIN login — `POST /api/auth/pin-login`
Rate-limited 5/15min/IP. Lookup by `unique_id`/`email` (ACTIVE) → `bcrypt.compare(pin, users.initial_pin_hash)` → then a deliberate dance: `service.auth.admin.generateLink({type:'magiclink'})` (auto-creates/confirms the GoTrue user if absent), ephemeral client `auth.verifyOtp` → a **genuine Supabase session without a password**, then the same custom HS256 JWT + `users.handle` set. File header documents the intent: "Supabase remains the only issuer of access tokens" — that intent dies with Supabase; the new auth layer becomes the only issuer.

### 4.3 Session refresh — `GET /api/auth/session`
GoTrue `getUser` → on failure `refreshSession(refresh_token)` (header `x-refresh-token`) → `canUserAuthenticate` RPC → profile → `handle` check → refreshed `{token, refreshToken, user}`.

### 4.4 Other auth endpoints
- `POST /api/auth/change-password` — verifies against `users.password_hash` with bcrypt **and** updates GoTrue via `auth.admin.updateUserById` (dual-write; comment is misleading about where hashes live — see Risks).
- `POST /api/auth/reset-password` — `auth.resetPasswordForEmail` (GoTrue-hosted email; **SMTP depends on Supabase**).
- **TOTP 2FA:** `/api/auth/2fa/{setup,verify,disable,authenticate}` + `/api/auth/mfa/bootstrap` — **app-owned**: secrets in `users.two_factor_secret`, verification in `src/lib/totp.ts`, enforcement in `createAuthContext` when `system_config.global_settings.mfaRequiredForAdmin` (60s cache via `getCached`, **fails open** by design — documented). Bootstrap uses `MFA_ENROLL_SECRET`/`MOBILE_TOKEN_SECRET` timing-safe compare + 10-min `mfa_enroll` JWT (`src/lib/mfa-enroll.ts`). Beyond DB reads, **no Supabase dependency**.
- **OIDC SSO:** `/api/auth/sso` + `src/lib/sso.ts` (Google/Microsoft/generic, `jose` id_token validation, JWKS, PKCE) — **already self-contained**; reads/writes `sso_config` + `users`, mints its own session. Works unchanged once DB access is local.
- **Mobile auth:** `src/lib/mobile-auth.ts` — **already self-hosted by design**: HS256 `jose` JWT, `MOBILE_TOKEN_SECRET` ≥32 chars enforced, 30-day TTL, `sub=personId` + `uniqueId`, verified against DB person, used by `/api/mobile/[...path]`. Independent of Supabase → **PRESERVE unchanged** (known nit GM-164: no rotation/revocation list — out of scope unless a revocation table is added).
- **QR tokens:** `src/lib/qr-token.ts` — same jose HS256 pattern (app-owned).

### 4.5 Roles
`users.role` CHECK: `operator, admin, sysadmin, guardian, student, warden, faculty, staff, worker, visitor`. SQL helpers `is_admin/is_sysadmin/is_warden/is_operator`; TS helpers `requireRole/requireAnyRole/requirePermission/validateResourceOperation/validateStudentAccess/validateGateAccess/getGateStudentInfo` in `authContext.ts`, all invoked via `withAuthorization({requiredRole, requiredPermission, resourceType…})`. **Authorization is already centralized — keep its shape, swap only the token-verification backend.**

### 4.6 WebAuthn / passkeys
Tables exist (`webauthn_credentials`, `webauthn_challenges`), deps declared (`@simplewebauthn/*`), helpers exist (`src/lib/webauthn.ts`), **but zero call sites** — no API route or component imports them (grep across `src/app`, `src/components`, `src/hooks` = empty; the `src/app/security/[category]` match was prose, not code). **Dormant scaffold**: keep tables (schema unchanged), no credential migration needed (none exist in code paths). Whether to wire passkeys up now = **REQUIRES_DECISION** (recommend: leave dormant, document).

---

## 5. Database Access & RLS

### 5.1 How the app talks to the DB
Everything goes through **PostgREST via supabase-js** with two identities:
- **service role** (server, bypasses RLS) — 100% of API-route data access + `src/lib/*`.
- **anon** (browser, RLS applies) — the 3 client usages in §3.3 + `getDbClient()` on the browser + `layout` (server-side but anon).

**No raw SQL anywhere in app code.** RLS exists to constrain the *browser* anon client; the server already bypasses it. The `20260916` migration header states this explicitly ("server-side API routes use service_role… RLS does NOT break API layer; ONLY client-side browser direct table read found: ManualEntryDialog").

### 5.2 Schema inventory
- `supabase/schema.sql` — **1,203 lines**: 47+ `CREATE TABLE`, 3 extensions (`pgcrypto`, `pg_trgm`, `uuid-ossp`), ~25 plpgsql functions (all `SECURITY DEFINER SET search_path = public`), 8 triggers (occupancy on movement, daily-stats rollup, audit-log triggers, `on_auth_user_created` on `auth.users`, `update_updated_at`), **47 `CREATE POLICY`**, GRANTs to `authenticated`/`service_role`/`anon`.
- `supabase/migrations/20260913_device_user_mappings.sql` (51 lines) — device→user mapping, pure SQL, **no CLI dependency**.
- `supabase/migrations/20260916000000_security_rls_and_function_hardening.sql` (263 lines) — RLS enablement + `svc_all_*` policies + cached `is_admin_self()` + EXECUTE grants. **No Supabase CLI constructs.**
- `supabase/migrations/*.sql.bak` — stale duplicate (differs: `role IN ('admin','super_admin')`) → exclude from any runner.
- `docker-compose.yml` already mounts `schema.sql` as `docker-entrypoint-initdb.d/schema.sql` (fresh-volume bootstrap wired).

### 5.3 Supabase-specific SQL features — KEEP / REPLACE / REIMPLEMENT / REMOVE

| Feature | Instances | Decision | Rationale / replacement |
|---|---|---|---|
| `auth.users` table | FK refs `users.id → auth.users.id` (L241, L280), `can_user_authenticate` checks `auth.users`, `on_auth_user_created` trigger | **REIMPLEMENT** | New provider's user storage (or keep an `auth.users`-shaped table so FKs/triggers keep working). Profile-creation trigger becomes provisioning hook in the new auth layer. |
| `auth.uid()` in RLS policies | 40+ policies (`users_select_own`, `mlog_*`, `passes_*`, `occ_*`, `sdetails_*`, `alerts_*`, `dstats_*`, `vlogs_*`, `gates_*`…) | **REIMPLEMENT** (keep RLS) | Replace with provider-compatible identity function — see §5.4. |
| `is_admin()/is_sysadmin()/is_warden()/is_operator()/is_admin_self()` | ~6 + overloads | **KEEP** | Provider-agnostic role helpers. |
| `resolve_login_identifier`, `can_user_authenticate`, `invalidate_all_user_sessions` | 3 functions | **REIMPLEMENT** (keep) | Stays SQL; `can_user_authenticate` loses/redirects its `auth.users` sub-check. |
| `process_gate_scan` (dup-window, `FOR UPDATE`, returns jsonb) | 1 | **KEEP** | Core business logic; `.rpc` from `db.ts:1559`. |
| `create_user_with_auth` / `delete_user_with_auth` (sysadmin-gated via `auth.uid()`) | 2 | **REIMPLEMENT** | Replace `auth.uid()`; note `api/users/route.ts` does **not** call them (inserts rows + GoTrue admin) → possibly vestigial → **REQUIRES_DECISION** (wire or drop, don't drop blind). |
| Occupancy / daily-stats / audit / updated_at triggers | 8 | **KEEP** | Pure Postgres. |
| RLS enablement + 47 policies (`svc_all_*`, `TO authenticated`, `TO service_role`, `TO admin`) | full `20260916` migration | **KEEP policies, REIMPLEMENT principals** | Supabase roles `anon/authenticated/service_role` must exist in self-hosted Postgres; if we create roles with the **same names**, policy SQL stays byte-identical (cheapest, lowest-risk path). |
| `GRANT ALL … TO postgres, authenticated, service_role` + `ALTER DEFAULT PRIVILEGES` | 6 statements | **KEEP** (role names preserved) | |
| `REVOKE EXECUTE … FROM anon` | 3 | **KEEP** | |
| `gen_random_uuid()` (pgcrypto) + `pg_trgm` + `uuid-ossp` | 3 extensions | **KEEP** | Available in `postgres:*-alpine` (contrib bundled) — verify at build. |
| Realtime publication SQL | **none** (grep empty) | **N/A** | Realtime is only the one client subscription, not SQL. |
| Service-role assumptions | every `getSupabaseServiceClient()` path | **REPLACE** | becomes "trusted server-side connection role" (§5.4). |

### 5.4 RLS strategic decision (§15)

The security model already is (and should remain):

```text
Client → Next.js API → withAuthorization (JWT + session-handle + status + role + permission)
       → trusted server-side DB connection → Database
```

RLS today is a *second* layer that only ever constrained the **anon browser client**. Post-migration there is **no browser→DB path at all** (all three client usages re-routed, §3.3), so:

**Recommended decision: KEEP RLS enabled with policies intact**, implemented against provider-compatible roles + identity function, with the app connecting as the privileged role. Defense-in-depth preserved (a leaked read-only credential stays constrained) at near-zero rewrite cost because policy SQL doesn't change. App write paths use the privileged role (BYPASSRLS-equivalent), so RLS never fights the app — same as today. Do **not** disable RLS (§3 forbids it).

Final shape depends on the auth/provider choice in §13.1 → **REQUIRES_DECISION**.

---

## 6. Realtime Inventory (§16/§17)

| Channel | Implementation | Self-hosted verdict |
|---|---|---|
| notifications | **SSE** `GET /api/notifications/stream` — polls `getNotifications` every 4s, 45s lifetime, EventSource reconnects | **KEEP** (only backend data access changes) |
| occupancy | **SSE** `GET /api/occupancy/stream` | **KEEP** |
| gate | **SSE** `GET /api/gate/stream` | **KEEP** |
| admin lockdown | **SSE** `GET /api/admin/lockdown/stream` | **KEEP** |
| `NotificationBell` `postgres_changes` INSERT on `notifications` | Supabase Realtime WebSocket — **the only Supabase realtime usage in the repo** | **REMOVE → already covered by the SSE stream in the same component** (it calls `loadNotifications()` on every SSE message) |
| `src/lib/websocket.ts` (`GateMonitorWS`, `NEXT_PUBLIC_WS_URL`, mock mode) | Raw-WebSocket client, mock-oriented, **no WS server exists in repo** | Out of scope, leave as-is → **REQUIRES_DECISION** if a real WS server was ever planned |

No LISTEN/NOTIFY anywhere (`pg_notify` helper was already removed — see schema L662 comment). ⇒ The realtime "migration" = delete one redundant subscription. **No realtime service/container needed** (per §23: no fake placeholder services).

---

## 7. Redis Inventory (§18)

| File | Current state | Action |
|---|---|---|
| `src/lib/rate-limit.ts` (237 lines) | 3 tiers: (1) **Upstash REST** `fetch(UPSTASH_REDIS_REST_URL/pipeline)` INCR + EXPIRE NX; (2) **Supabase `api_metrics` DB count** fallback in production (writes via anon client ⇒ RLS-broken anyway); (3) in-memory Map. Exports `checkRateLimit`, `rateLimit`, `withRateLimit` (47 importers), `rateLimits` presets. | **REPLACE tier 1 with real Redis** (compose already ships password-protected Redis 7 on the internal network, `REDIS_URL`). Keep tier 3 for dev/fallback. Drop tier 2. Preserve headers (`X-RateLimit-*`) and 429 semantics exactly. |
| `src/lib/cache.ts` (76 lines) | Docstring claims "Redis if REDIS_URL set" — **implementation is 100% an in-memory Map, no Redis code at all**. Used by `config/college-info`, `system/config`, `authContext` reads. | **REIMPLEMENT** as `src/lib/redis/{client,cache,rate-limit}.ts` per §18; real Redis GET/SET EX/SCAN-based invalidation, in-memory fallback when `REDIS_URL` absent. |
| `health.ts` `components.redis` field | declared in the type, never meaningfully populated | populate with a real ping once the Redis client exists. |

**No `@upstash/redis` package** — it was raw REST `fetch`, so removal = delete ~20 lines + swap in a client.

---

## 8. Worker & Scheduled Jobs (§19)

- `worker/index.mjs` is authoritative. `worker/index.js` is a **byte-identical duplicate → dead** (delete to avoid double-scheduling confusion).
  - `node-cron`: `backfill_daily_stats` 02:00 daily, `cleanup_expired_passes` 03:00 daily, `audit_log_rotation` Sun 04:00.
  - **Job implementations are stubs**: `worker/jobs/backfill_daily_stats.js` = `// TODO: implement … during migration step 10` (the other two jobs must be verified the same way).
  - Spawns `npx tsx scripts/sync-bridge/index.ts` with auto-restart.
- **Worker image bug (verified from Dockerfile):** the `worker` target runs `npm ci --omit=dev`, but `tsx` is a **devDependency** → `npx tsx` cannot resolve inside the current production worker image ⇒ **sync bridge is broken in the shipped image today**. Fix: ship `tsx` (or precompile) and test inside the actual image (§20).
- `src/lib/jobs.ts` holds **real** job implementations (RPC + fallback aggregation, pass cleanup…) used by manual `POST /api/admin/jobs/[id]/run` and **`GET /api/cron/reports`** (CRON_SECRET). ⇒ **Double-scheduler risk (§19):** worker cron + HTTP cron endpoint. Since `vercel.json` has no crons, no external trigger exists in-repo → worker stays the single authoritative *scheduler*; `/api/cron/reports` remains a manual/ops-only trigger (auth-gated), never externally scheduled.
- `src/lib/jobs.ts` vs `worker/jobs/*` duplicate the same job logic (TS-real vs JS-stub). Consolidation target: worker imports the shared `src/lib/jobs.ts` handlers → **REQUIRES_DECISION** (recommend direct import; avoids inventing a service-to-service auth mechanism).
- `scripts/sync-bridge/` — TS; `index.ts` builds a service-role `SupabaseClient` from `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`; `mapper.ts` resolves `device_user_mappings`; `sink.ts` writes `movement_logs` + `attendance_records`. Must be ported to the new DB layer while keeping the TCP-4370 device-adapter boundary and mock fallback intact.

---

## 9. Storage (§21)

**None.** No Supabase Storage, no Vercel Blob, no file uploads, no `/uploads`. In-app "backups" are **JSON rows in the `backups` DB table** (`src/lib/backup.ts`, SHA-256 checksummed, restore with FK ordering). Exports stream to the browser as client-side blobs.

⇒ **No storage abstraction needed** (`src/lib/storage/` not created — "do not migrate nonexistent functionality"). Physical `pg_dump` backups are the missing piece for §29 (planned: scheduled `pg_dump` → volume, retention, off-box copy, **tested restore**).

---

## 10. Environment Variables (§22)

| Class | Variables | Notes |
|---|---|---|
| **Client (NEXT_PUBLIC_)** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_WS_MOCK`, `NEXT_PUBLIC_APP_URL` | Supabase pair **dies** with §3.3 re-routing (zero browser DB access left). WS/app-url stay (inlined at build, not secret). |
| **Server: Supabase** | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` (sync-bridge), `SUPABASE_READ_REPLICA_URL` (dead) | **REMOVE after provider swap** |
| **Server: Upstash** | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | **REMOVE** → `REDIS_URL` (compose already generates it) |
| **Server: Vercel** | `VERCEL_URL` (env.ts), `VERCEL_OIDC_TOKEN` (.env.vercel) | **REMOVE** |
| **Server: infra (already in `.env.base.example`)** | `DATABASE_URL`, `POSTGRES_*`, `REDIS_PASSWORD`, `REDIS_URL`, `PUBLIC_URL`, `CLOUDFLARE_TUNNEL_TOKEN`, `CRON_SECRET` | keep |
| **Server: auth/security** | `MOBILE_TOKEN_SECRET`, `MFA_ENROLL_SECRET`, `JWT_SECRET`, `ACCESS_TOKEN_TTL_MINUTES`, `SESSION_TTL_DAYS`, `ALLOWED_ORIGIN` | keep + add `AUTH_SECRET`, `AUTH_URL`/`APP_URL` for the new provider |
| **Server: optional** | `SMS_*`, `EMAIL_*`, `SEED_DEFAULT_PIN`, `TEST_*`, `BIOMETRIC_DEVICE_*`, `LOG_LEVEL` | keep; `EMAIL_*` becomes load-bearing for password reset once off Supabase SMTP (**REQUIRES_DECISION** — who sends reset mail: the auth solution or `src/lib/integrations/email.ts`?) |
| **Scripts** | `JIRA_*` (gitignored `.env`) | unrelated, keep |

`scripts/validate-env.js` (runs `prebuild`) hard-fails without `NEXT_PUBLIC_SUPABASE_*` → rewrite to the new contract. `.env.example` (Supabase-shaped) → rewrite; `.env.base.example` is already close to the target shape. **Only `.env.example` is git-tracked (verified via `git ls-files`) — no secret-leak cleanup needed.**

---

## 11. Deployment / CI (§25–§28)

- **Existing workflows (preserve):** `branch-name.yml` (branch-convention guard), `cleanup-artifacts.yml`, `qa-evidence.yml` (npm ci + "QA tests" referencing `qa-evidence/screenshots` — effectively a no-op test today).
- **Missing entirely:** no lint/typecheck/test/build job, no Docker build job, **no deploy workflow**, no image registry usage.
- **Deploy credentials:** task states they're already configured → discover at implementation time (repo/org Actions secrets for image push + server deploy). Never print, rotate, or duplicate them. If genuinely absent → report `REQUIRES_CONFIGURATION` with exact secret names.
- **Tailscale:** nothing in repo references tailscale. `docs/SELF-HOSTED-SERVER.md` describes WSL2 + Cloudflare tunnel + docker compose; `systemd/gate-stack.service` runs `docker compose -f docker-compose.base.yml` from `/home/akarsh/gate-monitor`. Deploy-over-Tailscale must reuse existing server access config, not open new ports.
- **Ingress:** `Caddyfile` (reverse_proxy `web:3000`, security headers, `flush_interval -1`, `PUBLIC_URL`) + `cloudflared` service exist in **both** compose files. **Keep.** Caveat: **no `caddy` service in either compose file** — cloudflared tunnels straight to `web:3000` today, so the Caddyfile is unused → **REQUIRES_DECISION**: add `caddy` service (cloudflared → caddy → web, per the mandated diagram) vs keep direct tunnel.
- **Compose duplication:** `docker-compose.yml` (postgres15 + redis7 + web + worker + cloudflared, named volumes, internal `gate-net`, **no published pg/redis ports** ✔) vs `docker-compose.base.yml` (infra-only, bind-mounted volumes, postgres16). Drift: pg 15 vs 16, named vs bind volumes. Unify (base = infra, full = + app, or one file with profiles).

---

## 12. Consolidated migration checklist (task §37)

### Remove (deployment-only / dead)
`vercel.json`, `.vercel/`, `.env.vercel`, `VERCEL_URL` fallback, Upstash REST path, `@supabase/supabase-js` (+7 transitive), `src/lib/supabaseClient.ts`, `getReadOnlyClient`, `worker/index.js` duplicate, `supabase/migrations/*.bak`, browser anon-client paths (`layout` query, `ManualEntryDialog` query, `NotificationBell` realtime channel), Supabase requirements in `validate-env`, wrong doc references.

### Replace
- **PostgREST → self-hosted DB layer** (`src/lib/db/{client,queries,transactions,types}` with `pg` Pool, transactions, parameterized SQL, typed results). `src/lib/db.ts` keeps signatures; internals rewrite.
- **GoTrue → auth provider** behind `src/lib/auth/{server,session,permissions,users}`; middlewares switch from `supabase.auth.getUser(token)` to local session/JWT validation.
- **Upstash REST → Redis 7 client** in `src/lib/redis/*`.
- **`auth.admin.*` provisioning (17 sites)** → provider admin API or local service functions.
- **`auth.uid()` / `auth.users` SQL** → compatible identity/user storage (§5.3).
- **Sync-bridge Supabase client** → new DB layer.
- **validate-env + `.env.example`** → new env contract.

### Keep
Next.js App Router + all 125 API routes; `withAuthorization`/`authContext` role model; 4 SSE routes; mobile-auth (jose/HS256); QR tokens; TOTP 2FA + MFA bootstrap; OIDC SSO; `src/lib/db.ts` public API; SQL migration history + schema.sql; RLS policies (§5.4); worker cron structure; sync-bridge device boundary; Caddyfile + cloudflared; compose volumes/network/healthchecks; existing GH workflows; deps `bcryptjs`, `jose`, `node-cron`, `rate-limiter-flexible`.

### Migrate (data)
- Password hashes live in **Supabase `auth.users.encrypted_password` (GoTrue, SCrypt format)**; `public.users.password_hash` exists (schema L48) but only `change-password` consults it. ⇒ **one-shot import** with format shim (verify GoTrue scrypt → rehash bcrypt on first login) **or** forced reset → **REQUIRES_DECISION** (§13.2).
- Preserve `auth.users.id` == `public.users.id` UUID equality (profiles are FK'd/trigger-linked).
- Sessions: GoTrue refresh tokens → new refresh store; `users.handle` survives (app-owned).
- `device_user_mappings`, `webauthn_credentials` (empty in practice), `sso_config`, `two_factor_secret`, audit/logs tables: no transformation.

### Security-critical
Per-request token validation (266 routes); single-device `handle` check; role/permission checks; PIN bcrypt + no-oracle responses; auth rate limits (5/15min); 2FA fail-open config (documented); `MOBILE_TOKEN_SECRET` ≥32 chars; no secrets in `NEXT_PUBLIC_*`; zero browser DB access after re-routing §3.3; RLS retained; service role unreachable from browser; backup JSON contains personal data (already admin-gated).

### New services required
`postgres` ✔, `redis` ✔, `app` ✔, `worker` ✔, `cloudflared` ✔, `caddy` (decision), `auth` container only if §13.1 requires it, `realtime` container **not needed** (SSE covers it).

---

### Files expected to be modified (blast radius)
- **New:** `src/lib/db/{client,queries,transactions,types}.ts`, `src/lib/auth/{server,session,permissions,users}.ts`, `src/lib/redis/{client,cache,rate-limit}.ts`, `scripts/migrate.ts`, `docs/*` (8 files), deploy workflow, `.env.example`.
- **Same public API, new internals:** `src/lib/db.ts` (~25 dynamic imports + ~40 query sites), `src/lib/authContext.ts`, `src/middleware/{auth,authorization,metrics}.ts`, auth routes (`login`, `pin-login`, `session`, `logout`, `change-password`, `reset-password`), `users`, `users/bulk`, `persons` routes, `src/lib/{health,rate-limit,cache,jobs,alerting,ldap,security,sso,notification-service}.ts`, `scripts/sync-bridge/*`, `scripts/validate-env.js`.
- **~74 API routes:** mechanical import swap (see §13 strategy note).
- **Client:** `layout.tsx`, `ManualEntryDialog.tsx`, `NotificationBell.tsx`, `operatorStore`, `adminStore`, `settings/notifications/page.tsx`, `authStore` (cookie/bearer model).
- **Infra:** `Dockerfile` (worker must ship `tsx`), `docker-compose*.yml` (unify, maybe add caddy), `Caddyfile` (if caddy adopted), `.github/workflows/*`.

### Risks
1. **369 PostgREST call sites / 115 builder chains** — highest-risk, highest-effort item. Mitigation: a **PostgREST-compatible compat client** (small `.from().select().eq()…` → SQL translator over the 56 tables + operators actually used) *or* a self-hosted Supabase stack keeping PostgREST (§13.1 option A). Must first measure operator coverage (`.or()`, `.in()`, `.ilike()`, `.not()`, `.is()`, `.range()`, joins `table!fk(*)`, `{count:'exact',head:true}`, `upsert onConflict`, `single/maybeSingle`, `error.message/code` shapes).
2. **Password-hash format mismatch** (GoTrue scrypt vs bcrypt) — cannot "just copy".
3. **Pre-existing tsc errors** (`src/data/cheatsheet/atcd.ts`) — a CI typecheck gate would be red on day one; fix or scope it.
4. **Worker image can't run sync-bridge today** (`tsx` devDep + `npm ci --omit=dev`) — confirmed by Dockerfile reading; verify with an actual image build.
5. **Silent-RLS-fallback paths** (`operatorStore.statsToday`, `adminStore.dashboard`, …) only "worked" by failing quietly — post-migration they'd throw if not deliberately re-routed. Parity risk.
6. **`cron/reports` + worker double-execution** if an external cron exists outside the repo (invisible from here) → confirm with owner during implementation.
7. **Two compose files drift** (pg 15 vs 16, bind vs named volumes) — deploying the wrong one changes data handling.
8. **Job logic duplicated** (`src/lib/jobs.ts` real vs `worker/jobs/*` stubs) — "preserve scheduled jobs" means making them actually run, not just present.
9. **Single-device `users.handle` semantics** — any auth rewrite must keep exact behavior (second device kicks the first) or sessions regress.
10. **SSE behind proxy** needs `flush_interval -1` in Caddy (present ✔) and a non-buffering tunnel (default ok) — verify live with `curl -N`.
11. **RLS + app role interplay**: app writes must run as the privileged role; a route accidentally connecting as a constrained role will start failing loudly where it passed before.

---

## 13. REQUIRES_DECISION (cannot be safely determined from the repo)

1. **Auth provider architecture — the pivotal choice.** Gathered requirements: login via `login_identifier`/`unique_id`/`email` + password; bcrypt-compatible hashing (hashes in `auth.users` today, maybe `users.password_hash`); TOTP 2FA (app-owned, keep); OIDC SSO (app-owned, keep); PIN login minting sessions without passwords; mobile HS256 tokens (keep); reset-email delivery (currently Supabase SMTP); single-device `users.handle`; role authz (app-owned); provisioning from 6 admin routes; refresh/revocation. Candidates:
   - **(A) Self-hosted Supabase stack** (GoTrue + PostgREST in Docker, no hosted services). Smallest code delta — PostgREST chains, GoTrue admin APIs, RLS, `auth.uid()`, `auth.users` keep working nearly verbatim; fully self-hosted. But keeps the app coupled to Supabase-shaped APIs (may read as "not a restructure") and is heavier than needed given realtime = 1 SSE-covered subscription, storage = 0, edge = 0.
   - **(B) Mature external IdP (Keycloak / Authentik / Authelia) via OIDC** + local session issuer. Strongest "established solution" story (§10), but every bespoke flow (PIN session minting, per-request `handle` check, provisioning loops, TOTP enrollment bootstrap, first-sysadmin break-glass) needs OIDC round-trips or a local issuer — large new surface for a campus app whose client already stores our own JWT.
   - **(C) App-owned auth module on Postgres** (lean recommendation): server-side `src/lib/auth` using **`bcryptjs` + `jose` (already dependencies)** + a `sessions` table + HttpOnly cookies; standard primitives only, no hand-rolled crypto; implements password/PIN/refresh/revoke/reset (via existing `src/lib/integrations/email.ts`) against existing tables. No new container; full control of `handle`, TOTP, provisioning. Risk: we own credential storage — mitigated by established libraries, strict tests, §12 requirements. (§10 forbids writing custom crypto *from scratch*; bcrypt+jose is not that — but §10 also says "evaluate an established self-hostable solution", so this needs explicit sign-off.)
   Requirements are gathered (above); A/B/C materially change containers, effort, and data-migration shape → **owner decision required before Stage 4 (auth migration).**
2. **Password-hash migration strategy** (depends on 1): import + rehash-on-login vs forced reset.
3. **RLS:** recommended KEEP with provider-compatible roles + identity function (§5.4) — confirm.
4. **Caddy:** add `caddy` container (cloudflared → caddy → web) vs keep cloudflared → web direct.
5. **Worker jobs:** import shared `src/lib/jobs.ts` handlers vs HTTP-trigger via `/api/admin/jobs/[id]/run`.
6. **WebAuthn:** wire up dormant passkeys now, or leave dormant (tables kept either way).
7. **Deploy credentials:** which GitHub secrets already exist for image push + server deploy (discover from repo/org settings at implementation; never print).
8. **`create_user_with_auth` / `delete_user_with_auth` SQL functions:** wire in or retire (unused by current code).
9. **`src/middleware/metrics.ts`:** anon-client `api_metrics` writes (RLS-suspect) — move onto DB layer or drop (observability only).

---

*End of audit. No source files, configs, or dependencies were modified in this analysis pass.*

