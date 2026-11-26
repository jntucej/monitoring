# U7 — Unified Middleware / Security Chain: Stage 1 Audit & Implementation Proposal

**Date:** 2026-11-26  
**Repository:** `/opt/monitoring/compose` (`git@github.com:jntucej/monitoring.git`, branch `main`)  
**Status:** Audit & Proposal Only (no U7 implementation code written, no deployment)

---

## 1. Current-State Evidence

| Item | Verified State |
|---|---|
| Git branch & HEAD | `main` at `f922044b` (`feat: U6 — structured JSON request logging`) |
| U3 status | **implemented + tested + committed + pushed** (`109de392`), **not deployed** |
| U4 status | **implemented + tested + committed + pushed** (`889bd900` + `2fdab065`), **not deployed** |
| U5 status | **implemented + tested + committed + pushed** (`0c974fe3`), **not deployed** |
| U6 status | **implemented + tested + committed + pushed** (`f922044b`), **not deployed** |
| Working tree | Dirty from two pre-existing unrelated UI edits (`M src/components/retention/UnifiedCampusCalendar.tsx`, `M src/components/student/StudentAttendancePage.tsx`); not part of U6 or U7 |
| Implementation ledger | `docs/SEQ-IMPLEMENTATION-FRAMEWORK.md` §7 (U1–U2 deployed; U3–U6 implemented+tested, not deployed) |
| Live `gate_web` container | Created `2026-11-25T15:59:17Z` (`monitoring-web:latest`, `sha256:0b4d9642...`) — predates U3–U6 |

---

## 2. Route Security Inventory (`src/app/api/**/route.ts`)

Programmatic scan of all **798** API route files:

| Mechanism / Category | Count | Notes |
|---|---:|---|
| Total API route files | 798 | `GET`: 529, `POST`: 364, `PUT`: 7, `PATCH`: 62, `DELETE`: 34 |
| `withAuthorization` | 624 | Wraps `metricsMiddleware` + JWT/session + RBAC + `setupBodyCaching` |
| `withRateLimit` | 319 | 45 `withRateLimit(withAuthorization(...))`, 1 `withAuthorization(withRateLimit(...))`, ~273 public/other |
| `assertCsrf` (route-level) | 168 | Edge `src/middleware.ts` also runs `validateCsrf` on all `/api/*` mutations |
| `validateBody` (U5 Zod) | 5 | `auth/login`, `auth/change-password`, `admin/announcements`, `sysadmin/backup-maintenance-center`, `bot/chat` |
| `log.wrap` | 2 | `auth/login`, `system/config` |
| `admin/` + `sysadmin/` routes | 167 | Privileged/admin |
| `auth/` routes | 17 | Credential/session/passkey/reset |
| `cron/` routes | 30 | Internal cron (`requireCronAuth` bearer secret) |
| `webhook` routes | 6 | External callbacks (HMAC/shared-secret, CSRF-exempt) |
| Upload / `formData()` routes | 2 | Multipart file uploads |
| SSE / `ReadableStream` routes | 6 | Streaming responses (`bot/chat`, `occupancy/stream`, `notifications/stream`, etc.) |
| Public (no `withAuthorization`, no `withRateLimit`) | 148 | Includes `/api/health`, `/api/csrf`, `/api/cron/*`, `/api/webhooks/*`, public read endpoints |

---

## 3. Current Execution Chains (Verified)

### A. Edge Layer (`src/middleware.ts` — runs on all `/api/:path*`)
```text
Request
  → mint/forward x-request-id (unvalidated at edge) + CSP nonce
  → BYPASS_PATHS (/api/health, /metrics, /api/metrics) → NextResponse.next()
  → SCRAPER_IPS check
  → validateCsrf(req) on POST/PUT/PATCH/DELETE (except CSRF_EXEMPT) → 403 on fail
  → NextResponse.next()
```

