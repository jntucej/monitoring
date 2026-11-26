# Gate Monitor — Sequential Implementation Framework v1.1

**Owner:** cejtest (production host, Tailscale 100.122.7.62)
**Repository:** /opt/monitoring/compose (git@github.com:jntucej/monitoring.git, branch main)
**Last updated:** 2026-11-25 (post-push 02237741)
**Status:** AUDIT COMPLETE · ROADMAP DRAFT · AWAITING UNIT-BY-UNIT APPROVAL

---

## 1. Confirmed Decisions (from 2026-11-25 clarification)

| Decision | Value |
|---|---|
| Scope | All middleware-related systems, including security and infrastructure |
| Approach | Audit → propose each implementation unit → **wait for user approval per unit** |
| On failure | Automatically diagnose and fix, then retest |
| Autonomy | Autonomous within approved scope; **architectural changes require approval** |
| Environment | Repository + production server + Docker |

---

## 2. Live Architecture (verified 2026-11-25, matches previous model)

### Containers (gate compose)

| Service | Image / source | Port | Notes |
|---|---|---|---|
| `gate_web` | monitoring-web:latest | 127.0.0.1:3000 | Next.js 15 (App Router, `middleware.ts` runs at edge) |
| `gate_worker` | monitoring-worker:latest | 3002 (internal) | Node worker + ops-agent (`worker/ops-agent.mjs`) |
| `gate_postgres` | postgres:17 | 5432 | db `gate_monitor`, users `gate_app` (least-privilege) / `postgres` |
| `gate_redis` | redis:7 | 6379 | rate limits, session cache |
| `gate_caddy` | caddy | 80/443 | TLS termination → web |
| `gate_llm_proxy` | — | — | LLM API proxy |
| `cloudflare-ddns` | — | — | public omniroute.ucej.in |
| monitoring plane | prometheus, grafana, loki, node-exporter, postgres-exporter, alloy | :3001+ | Tailscale-only access |

### Middleware layers (src/)

1. **Edge middleware** — `src/middleware.ts` (Next middleware): locale, auth session, role gates, rate-limit stub
2. **CSRF** — `src/lib/csrf.ts` + `assertCsrf(req)` (all CSRF gates fixed 2026-11-19)
3. **RBAC** — `src/lib/roles/*.ts` (role config-driven: `sysadmin`, etc.), `withAuthorization(handler, {requiredRole})` handler-first
4. **API conventions** — `query<T>(text, params[])` via node-postgres pool; errors as `{error: code, message}`; audit logging
5. **Security infra** — secrets in `.env` (mode 600, gitignored), ops-agent secret isolation (`OPS_AGENT_SECRET`, `RESTIC_PASSWORD`), no Docker socket, no arbitrary shell/SQL exposed
6. **System admin plane** — three-plane architecture: read-only monitor / restricted ops-agent / server-side API with allowlist + audit

### Backup & recovery (host, new this round)

- restic 0.18 @ `/mnt/external-logs/gate-monitor/restic` (WD My Passport, UUID `C45E78E45E78D122`)
- host scripts: `usb-discover.sh`, `gate-mount-helper.sh`, `monthly-disk-freeup.sh` + cron `/etc/cron.d/disk-freeup`
- worker job `backup_maintenance.js` (30-min cycle; DB dump → verify → host bind mount → record)
- Recovery Center API/UI (`/api/sysadmin/recovery`)

---

## 3. Gap Analysis (what exists vs what's missing)

| Area | State | Evidence |
|---|---|---|
| Edge middleware (locale/auth/role) | ✅ works | middleware.ts + 2026-11-19 fixes |
| CSRF enforcement | ✅ works, 3 routes fixed 2026-11-19 | `assertCsrf` on all mutations |
| RBAC config-driven roles | ✅ works | `withAuthorization` handler-first, 388 role-pair audit |
| node-postgres `query<T>` convention | ✅ works | all API routes |
| API error shape | ⚠️ partial | no global error-boundary normalization; some routes ad-hoc |
| API rate limiting | ❌ missing | redis exists; no per-route limit layer (only stub in middleware) |
| Request logging/audit | ⚠️ partial | audit log table + ops-agent audit; no structured JSON request log |
| Request validation (bodies) | ⚠️ partial | ad-hoc per route; no shared zod/superstruct layer |
| Input sanitization | ⚠️ partial | pg parameterized queries (SQLi-safe); no generic XSS/payload-size guards |
| Health checks | ✅ works | per-container healthchecks, caddy probes |
| Migrations 37–39 | ⚠️ not applied to live DB | need `docker compose run --rm migrate` |
| backup_policies seed | ❌ missing | worker job fires only on enabled policies; no seed row |
| S3 offsite | ❌ not implemented | column exists, no upload path, no AWS creds on host |
| Telegram forecaster transport | ❌ broken (pre-existing) | `python3: command not found` in telegram-notify.sh |
| Global API middleware chain (validate→auth→CSRF→rate-limit→audit) | ❌ missing | pieces exist separately; no unified chain |

