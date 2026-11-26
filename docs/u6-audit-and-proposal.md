# U6 — Structured JSON Request Logging: Stage 1 Audit & Implementation Proposal

**Date:** 2026-11-26  
**Repository:** `/opt/monitoring/compose` (`git@github.com:jntucej/monitoring.git`, branch `main`)  
**Status:** Audit & Proposal Only (no U6 implementation code written, no deployment)

---

## 1. Current-State Evidence

| Item | Verified State |
|---|---|
| Git branch & HEAD | `main` at `0c974fe3` (`feat: U5 — shared Zod request-body validation (5 high-risk routes)`) |
| U5 status | **implemented + tested + committed + pushed** (`0c974fe3`), **not deployed** |
| Working tree | Dirty from prior unrelated UI edits (`M src/components/retention/UnifiedCampusCalendar.tsx`, `M src/components/student/StudentAttendancePage.tsx`); untouched by U6 audit |
| Implementation ledger | `docs/SEQ-IMPLEMENTATION-FRAMEWORK.md` §7 (latest entries: U1 deployed `c13679b7`, U2 deployed, U3 implemented+tested `109de392`, U4 implemented+tested `889bd900` + `2fdab065`, U5 implemented+tested `0c974fe3`) |
| Live `gate_web` container | Created `2026-11-25T15:59:17Z` (`21:29 IST`), image `monitoring-web:latest` (`sha256:0b4d9642...`) — **predates U3, U4, and U5** |
| Test & typecheck baseline | `npm run typecheck` (`tsc --noEmit`): 0 errors; `npm run test:vitest`: 51 files passed, 1 skipped (463 passed, 2 skipped) |

---

## 2. Existing Request Logging Inventory

Across `798` API route files in `src/app/api/**/route.ts`:

1. **Edge Middleware (`src/middleware.ts`)**
   - Generates `requestId = req.headers.get('x-request-id') || crypto.randomUUID()`.
   - Forwards `x-request-id` in request headers and echoes `x-request-id` on response headers.
   - Emits **no** request logs.
   - On CSRF failure (`validateCsrf(req)`), returns `403` JSON directly without logging.

2. **Authorization & Metrics Wrapper (`src/middleware/authorization.ts` + `src/middleware/metrics.ts`)**
   - `withAuthorization` wraps `624` of `798` API routes and delegates execution to `metricsMiddleware(req, handler)`.
   - `metricsMiddleware` already computes `duration`, `statusCode`, `requestId`, `userId` (from `x-auth-user-id`), `role` (from `x-auth-role`), `csrfResult`, `rateLimitHit`, and `route` (from `x-route-pattern` or `pathname`), and echoes `x-request-id` on the response.
   - **Gap:** `metricsMiddleware` writes asynchronously to Postgres (`public.api_metrics`) and **never emits a structured JSON log to stdout/stderr**.
   - **Gap:** `withAuthorization` sets `x-user-id` / `x-user-role` on the *proxied request* headers, not `x-auth-user-id` / `x-auth-role` on the *response* headers, so `metricsMiddleware` often sees `null` for `userId`/`role` unless the route sets them.
   - **Gap:** `handleAuthError` in `src/middleware/authorization.ts` logs 500-class auth errors via free-form `console.error('[auth-middleware] unhandled auth-layer error: ...')`.

3. **Existing Structured Logger (`src/lib/log.ts`)**
   - Already exists with `log.debug/info/warn/error` writing single-line JSON (`{ ts, level, msg, ... }`) to `stdout`/`stderr` and `redactSensitive()`.
   - **Gap:** Only imported by **3 files** (`src/app/api/auth/login/route.ts`, `src/app/api/auth/change-password/route.ts`, `src/app/api/system/config/route.ts`); `log.wrap` is used in only **2 routes**.
   - **Gap:** `log.wrap` emits **two** log lines per request (`req.start` + `req.end`), doubling log volume.
   - **Gap:** `SENSITIVE_KEYS` is incomplete (missing `otp`, `access_token`, `refresh_token`, `csrf`, `x-csrf-token`, `api_key`, `apikey`, `private_key`, `database_url`, `dsn`, `session_id`, `passkey`, `credential`).
   - **Gap:** No control-character/newline sanitization (log injection risk) and no field-length bounds.
   - **Gap:** `getRequestId(req)` falls back to predictable `gen-${Date.now().toString(36)}` and accepts arbitrary unvalidated `x-request-id` strings.