### B. Standard Authenticated + Rate-Limited Route (`withRateLimit(withAuthorization(handler))` — 45 routes)
```text
withRateLimit (outer)
  → checkRateLimit(req) [IP-based because x-user-id is NOT set yet!] → 429/503 + logRequest
  → withAuthorization
      → metricsMiddleware (starts timer, sanitizes x-request-id)
          → setupBodyCaching(req) [if non-GET/HEAD and body !== null]
          → requireAuthUser(bearer(req)) + device binding + passwordMustChange + RBAC + delegation
          → signTrustedHeaders (sets x-user-id, x-user-role, x-mw-signature, x-u6-auth=1 on proxied req)
          → handler(proxied, { auth })
              → [optional] assertCsrf(req)
              → [optional] validateBody(req, schema) [single streamed read + 413/400]
              → [optional] handleApiError(err) [U3 JSON + x-error-code]
          → metricsMiddleware strips internal headers, emits 1x http.request, writes api_metrics
  → withRateLimit attaches x-ratelimit-* headers, sees x-u6-logged=1, strips it, skips duplicate log
```

### C. Inverted Order (`withAuthorization(withRateLimit(handler))` — 1 route: `sysadmin/autonomous-monitoring`)
- `withAuthorization` runs first, sets `x-user-id` + `x-u6-auth=1`, then `withRateLimit` buckets by `u:<userId>` and skips duplicate logging.

### D. Public Rate-Limited Route (`withRateLimit(handler)` — e.g. `auth/login`)
- `withRateLimit` buckets by IP (or `rateLimitByKey`), runs handler, emits `1x http.request`.

### E. Cron / Webhook Routes
- `cron/*`: `requireCronAuth(req)` checks `CRON_SECRET` bearer token; no `withAuthorization`, no `withRateLimit`, no `assertCsrf` (or exempt).
- `webhooks/*`: `CSRF_EXEMPT` in `src/lib/csrf.ts`; verified by HMAC/shared-secret header inside handler.

---

## 4. Security Exceptions (Must Be Preserved)

1. **Safe HTTP methods (`GET`, `HEAD`, `OPTIONS`):** Exempt from CSRF.
2. **Login / Refresh / Reset / Bootstrap / `/api/csrf`:** Exempt from `withAuthorization` and `CSRF_EXEMPT` (or login-CSRF checked); rate-limited by IP/identifier (`auth` 10/min, `otp` 5/min, fail-closed).
3. **Webhooks (`/api/webhooks/alertmanager`, `/api/telegram/webhook`):** `CSRF_EXEMPT` (no browser `Origin`/`Sec-Fetch-Site`); authenticated via shared secret/HMAC.
4. **Cron (`/api/cron/*`):** Authenticated via `CRON_SECRET` (`requireCronAuth`), not user JWT; no browser CSRF.
5. **Uploads (`multipart/form-data` / `formData()`):** Must **not** pass through JSON `validateBody`; use `assertBodySize` or streaming multipart parser.
6. **SSE / Streaming (`text/event-stream`, `ReadableStream`):** Must **not** buffer response body; log on header return.
7. **Health / Metrics (`/api/health`, `/api/metrics`):** Bypass edge CSRF/rate-limit and skip `http.request` logging unless `LOG_HEALTH_CHECKS=1`.

---

## 5. Wrapper-Order Hazards Identified

1. **Rate Limiting Before Authentication (`withRateLimit(withAuthorization(...))`):**
   - **Hazard:** `withRateLimit` calls `bucketKey(req)` which checks `req.headers.get("x-user-id")`. When `withRateLimit` is *outer*, `withAuthorization` has not run yet, so `x-user-id` is absent — **all 45 `withRateLimit(withAuthorization(...))` routes silently fall back to IP-based bucketing instead of per-user bucketing** (shared campus NAT/Wi-Fi users collide on one IP bucket!).
   - **Fix in U7:** For authenticated routes, `withAuthorization` (identity) must run **before** `withRateLimit` (per-user bucket), while public/login/OTP routes run `withRateLimit` without `withAuthorization` (IP/key bucket).