---

## 4. Dependency Map (what depends on what)

```
.migrations (37-39) ──► DB schema (backup/maintenance/storage tables)
        │
        ├─► /api/sysadmin/backup-maintenance-center
        ├─► /api/sysadmin/usb-discovery
        ├─► /api/sysadmin/recovery
        └─► worker/jobs/backup_maintenance.js  (needs backup_policies row)

ops-agent (worker:3002) ──► /api/sysadmin/usb-discovery (host_diagnostics)
                            ─► allowlist = 7 ops (verify/list/usb-disk ops)

RESTIC_PASSWORD + WD drive ──► backup-runner.mjs + recovery API

withAuthorization + roles ──► all /api/sysadmin/* routes (sysadmin gate)

rate-limit layer (MISSING) ──► should sit between CSRF and handler, redis-backed

unified middleware chain (MISSING) ──► depends on: validation layer, rate-limit layer, audit layer
```

---

## 5. Implementation Units (small, independently verifiable)

Proposed order = dependency order. **Each unit: implement → verify → stop → await approval.**

| # | Unit | Scope (in) | Out of scope | Acceptance criteria |
|---|---|---|---|---|
| U1 | Apply migrations 37–39 to live DB + rollback test | `docker compose run --rm migrate`, verify tables, test down-migrations on scratch DB | schema redesign | `storage_devices`, `backup_policies`, `recovery_points` exist; down-migration restores prior state; existing 303 migrations untouched |
| U2 | Seed `backup_policies` (daily-postgres) + first real cycle | seed row + force one cycle run of `backup_maintenance.js` | worker rewrite | `backup_executions` shows `completed` with artifact on host + `recovery_points` row |
| U3 | Shared API error-normalization middleware | one file + route wrapper; `{error, message, details?}` everywhere | per-route rewrites | all 404/400/500 responses conform; existing clients unaffected |
| U4 | Redis-backed rate-limit middleware | redis INCR window + 429 shape; per-route config map | auth changes | 429 after threshold; per-route overrides; no redis → fail-open + log |
| U5 | Shared body-validation layer (zod schemas per route) | one schema file + helper; apply to highest-risk routes first | every route at once | validation errors = 400 with field list; valid payloads pass |
| U6 | Structured request logging (JSON, audit-integrated) | logger middleware + log rotation via loki | Grafana dashboards | every API call logged with route/role/duration; PII redacted |
| U7 | Unified middleware chain (validate→auth→CSRF→rate-limit→audit) | compose the existing pieces in one explicit chain | redesign auth | single entry point documented; chain order tested |
| U8 | Security hardening: payload size limit + request-id + correlation | headers, 413 on oversize, x-request-id | WAF | 413 enforced; request-id end-to-end (log + audit + response header) |
| U9 | Fix Telegram forecaster transport (pre-existing) | install python3 or rewrite notify script in node | alert redesign | forecaster alerts deliver; no crash loop in worker |
| U10 | S3 offsite backup path (blocked: no AWS creds) | implement upload code + config; leave disabled | infra provisioning | unit-tested upload path; disabled by default; doc for creds setup |

**Sequencing rule:** U1→U2 (data plane ready), then U3→U5 (error/limit/validation foundations), U6→U7→U8 (observability + chain), U9/U10 (independent, any time after U1).

---

## 6. Execution Rules (the framework contract)