4. **Error Normalization (`src/lib/api-error-handler.ts`)**
   - `handleApiError` logs 500-class errors via free-form `console.error('[api-error] ...')` including `err.stack` in `logPayload`.
   - 4xx errors are not logged by `handleApiError`.

5. **Rate Limiting (`src/lib/rate-limit.ts`) & Worker (`worker/index.mjs`, `worker/jobs/*.js`)**
   - `rate-limit.ts` emits free-form `console.warn` / `console.error` on store degradation/failure.
   - `worker/` emits free-form `[worker] ...` and `[dispatch] ...` text lines to stdout/stderr.

6. **Audit Logging (`audit_logs` table via `logAuditEvent` / `addAudit`)**
   - Domain-level security/admin actions are persisted to Postgres `audit_logs` (separate from HTTP request logging).

---

## 3. Production Logging Pipeline Assessment

Verified live pipeline:

```text
application stdout/stderr (gate_web, gate_worker, gate_caddy)
  → Docker container json-file log driver
  → mon_alloy (/opt/server-monitoring/alloy/config.alloy, discovery.docker via /var/run/docker.sock)
  → mon_loki (http://mon_loki:3100/loki/api/v1/push, TSDB v13, 14d retention)
  → mon_grafana (Tailscale :3001+)
```

- **Caddy (`compose/Caddyfile`):** Already emits structured JSON (`log { output stdout; format json }`).
- **Alloy (`config.alloy`):** Assigns only 3 low-cardinality labels: `job="docker"`, `container`, and `service` (`gate_web|gate_postgres|gate_worker|gate_caddy|gate_redis|cloudflare-ddns`). It forwards raw log lines to Loki without extra pipeline stages, meaning **single-line JSON emitted to stdout/stderr by `gate_web` is immediately queryable in Grafana/Loki via `| json`**.
- **Loki (`loki-config.yml`):** 14-day retention (`retention_period: 14d`), `ingestion_rate_mb: 10`, `ingestion_burst_size_mb: 20`.

---

## 4. Security Findings

1. **Log Injection (CRLF / Control Characters):** Unsanitized `route`, `user_agent`, or `error_code` strings containing `\n`, `\r`, or ANSI escape sequences can forge log entries or corrupt terminal/Loki parsers.
2. **Forged / Unbounded `X-Request-ID`:** `src/middleware.ts` and `src/middleware/metrics.ts` accept any `x-request-id` header verbatim without length or character-set validation. An attacker can send a 10 KB or newline-laden `X-Request-ID`.
3. **Incomplete Redaction:** `src/lib/log.ts` `SENSITIVE_KEYS` omits `otp`, `access_token`, `refresh_token`, `csrf`, `x-csrf-token`, `api_key`, `private_key`, `database_url`, `dsn`, `session_id`, `credential`.
4. **Stack-Trace & SQL Leakage:** `normalizeApiError` includes `err.stack` and `pg.detail` in `logPayload`; if logged raw without truncation/redaction, connection strings or query parameters could enter Loki.
5. **Duplicate Logging Risk:** Routes using `log.wrap` + `withAuthorization` (`metricsMiddleware`) + `handleApiError` could emit 2–3 logs for a single request if not unified at one emission point.
6. **Query-String & Body Leakage:** Logging `req.url` or `req.nextUrl.search` risks leaking tokens/OTPs/PII passed in query params; logging request bodies risks leaking passwords/PII.

---

## 5. Canonical Request-Event Contract

One single-line JSON event emitted **once per completed API request** to `stdout` (2xx/3xx/4xx) or `stderr` (5xx):

```json
{
  "ts": "2026-11-26T04:00:00.123Z",
  "level": "info",
  "event": "http.request",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "method": "POST",
  "route": "/api/auth/login",
  "status": 200,
  "duration_ms": 42,
  "source": "web",
  "user_id": "uuid-or-null",
  "role": "student",
  "error_code": "VALIDATION_ERROR"
}
```

### Field Classification