2. **Body Caching (`setupBodyCaching`) vs `validateBody`:**
   - `withAuthorization` calls `setupBodyCaching(req)` on non-GET requests with a body, which reads `req.text()` and re-wraps `NextRequest`. `validateBody` then reads `req.body` stream. This works for JSON, but **must be skipped for multipart/upload routes** if large files are streamed.
3. **CSRF Before Body Parsing:**
   - `validateCsrf(req)` only inspects `method`, `pathname`, `sec-fetch-site`, `origin`, and `host` headers — it **never** reads the body stream. Running CSRF before `validateBody` is safe and prevents unauthenticated/cross-site payloads from being parsed.
4. **Double Error Normalization:**
   - If a route calls `handleApiError` inside `try/catch` AND an outer wrapper also catches, `ApiError` passes through `normalizeApiError` idempotently, but `handleApiError` should only run once at the outer boundary (or inner catch returns `NextResponse` without re-throwing).
5. **Duplicate Logging:**
   - Already solved in U6 via `x-u6-auth` / `x-u6-logged` coordination between `metricsMiddleware` and `withRateLimit`. Any U7 wrapper must preserve this single-emission invariant.

---

## 6. Architecture Options Comparison

| Criterion | Option A: Monolithic `withApiSecurity` | Option B: Ad-hoc existing wrappers | Option C: Thin Hybrid Orchestrator (`withApiChain`) |
|---|---|---|---|
| Security correctness | High, but rigid for 798 routes | Low — 45 routes have inverted RL/Auth order | **High** — enforces canonical order by construction |
| Migration complexity | High (rewrites 798 routes) | Zero, but leaves hazards unfixed | **Low** — additive, wraps existing U3/U4/U5/U6 primitives |
| Regression risk | High | Low | **Low** — existing wrappers remain intact |
| Special-route exceptions | Awkward flags | Easy | **Clean** — explicit `auth: "none" \| "user" \| "cron"`, `csrf`, `rateLimit`, `bodySchema` |
| TypeScript ergonomics | Complex generics | Inconsistent | **Clean** — typed `ctx.auth` and `ctx.body` |

**Recommendation:** **Option C — Thin Hybrid Orchestrator (`src/lib/api-chain.ts` exporting `withApiChain`)** that composes the existing U3 (`handleApiError`), U4 (`withRateLimit`), U5 (`validateBody`), U6 (`logRequest` / `metricsMiddleware`), `withAuthorization`, and `assertCsrf` primitives in the canonical order without rewriting or deleting existing wrappers.

---

## 7. Canonical Execution Order (Recommended)

```text
Request
  1. Request ID        (sanitizeRequestId from x-request-id; echoed on response)
  2. CSRF              (assertCsrf on mutations unless csrf: false / exempt — header-only, zero body read)
  3. Authentication    (withAuthorization if auth !== "none"; sets verified userId/role)
  4. Authorization     (RBAC requiredRole / requiredPermission / resource op)
  5. Rate Limiting     (withRateLimit — now has verified userId for auth routes, IP for public routes)
  6. Body Validation   (validateBody(req, schema, { maxBytes }) — single streamed read, 413/400)
  7. Handler           (receives { auth, body, requestId })
  8. Error Norm (U3)   (handleApiError — canonical { success: false, error: { code, message } })
  9. Request Log (U6)  (exactly one http.request JSON line + strip internal headers)
```

**Why CSRF (step 2) before Auth (step 3) and Rate Limit (step 5)?**
- `validateCsrf` is pure header inspection (O(1), zero DB/Redis calls). Rejecting cross-origin browser mutations before JWT/DB/Redis work saves resources and blocks CSRF before any state or rate-limit bucket is touched.
- **Exception:** Public/login/webhook/cron routes set `csrf: false` (or rely on `CSRF_EXEMPT`), so they proceed directly to Rate Limit (step 5) or Cron/Webhook auth.
- **Exception:** Auth/OTP routes (`auth: "none"`) run Rate Limit (step 5) by IP/identifier before credential verification inside the handler.

---

## 8. Migration Strategy (Staged, Additive)

