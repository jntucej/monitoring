# U4 — Redis-backed API Rate Limiting: Stage 1 Audit & Implementation Proposal

**Status:** AUDIT COMPLETE · NO CODE WRITTEN · AWAITING IMPLEMENTATION APPROVAL
**Baseline commit:** `4827c21a` (U3 ledger)
**Date:** 2026-11-25

---

## Critical finding: U4 is mostly already built — the remaining work is hardening

The repo already ships a working, layered rate-limit system (`src/lib/rate-limit.ts`, 349 lines) that:

1. **Primary store: Postgres** `rate_limit_buckets` table (single atomic SQL `INSERT ... ON CONFLICT DO UPDATE` — correct across replicas)
2. **Secondary store: Redis** `INCR` + `EXPIRE` on global `rl:{keyPrefix}:{key}` keys — used when Postgres is down, **or** as the first fallback for auth-sensitive keys
3. **Tertiary: in-memory fallback** per instance — only when both stores are down; **auth-sensitive prefixes fail closed** (503), everything else fails open
4. **Public API:** `withRateLimit(handler, {windowMs, maxRequests, keyPrefix})` wrapper + `rateLimitByKey(explicitKey, cfg)` for per-identifier locks
5. **Headers:** `x-ratelimit-limit`, `x-ratelimit-remaining`, `x-ratelimit-reset`, `retry-after`, `x-ratelimit-hit`
6. **Identity:** `x-user-id` (injected by `withAuthorization` from the verified JWT — client-supplied versions are overwritten and HMAC-signed) or trusted client IP via `extractClientIp()`

**264 of 495 API routes already use `withRateLimit`/`withAuthorization`/`assertCsrf`** (per the middleware comment, `src/middleware.ts:222`). The edge middleware (`src/middleware.ts`, runtime=edge, `pg unavailable`) is deliberately a pass-through for rate limiting — the limits live in the Node.js route-handler runtime.

So U4's real scope is **not** "build rate limiting from scratch" — it is:

| Gap | Current state | U4 work |
|---|---|---|
| A. Redis as **primary** store | Redis is only the fallback when Postgres fails; Postgres `rate_limit_buckets` is primary | Make Redis-primary configurable (env flag), Postgres fallback, matching your "atomic Redis INCR + expiry" requirement |
| B. **Lua atomicity** | `INCR` + `EXPIRE` are two round-trips; a crash between them leaks a key with no TTL | Replace with a single Lua script (atomic INCR+PEXPIRE on first hit, returns count+ttl in one call) |
| C. **Central per-route policy map** | Each route passes its own `{windowMs, maxRequests}` inline; no central policy file | Add `src/server/rate-limit-policies.ts` with per-category presets; routes opt in by name |
| D. **429 body uses U3 contract** | 429 body is hand-built inline in `withRateLimit` | Route it through `handleApiError`-shaped canonical body (it already matches; formalize + test) |
| E. **Redis outage policy is hardcoded** | Auth prefixes fail closed, rest fail open — not configurable | Env-configurable per-category failure policy (default: auth fail-closed, others fail-open) |
| F. **Concurrency/expiry tests** | No dedicated tests for the limiter's atomicity, window expiry, Redis-down, header spoofing | New test file: 14 scenarios from your Step 10 list |

---

## Step-by-step audit results

### Step 1 — Repository state
- Branch `main`, HEAD `4827c21a`, clean tree, in sync with `origin/main`
- U3 commits `109de392` + `4827c21a` present ✓