| Field | Classification | Notes |
|---|---|---|
| `ts` | **Required** | ISO-8601 UTC timestamp |
| `level` | **Required** | `"info"` (2xx/3xx), `"warn"` (4xx), `"error"` (5xx) |
| `event` | **Required** | Fixed `"http.request"` |
| `request_id` | **Required** | Validated UUID/safe token (`^[a-zA-Z0-9_-]{8,64}$`) |
| `method` | **Required** | Uppercase HTTP method (`GET`, `POST`, etc.) |
| `route` | **Required** | Normalized pathname (no query string, max 256 chars, control chars stripped) |
| `status` | **Required** | HTTP status code (integer) |
| `duration_ms` | **Required** | Non-negative integer milliseconds |
| `source` | **Required** | `"web"` (or `"worker"` for worker HTTP) |
| `user_id` | **Optional** | Authenticated user UUID when available; omitted/null on public routes |
| `role` | **Optional** | Authenticated role string when available |
| `error_code` | **Optional** | U3 `ApiErrorCode` (e.g. `VALIDATION_ERROR`, `RATE_LIMIT_EXCEEDED`, `INTERNAL_ERROR`) on 4xx/5xx |
| `response_size` | **Omitted** | Not reliably available on Next.js streaming/App Router `Response` without buffering |
| `ip` | **Forbidden in request log** | Excluded from stdout JSON logs to avoid PII proliferation in 14-day Loki store; security-critical IP forensics remain in `audit_logs` / `api_metrics` |
| `query`, `body`, `headers`, `cookies`, `tokens`, `passwords`, `otps`, `secrets`, `stack` | **Forbidden** | Never included in `http.request` events |

---

## 6. Correlation & Request-ID Assessment

- **Existing mechanism:** `src/middleware.ts` already generates `crypto.randomUUID()` when `x-request-id` is absent, forwards it on request headers, and sets `x-request-id` on the response. `src/middleware/metrics.ts` also reads `x-request-id` and echoes it on the response.
- **Gap:** Neither validates inbound `x-request-id` against spoofing/injection.
- **Proposal (bounded to U6):** Add `sanitizeRequestId(raw: string | null): string` in `src/lib/log.ts` — accept inbound `x-request-id` only if it matches `/^[a-zA-Z0-9_-]{8,64}$/`; otherwise mint `crypto.randomUUID()`. Reuse this in `getRequestId(req)` and `metricsMiddleware`. Full cross-service `web → worker` propagation remains in U8 as planned.

---

## 7. Loki / Grafana Compatibility

- **Labels:** Keep existing Alloy labels (`job="docker"`, `container="gate_web"`, `service="gate_web"`). **Do not** promote `user_id`, `request_id`, `route`, `ip`, or `error_code` to Loki stream labels (prevents high-cardinality index explosion).
- **Querying:** Grafana/Loki queries use LogQL JSON parser:
  `{service="gate_web"} | json | event="http.request" | status >= 500`
- **Volume:** Single-line JSON (~220 bytes/req) fits well within Loki's `10 MB/s` ingestion limit.

---

## 8. Performance & Exclusion Analysis

- **Async non-blocking:** `process.stdout.write` / `process.stderr.write` in Node.js is buffered/non-blocking for small single-line writes; `JSON.stringify` on a flat 10-field object takes `< 5 µs`.
- **Health checks (`/api/health`, `/api/metrics`, `/metrics`):** Excluded from `http.request` logging by default (matching `metricsMiddleware` bypass) to avoid 5-second/30-second probe noise; configurable via `LOG_HEALTH_CHECKS=1`.
- **SSE / Streaming endpoints:** Log at response-header return (when stream opens) with `duration_ms` to first byte, without buffering the stream body.
- **File uploads:** Body is never read or logged by the logger.

---

## 9. Exact Implementation Scope & Files

### Files to Create / Modify

1. **Modify `src/lib/log.ts`**
   - Expand `SENSITIVE_KEYS` (add `otp`, `access_token`, `refresh_token`, `csrf`, `x-csrf-token`, `api_key`, `apikey`, `private_key`, `database_url`, `dsn`, `session_id`, `passkey`, `credential`, `authorization`, `cookie`).
   - Add `sanitizeLogString(val: string, maxLen = 256): string` (strips `\r`, `\n`, `\t`, ASCII control chars `0x00–0x1F`, `0x7F`).
   - Add `sanitizeRequestId(raw: string | null): string` (validates `/^[a-zA-Z0-9_-]{8,64}$/`, else `crypto.randomUUID()`).
   - Add `logRequest(entry: RequestLogEntry): void` emitting the canonical `http.request` JSON line (`info` for `<400`, `warn` for `400–499`, `error` for `>=500`).
   - Update `getRequestId(req)` to use `sanitizeRequestId`.

2. **Modify `src/middleware/metrics.ts`**
   - Call `logRequest(...)` once in `finally`/completion path (both normal response and thrown error) using `sanitizeRequestId`, `route`, `method`, `status`, `duration_ms`, `user_id`, `role`, and `error_code` (read from `x-error-code` response header if present, or `"INTERNAL_ERROR"` on uncaught throw).
   - Respect `LOG_HEALTH_CHECKS` (default off for `/api/health`, `/api/metrics`).