1. **Phase 1 (U7 Core + Pilot):**
   - Create `src/lib/api-chain.ts` (`withApiChain`) composing existing primitives.
   - Migrate **5 pilot routes** (the 5 U5-validated routes: `auth/login`, `auth/change-password`, `admin/announcements`, `sysadmin/backup-maintenance-center`, `bot/chat`) to prove all modes (public+RL+Zod, auth+CSRF+Zod, admin+RBAC+Zod, SSE+Zod).
2. **Phase 2 (Post-U7, incremental):**
   - Migrate the 45 `withRateLimit(withAuthorization(...))` routes to fix the IP-vs-user rate-limit bucket hazard.
   - Keep existing `withAuthorization`, `withRateLimit`, `assertCsrf`, `validateBody`, `handleApiError` exported and untouched for the remaining routes until migrated.

---

## 9. Exact Files to Create / Modify (Proposed U7 Scope)

1. **Create `src/lib/api-chain.ts`**
   - `withApiChain(handler, options)` with typed `ApiChainOptions<TBody>` (`route`, `auth`, `requiredRole`, `requiredPermission`, `csrf`, `rateLimit`, `bodySchema`, `maxBodyBytes`).
2. **Modify 5 pilot routes** (mechanical adoption of `withApiChain`):
   - `src/app/api/auth/login/route.ts`
   - `src/app/api/auth/change-password/route.ts`
   - `src/app/api/admin/announcements/route.ts`
   - `src/app/api/sysadmin/backup-maintenance-center/route.ts`
   - `src/app/api/bot/chat/route.ts`
3. **Create `tests/unit/api-chain-u7.test.ts`**
   - Full matrix covering auth, RBAC, CSRF, rate limiting (auth vs anon bucket + Redis failure), Zod validation (400/413), U3 error codes (400/401/403/404/409/413/429/500/503), U6 single `http.request` log + header stripping, and special routes (cron, webhook, upload, SSE).
4. **Update `docs/SEQ-IMPLEMENTATION-FRAMEWORK.md` §7** ledger.

---

## 10. Performance & Security Invariants

- **Performance:** Zero duplicate JSON parsing (`validateBody` reads stream once), zero duplicate auth/Redis/DB calls, zero duplicate `http.request` logs, zero response buffering on SSE/streaming.
- **Security Invariants (all 12 preserved):**
  1. Client cannot choose authenticated identity (`withAuthorization` overwrites `x-user-id` from verified JWT).
  2. Client cannot spoof role (`x-user-role` overwritten + HMAC-signed).
  3. Client cannot bypass RBAC (`requiredRole` / `requiredPermission` enforced before handler).
  4. CSRF enforced on all non-exempt mutations.
  5. Rate limits cannot be bypassed by header rotation (`extractClientIp` + verified `x-user-id`).
  6. Redis failure follows U4 fail-open/fail-closed policy.
  7. Validation never echoes submitted secrets (`validateBody` field paths only).
  8. U3 errors never leak DB/internal details.
  9. U6 logs never contain credentials/tokens/body contents.
  10. Internal headers (`x-auth-user-id`, `x-auth-role`, `x-error-code`, `x-u6-logged`) stripped before client response.
  11. Exactly one `http.request` log emitted per request.
  12. Cron, webhook, upload, and SSE endpoints retain their required behavior.

---

## 11. Deployment, Rollback & Unresolved Architectural Decisions

- **Deployment:** Requires `monitoring-web:latest` Docker rebuild + `web` recreate when authorized. No DB migration, no new env vars, no Loki/Alloy/Caddy changes.
- **Rollback:** Re-tag pre-deploy `monitoring-web` image and recreate `web`.
- **Unresolved Architectural Decisions:**
  1. **None blocking U7 Phase 1** — `withApiChain` uses zero new dependencies, zero schema changes, and zero auth/RBAC/CSRF redesigns.
  2. **Confirm pilot scope:** Approve migrating the 5 U5 routes in U7 Phase 1 (leaving the remaining 793 routes on existing compatible wrappers for incremental Phase 2).