1. **One unit at a time.** No unit starts without explicit user approval of that unit.
2. **Verification gate per unit:** unit tests + integration probe + "existing functionality still works" smoke (health checks, 2-3 API spot checks, tsc/vitest/unslop-ui/build where applicable).
3. **Failure handling:** diagnose → fix → retest, same unit; never skip ahead with a red gate.
4. **Change protection:** no rewrites of working auth/RBAC/CSRF; additive changes only; DB migrations forward + down pairs, idempotent.
5. **Progress ledger:** append results to `docs/IMPL-LEDGER.md` after every unit (status, commit, verification output summary, next unit).
6. **Deployment discipline:** pre-deploy `pg_dump -Fc` to `/opt/monitoring/backups/daily/pre-<commit>.dump` + tag current image `pre-<commit>`; deploy only when user authorizes; rollback = re-tag pre image + recreate.
7. **Architectural changes (new service, new port, new secret, schema migration beyond additive) → pause + ask.**
8. **Reporting vocabulary:** `implemented` (code written) / `tested` (gates green) / `deployed` (live) / `pending` (approved but not started) / `blocked` (external dependency).

---

## 7. Progress Ledger

| Unit | Status | Commit | Notes |
|---|---|---|---|
| U1 — Migrations 37–39 | **deployed** | c13679b7 | 2026-11-25. Scratch rollback test passed. Production: 306 migrations, 14 new tables, WD seed updated. Pre-deploy backup: pre-u1-migrate.dump. |
| U2 — Seed backup_policies + first cycle | **deployed** | (pending commit) | 2026-11-25. Seeded `daily-postgres` policy (0 3 * * *, 30d retention). One manual cycle: pg_dump -Fc → /opt/monitoring/backups/daily/gate-db-u2.sql.gz (1.2 MB, sha256 ad68571b…). Records: 1 execution (completed), 1 artifact (verified), 1 recovery_point (latest_good=true). pg_restore --list OK, 2969 TOC entries. |
| U3 — API error normalization | **implemented + tested** (not deployed) | 109de392 (pushed) | 2026-11-25. New: src/lib/api-error-handler.ts (ApiError, normalizeApiError, handleApiError, withApiErrorHandler; pg SQLSTATE → 404/409/400 mapping; 500 bodies never carry raw message/SQL/secrets — server-side console.error only). Fixed: withAuthorization 500 fallback no longer leaks err.message; 8 route leak sites (telegram-sync ×2, telegram-verify, sla-breach, expire-passes, attention/queue, presence-matrix, bot/session/current, mess-event-tokens) → canonical INTERNAL_ERROR + server log. 16 new unit tests (tests/unit/api-error-handler.test.ts). Frontend impact: none — canonical shape {success,error:{code,message}} already what 8+ consumers read; 26 legacy bare-{error:string} routes left untouched in U3 scope. tsc 0, vitest 430/430, unslop-ui 100/100, build clean. |
| U4 — Redis rate-limit hardening | **implemented + tested** (not deployed) | 889bd900 + NOSCRIPT follow-up | 2026-11-25. Gaps A–F: (A) RATELIMIT_PRIMARY_STORE switch (default postgres = zero deploy change); (B) atomic Lua INCR+PEXPIRE via EVALSHA (fixes 2-RTT crash-window key leak); (C) src/lib/rate-limit-policies.ts central map: auth 10/min, otp 5/min, default 120, dashboard 180, admin-mutation 20, expensive 5 — per-route override wins; (D) 429/503 bodies on U3 canonical contract (deep-equal tested); (E) fail-closed categories: legacy prefixes + auth/otp/admin-mutation policy prefixes + RATELIMIT_FAIL_CLOSED_CATEGORIES env; (F) 22-test suite tests/unit/rate-limit-u4.test.ts (thresholds, concurrency 50-way, multi-user isolation, IP bucketing, spoof resistance, store outage/recovery, U3 shape). 3 routes (auth/login, passkeys/authenticate/verify, reset-password) migrated to named policy refs (mechanical; keyPrefixes preserved = no behavior change). Decisions: Postgres fallback retained; limits provisional (tune in U4b). tsc 0, vitest 452/452, unslop-ui 100/100, build clean. |
| U4 NOSCRIPT recovery | **implemented + verified live** | 2fdab065 | EVALSHA→NOSCRIPT→SCRIPT LOAD→retry, latch reset on client "ready". Verified against live gate_redis: SCRIPT FLUSH → EVALSHA=NOSCRIPT → SCRIPT LOAD=sha1 match → retry=count 2/ttl 49748 → SCRIPT EXISTS=1. Integration test file added (skips without REDIS_TEST_URL). |
| U5 — body-validation layer | **implemented + tested** (not deployed) | 0c974fe3 (pushed) | Shared Zod layer: `src/lib/validate-body.ts` (validateBody owns a single streamed read — 413 PAYLOAD_TOO_LARGE / 400 BAD_REQUEST malformed / 400 VALIDATION_ERROR with safe `details.fields[]`), 5 schemas in `src/lib/schemas/` (auth, admin, sysadmin, bot), 5 high-risk routes migrated (login, change-password, announcements, backup-maintenance-center, bot/chat). zod@^4.6.7 added (approved architectural decision). 21 U5 tests (utility + 5 route-level). tsc 0 · vitest 475 pass / 2 skipped · unslop-ui 100/100 · build clean. |
| U6 — structured JSON request logging | **implemented + tested** (not deployed) | f922044b (pushed) | 2026-11-26. Hardened `src/lib/log.ts` (`logRequest`, `sanitizeRequestId`, `sanitizeLogString`, expanded `SENSITIVE_KEYS`). Instrumented `src/middleware/metrics.ts` (624 `withAuthorization` routes) + `src/lib/rate-limit.ts` (`withRateLimit` public/unwrapped routes) with deduplication (`x-u6-auth` / `x-u6-logged`) so exactly one `http.request` JSON line is emitted per request. Stripped internal `x-auth-user-id`, `x-auth-role`, `x-error-code`, `x-u6-logged` headers before client response. Converted 500-class `console.error` in `api-error-handler.ts` and `authorization.ts` to structured JSON. Health/metrics excluded by default (`LOG_HEALTH_CHECKS=1` opt-in). 15 U6 tests (`tests/unit/request-logging-u6.test.ts`). tsc 0 · vitest 478 pass / 2 skipped · build clean. |
| U7 — unified middleware/security chain (Phase 1) | **implemented + tested** (not deployed) | b73beb0b (pushed) | 2026-11-26. Created `src/lib/api-chain.ts` (`withApiChain`) composing U3/U4/U5/U6, `withAuthorization`, and `assertCsrf` in canonical order: authenticated routes run `withAuthorization` BEFORE `withRateLimit` (user-scoped buckets via verified `x-user-id`, fixing the 45-route IP-bucket bug class); public/login routes run IP/key-scoped `withRateLimit`. Migrated 5 pilot routes (`auth/login`, `auth/change-password`, `admin/announcements`, `sysadmin/backup-maintenance-center`, `bot/chat`). Added `tests/unit/api-chain-u7.test.ts` (6 tests incl. same-IP multi-user bucket isolation). tsc 0 · vitest 484 pass / 2 skipped · build clean. |
| U7 — unified middleware/security chain (Phase 2) | **implemented + tested** (not deployed) | 8468da7f (pushed) | 2026-11-26. Migrated all 45 remaining `withRateLimit(withAuthorization(...))` sites across 44 unique route files to `withApiChain` in 3 batches: Batch A (27 `GET` sites), Batch B (17 `POST`/`PATCH` sites with `csrf: true`), Batch C (1 multipart `UPLOAD` site `permissions/[ticket]/upload` without `bodySchema`). Added `tests/unit/api-chain-u7-phase2.test.ts` (3 tests: 0 remaining inverted sites, 401 before rate-limit bucket, multipart preserved). tsc 0 · vitest 487 pass / 2 skipped · build clean. |
| U7 — unified middleware/security chain (Phase 3) | **audit complete** (awaiting approval) | (pending commit) | 2026-11-26. AST scan of all 798 `route.ts` files (996 exported HTTP method sites, 0 aliased/unrecognized) reconciled 100% of files and sites: 234 multiline `withRateLimit(withAuthorization(...))` sites across 229 unique files (Batch 3A: 18 `POST`/`PATCH`, Batch 3B: 79 `admin`/`sysadmin` `GET` incl. 1 SSE, Batch 3C: 137 domain `GET`). See `docs/u7-phase3-audit.md`. |