3. **Modify `src/lib/api-error-handler.ts`**
   - In `handleApiError`, attach `x-error-code` header (internal/response) or log structured JSON via `log.error` for 500-class errors (with `sanitizeLogString` and no raw secrets) instead of free-form `console.error`.

4. **Modify `src/middleware/authorization.ts`**
   - Replace free-form `console.error('[auth-middleware] ...')` with `log.error(...)`.
   - Ensure `x-auth-user-id` / `x-auth-role` (or internal context) are available to `metricsMiddleware` without leaking internal headers to clients.

5. **Create `tests/unit/request-logging-u6.test.ts`**
   - Unit + integration tests covering all 15 scenarios below.

### Configuration (Env Vars & Safe Defaults)

- `LOG_LEVEL`: `"info"` (default) | `"debug"` | `"warn"` | `"error"`
- `LOG_HEALTH_CHECKS`: `"0"` (default, skip `/api/health` & `/api/metrics`) | `"1"`

---

## 10. Test Plan (`tests/unit/request-logging-u6.test.ts`)

1. Successful 200 request → single `http.request` JSON line with `level: "info"`, `status: 200`, `duration_ms >= 0`.
2. 400 validation/bad-request response → `level: "warn"`, `status: 400`, `error_code` captured.
3. 401 unauthorized response → `level: "warn"`, `status: 401`.
4. 403 forbidden/CSRF response → `level: "warn"`, `status: 403`.
5. 404 not-found response → `level: "warn"`, `status: 404`.
6. 429 rate-limit response → `level: "warn"`, `status: 429`, `error_code: "RATE_LIMIT_EXCEEDED"`.
7. 500 internal error response → `level: "error"`, `status: 500`, `error_code: "INTERNAL_ERROR"`, no stack/SQL in `http.request` line.
8. Request duration accuracy (`duration_ms` reflects handler execution time).
9. Request ID propagation (valid inbound `X-Request-ID` preserved; invalid/missing replaced with UUID; echoed on response).
10. Sensitive-header & key redaction (`authorization`, `cookie`, `x-csrf-token`, `password`, `otp`, `access_token`, `refresh_token`, `secret` → `[REDACTED]`).
11. Query-string & request-body exclusion (`route` strips `?token=...`; body fields never appear in `http.request`).
12. Log injection prevention (`\r`, `\n`, control chars stripped from `route`, `error_code`, and `request_id`).
13. Duplicate-log prevention (one `http.request` line per request through `withAuthorization` + `metricsMiddleware`).
14. Health-check behavior (`/api/health` skipped by default; logged when `LOG_HEALTH_CHECKS=1`).
15. Streaming/SSE response behavior (logged once when response headers return without buffering stream).

---

## 11. Deployment & Rollback Proposal

- **Docker rebuild required:** Yes (`monitoring-web:latest` via `docker build -t monitoring-web:latest -f Dockerfile --target runner .` + `docker compose up -d --force-recreate web`) when authorized.
- **Environment changes:** None required (safe defaults for `LOG_LEVEL` and `LOG_HEALTH_CHECKS`).
- **Database migration:** None required.
- **Loki/Alloy config changes:** None required (`mon_alloy` already ships `gate_web` stdout/stderr to `mon_loki`).
- **Rollback:** Re-tag pre-deploy `monitoring-web` image and `docker compose up -d --force-recreate web`.

---

## 12. Risks, Trade-offs & Unresolved Architectural Decisions

1. **Coverage boundary (624 vs 798 routes):** `metricsMiddleware` covers the `624` routes wrapped by `withAuthorization`. The remaining `174` public/unwrapped routes (e.g. `/api/auth/login`, `/api/health`, webhooks) will not emit `http.request` via `metricsMiddleware` until U7 (Unified Middleware Chain) wraps all routes — unless we also wrap `withRateLimit` or `withApiErrorHandler` in U6. **Decision needed:** Keep U6 scoped to `metricsMiddleware` + `src/lib/log.ts` + `handleApiError` (and `auth/login` which already uses `log.wrap`), or also emit from `withRateLimit`?
2. **Response header cleanup:** `metricsMiddleware` currently reads `x-auth-user-id` / `x-auth-role` from response headers; if set, they must be stripped before returning to the client (or passed via an internal `WeakMap<Response, ...>` / async context) so internal metadata is not exposed externally.
3. **U7 / U8 boundary:** Full route-chain unification belongs to U7; cross-container `web → worker` trace propagation and 413 payload-size enforcement belong to U8.