### Step 2 — Middleware audit
- `src/middleware.ts`: edge runtime, pass-through for rate limits (by design — edge has no pg/redis access in this architecture)
- `src/lib/rate-limit.ts`: the shared limiter (Postgres-primary → Redis → memory)
- `withRateLimit` wrapper + `attachHeaders` + `rateLimitByKey` already exist
- **No API route declares `runtime = "edge"`** (0 edge, 1 explicit nodejs) → all 495 routes run in Node.js runtime; Redis client is fully available at the execution location ✓ — your critical constraint (don't force Node Redis into edge) is already satisfied by the current design

### Step 3 — Redis infrastructure
- Client: `redis` npm ^4.7.1 (official v4), lazy singleton in `rate-limit.ts` with reconnect strategy (5 retries × 500ms) and a `client.on("error")` no-crash handler
- Service: `gate_redis` = `redis:7-alpine`, `requirepass` from `.env` (`REDIS_PASSWORD`), **mem_limit 512m** (rate-limit keys are tiny; no eviction risk from this workload)
- Key convention in use: `rl:{keyPrefix}:{key}` where key = `rl:{path}:{u:userId|ip}` → e.g. `rl:rl:/api/auth/login:u:abc123`
- Existing consumers: `src/lib/cache.ts` (dual-mode Redis/memory TTL cache), `src/lib/health.ts` (redis health probe) — **no new client or service needed** ✓

### Step 4 — Identity and security assessment
- **Authenticated:** `x-user-id` is set by `withAuthorization` **from the verified JWT** (client-supplied values are overwritten; the header set is HMAC-signed via `signTrustedHeaders` → `x-mw-signature`). Spoofing `x-user-id` on a `withRateLimit(withAuthorization(...))` route is impossible ✓
- **Unauthenticated:** Caddy `reverse_proxy` sets `X-Client-IP {remote_host}` (the real TCP peer) and **strips all client-supplied `X-Forwarded-For`/`X-Real-IP`/`X-Client-IP` at the edge** before proxying → `extractClientIp()` prefers `x-client-ip` (Caddy's, trusted) and treats `X-Real-IP` as untrusted unless `TRUSTED_PROXY_IPS` is set (currently **empty** in `.env` — correct posture)
- **Bypass vectors checked:** changing `X-Forwarded-For` → ignored (stripped by Caddy); rotating tokens → per-user key means a user can't bypass by re-authing; shared IP → per-user keys on authenticated routes, per-IP on anonymous (documented trade-off: one IP behind NAT shares a bucket for anonymous endpoints only)
- **Logging:** the limiter logs store outages only (key prefix + config), never tokens/passwords/cookies ✓
- **Unresolved:** anonymous (pre-auth) routes key by IP; if the institution ever sits behind a second untrusted proxy layer, `TRUSTED_PROXY_IPS` + socket-peer enforcement must be configured before enabling `X-Real-IP`

### Step 5 — Algorithm assessment
- **Current:** Postgres single-statement atomic upsert (correct, cross-replica). Redis path: `INCR` then conditional `EXPIRE` (2 RTT; a crash between them = key without TTL = key stuck until process restart… actually stuck **forever** — memory leak risk under load)
- **U4 change (Gap B):** single Lua script — one round-trip, atomic:
  ```lua
  local c = redis.call('INCR', KEYS[1])
  if c == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
  local ttl = redis.call('PTTL', KEYS[1])
  return {c, ttl < 0 and ARGV[1] or ttl}
  ```
  Returns `[count, ttlMs]`; client computes `remaining`, `limited`, `retryAfter` exactly as today. Fixed-window (matching the existing Postgres `reset_at` semantics) — sliding window rejected as a larger change than the infra needs (your "smallest compatible solution" rule)
- **Counter cleanup:** PEXPIRE on creation → keys self-expire; 512m mem cap; key count bounded by (routes × active identities / window) — negligible
- **Redis failure:** covered in Step 7

### Step 6 — Route policy proposal (central map, Gap C)
New file `src/server/rate-limit-policies.ts` with named presets; routes keep inline overrides (per-route wins). Starting values = your proposal, adjusted by traffic audit:

| Category (policy name) | Window | Max | Applies to |
|---|---|---|---|
| `auth` | 60s | 10 | `api/auth/login`, `bootstrap`, `change-password`, `step-up` (all fail-closed) |
| `otp` | 60s | 5 | `auth/*verify*`, passkey verify, `reset-password` request (fail-closed) |
| `default-authenticated` | 60s | 120 | everything wrapped in `withAuthorization` without a named policy |
| `dashboard-read` | 60s | 180 | `api/dashboard/**`, `api/admin/**` GETs, read-heavy panels |
| `admin-mutation` | 60s | 20 | `api/sysadmin/**` POSTs, `api/admin/**` mutations |
| `expensive` | 60s | 5 | image/document generation (`/generate`, `/direct-generate`, mess token regeneration) |

**Explicitly NOT limited:** health checks, static/CSS/JS chunk routes, the 125+ routes currently with no limiter (unchanged in U4 — that's U7 "unified chain" territory). No arbitrary global limit.

### Step 7 — Failure policy (Gap E)
- **Default (today's behavior, now env-configurable):**
  - auth/otp/admin-mutation policies → **fail-closed 503** when Redis (and Postgres) are both down (`RATE_LIMIT_STORE_UNAVAILABLE`, U3-shaped body)
  - dashboard/default/expensive → **fail-open** (availability > strictness), loud server log + `x-ratelimit-store: degraded` header
- **Env switches:** `RATELIMIT_FAIL_CLOSED_CATEGORIES` (comma list, default `auth,otp,admin-mutation`) — Redis outage detection is the existing reconnect strategy; recovery is automatic (next request succeeds) and the fail-closed latch re-logs after 60s (existing behavior)
- **Trade-off documented:** fail-closed on auth protects against a Redis outage becoming an unlimited credential-guessing channel; fail-open on reads avoids a Redis outage taking the whole app down. Admin mutations fail-closed because an unbounded mutation window during an outage is an operational blast-radius risk.

### Step 8 — Response contract (Gap D)
429: `{ success: false, error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests. Please wait a moment and retry." } }` (U3 `friendlyApiError` copy) + headers `retry-after: N`, `x-ratelimit-limit/remaining/reset/hit`. Store-unavailable: 503 + `RATE_LIMIT_STORE_UNAVAILABLE`. No Redis error text ever reaches the client (asserted by test).

### Step 9 — Exact implementation proposal

**Files to modify (5):**
1. `src/lib/rate-limit.ts` — swap the Redis path to a Lua script; add `primary: "postgres" | "redis"` from env (`RATELIMIT_PRIMARY_STORE`, default `postgres` for zero behavior change on deploy); wire failure-policy categories through
2. `src/lib/rate-limit-policies.ts` — NEW: preset map `{ auth, otp, defaultAuthenticated, dashboardRead, adminMutation, expensive }` + `policyForRoute(pathname, explicit?)` resolver
3. `src/app/api/auth/login/route.ts` + 2 auth/OTP routes — adopt named policies by reference (mechanical: replace inline config with `Policies.auth`)
4. `tests/unit/rate-limit.test.ts` — NEW: the Step-10 scenario matrix (uses a local redis in the vitest env or mocked client; atomicity via `Promise.all` concurrency)
5. `docs/SEQ-IMPLEMENTATION-FRAMEWORK.md` — ledger row

**No changes to:** `src/middleware.ts` (edge pass-through stays), `authorization.ts`, `csrf.ts`, any RBAC config, Docker compose, Caddyfile.

**Interfaces (all exported from `rate-limit.ts` / new policies file):**
```ts
type RateLimitCategory = "auth"|"otp"|"default"|"dashboard"|"admin-mutation"|"expensive";
interface RateLimitPolicies { auth: RateLimitConfig; otp: RateLimitConfig; … }
export function policyForRoute(pathname: string, explicit?: RateLimitConfig): RateLimitConfig;
export function withRateLimitPolicy(handler, opts: { policy?: RateLimitCategory; route: string }) → wrapped handler
```

### Step 10 — Testing strategy (new `tests/unit/rate-limit.test.ts`)
1. Below threshold → 200 + `x-ratelimit-remaining` reflects real store count
2. Exact threshold → Nth request still passes, (N+1)th = 429
3. Exceeding → 429 + `retry-after` ≤ window
4. Window expiry (fake timers or 1s window) → counter resets
5. Concurrency: 50 parallel requests → exactly `max` admitted (Lua atomicity)
6. Multiple users → independent buckets (per-user key)
7. Unauthenticated client → per-IP bucket via `extractClientIp`
8. Per-route override beats policy default
9. Redis down: auth category → 503 fail-closed; dashboard → fail-open 200
10. Redis recovery → limiter live again on next request
11. Spoofed `x-forwarded-for`/`x-real-ip` → ignored (bucket key unchanged, using Caddy's `x-client-ip`)
12. Auth/RBAC regression: existing auth suite green
13. CSRF regression: `assertCsrf` paths untouched (suite green)
14. U3 compatibility: 429 body deep-equals the U3 canonical shape; no Redis error string leaks

### Step 11 — Deployment & rollback
Deploy = `docker build` web+worker (no compose/Caddy/redis changes; `RATELIMIT_PRIMARY_STORE` defaults keep today's Postgres-primary behavior live) → **zero behavior change on deploy**; flip `RATELIMIT_PRIMARY_STORE=redis` + set category fail-closed env in a second, separately-authorized step. Rollback = revert env or redeploy previous image tag (protected pre-tags kept).

### Step 12 — Architectural risks & unresolved decisions
1. **Postgres `rate_limit_buckets` table cleanup** — if Redis becomes primary, the Postgres buckets table stops being written; keep the fallback path (recommended) vs delete the table (not in U4 scope)
2. **Single Caddy hop today** — the `TRUSTED_PROXY_IPS` socket-peer enforcement is unconfigured; if a second proxy is ever added, unauthenticated identity must be re-audited
3. **Shared-IP (NAT) anonymous bucketing** — acceptable trade-off; per-device fingerprinting rejected (privacy + complexity)
4. **Policy values are starting points** — final numbers should be set after observing `x-ratelimit-hit` metrics on the real traffic dashboard (post-deploy, U4b)

---

## Proposed U4 implementation scope (approve = proceed)
- Gap A+B: Redis-primary switchable + Lua atomic INCR/PEXPIRE (backward-compatible default)
- Gap C: central policy map + `policyForRoute`
- Gap E: env-configurable failure policy (default = today's behavior)
- Gap F: 14-scenario test file
- 3 auth/OTP routes migrated to named policies (mechanical, no behavior change at default limits)
- **Not included:** global middleware chain (U7), S3 (U10), worker rebuild, deployment

**STOP — awaiting explicit U4 implementation approval. No files were modified during this audit.**
