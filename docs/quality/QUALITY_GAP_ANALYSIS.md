# QUALITY_GAP_ANALYSIS — Gate Monitor

Evidence-based, read-only. Baseline: `docs/quality/BASELINE.md` (main @ 14948f8, typecheck 0 errors),
`docs/quality/STATIC_ANALYSIS.md`, `ARCHITECTURE_MAP.md`, `SERVICE_INVENTORY.md`.

## 1. Test framework landscape

| Framework | Where | Status |
|---|---|---|
| **Playwright** (`@playwright/test` ^1.62.1) | `playwright.config.ts`, `tests/*.spec.ts` | Only *declared* test runner. `webServer: npm run dev` (dev server, not prod build); chromium-only; retries in CI. **6 spec files, 18 `test()` cases total** (3 each in app/face-verification/pass-approval/scan-workflow/session-invalidation; 4 in login-success) |
| **No jest/vitest/node:test** | `package.json` devDependencies | No unit-test runner installed at all. |
| Ad-hoc "system tests" (not a framework) | `scripts/run_system_tests.ts` (93 `assert`s), `scripts/test_additional_remediations.js` (38), `scripts/test-registers-and-flows.ts` (30), `scripts/test-permission-engine.ts` (11), `scripts/test-document-signature.ts` (5), `scripts/test-scheduling-apply.ts` (5) | Plain `console.assert`-style scripts run by `npm run test:unit` (`tsx`); no reporter, no CI gate evidence, several exit 0 even on failure-prone paths (e.g. `verify-layering.js` has 0 asserts — only exit-code check). |

`npm test` = `test:unit` (the 5 ad-hoc scripts) + `test:e2e` (Playwright).
**None of it runs against a production-shaped deployment** — Playwright boots `next dev`;
E2E tests hit `localhost:3000`, and 5 of 6 spec files skip real-auth paths unless
`SMOKE_USER`/`SMOKE_PASS` are set (login-success.spec.ts L8-9).

## 2. What the 18 Playwright tests actually cover

- `tests/app.spec.ts` — /login renders, `GET /api/users` 401/403, `POST /api/gate/scan` w/ empty body → 4xx
- `tests/face-verification.spec.ts` — 3 negative cases on `/api/gate/verify-face` (empty descriptor, spoof flag, etc.), **sending `x-user-role: operator` headers as raw spoofing** (works only because tests target the real middleware… or pass trivially if the route rejects first — unverified which)
- `tests/login-success.spec.ts` — happy path password→JWT→logout, **skipped without SMOKE creds**
- `tests/scan-workflow.spec.ts`, `pass-approval.spec.ts`, `session-invalidation.spec.ts` — 3 cases each (API-shape smoke)

**Not covered by any test:** the 188 other API routes, all `src/server/policy/*` logic,
permission-workflow stage engine, `PostgresQueryBuilder` (incl. the just-merged JSONB
serialization fix #298), mobile token flow, kiosk session minting, RAG chat, worker cron jobs,
notification dispatch queue, backup/verify, retention runs, MFA/TOTP flows, SSO OIDC callback,
SSE endpoints, Caddy/tunnel behavior.

## 3. Untested critical paths (by risk)

| Area | Evidence | Untested? |
|---|---|---|
| Permission workflow stage gating (exam/memo chains, oie tier-75 fix #299, branch checks #296/#298) | `src/app/api/permissions/[ticket]/*`, `src/lib/permission-workflow.ts` — **in-handler** checks, no `requiredRole` | Yes. Only `test-permission-engine.ts` (11 asserts, no framework, not in CI) |
| `PostgresQueryBuilder` (JSONB serialization, embedded relations, FK_MAP fallback) | `src/lib/postgres.ts` L471-740 — FK_MAP covers only 5 tables; `not()` builds **raw interpolated SQL** for `NOT IN` (L366-367: values quoted by string-replace only) | Yes — highest blast radius, zero tests |
| Gate scan pipeline | `api/gate/scan` + `recordScan` (`src/server/services/scan/record.ts`) + RLS GUC context | Yes (1 API-shape test only) |
| Mobile auth (token + device binding) | `src/lib/mobile-auth.ts`, `api/mobile/*` | Yes |
| Kiosk session minting (unauthenticated!) | `api/operator/kiosk-session` | Yes |
| Worker cron jobs + notification dispatch | `worker/jobs/*` | Yes (not even in `npm test`) |
| MFA/TOTP bootstrap+verify+disable | `api/auth/2fa/*`, `api/auth/mfa/bootstrap` (public!) | Yes |
| SSO OIDC callback (state/PKCE) | `api/auth/sso` + `src/lib/sso.ts` | Yes |
| Backup/verify/retention (destructive ops) | `api/admin/backup*`, `retention/run` | Yes |
| RAG bot (prompt-injection surface, external LLM egress) | `api/bot/chat` + `src/lib/rag/*` | Yes |

## 4. Untested API route groups (206 routes; 18 touched by tests ≈ 9%)

Fully untested: `admin/*` (50), `integrations/*` (9), `mess/*` (13), `users/bulk*` (4),
`config/*` (8), `cron/*` (4 — incl. CRON_SECRET check), `onboarding/*` (3), `notifications/*` (3,
incl. SSE), `occupancy/*` (4, incl. SSE), `analytics/*` (13), `principal/*` (2),
`staff/*` (3), `voice`, `roles-graph`, `dev/contact` (PII → Telegram), `deployment/logs`.
Partially/shape-tested: `auth/*` (login), `gate/scan` + `verify-face`, `permissions/*` (list).

## 5. Risk register (top 15)

Severity: P0 = exploit/blocker today, P1 = serious, P2 = moderate, P3 = low/hardening.

| # | Risk | Sev | Evidence |
|---|---|---|---|
| 1 | **Double-role lists & tier duplication allow self-privilege in approver stages**: `TIER.APPROVER`/`routes.ts ALL_ROLES` contain `principal` **twice**; the just-merged oie tier-75 fix (#299) shows tier/role drift is a live failure mode; any approver-role change must hit 3 places (`roles.ts`, `routes.ts`, in-handler role arrays in `permissions/*`) | P0 | `src/server/policy/roles.ts` L6-8, `routes.ts` L8/L18, git log `14948f8` |
| 2 | **`PostgresQueryBuilder.not('in')` builds SQL by string-quoting values** (`v.replace(/'/g,"''")` only; no parameter, no type check) — SQL-injection surface via any caller passing `not('in', …)` with user input | P0 | `src/lib/postgres.ts` L365-367 |
| 3 | **Unauthenticated kiosk-session endpoint** mints operator JWTs (rate-limited 20/15min, but 404-only when no default operator; audit is best-effort) | P0 | `api/operator/kiosk-session` (no auth marker), `src/lib/kiosk-operator.ts` |
| 4 | **`permissions/*` self-grade routes**: GET/PATCH/POST/verify/sign/upload/document all use `withAuthorization` **without `requiredRole`** → any authenticated user can read/approve at the API level; only in-handler stage checks (recently fixed twice, #296/#298/#299) stand between an arbitrary student token and approving their own ticket | P0 | `api/permissions/route.ts` L145-153, `[ticket]/*` (no role arg) |
| 5 | **Unauthenticated `auth/mfa/bootstrap`** (issues MFA enroll code with just rate limit + CSRF) and **`auth/2fa/disable`** reachable pre-auth via `withAuthorizationPreMfa` — TOTP disable path for privileged roles is the weak link | P1 | `api/auth/mfa/bootstrap`, `api/auth/2fa/disable`, `withAuthorizationPreMfa` (authorization.ts L235) |
| 6 | **Two divergent env files** (`/opt/monitoring/env/production.env` for systemd vs `/opt/monitoring/compose/.env` for compose `env_file`; plus repo `.env`) — a secret rotation in one is not the other; compose `env_file: required: false` silently masks missing files | P1 | `SERVICE_INVENTORY.md` §6, diff evidence |
| 7 | **Live compose drift from repo** (web/worker env-wiring differs: parts vs `DATABASE_URL`; `server.js` only in /opt) — repo rebuilds can behave differently than the running release with no test catching it | P1 | `diff` §6, `SERVICE_INVENTORY.md` |
| 8 | **No unit-test framework + tests that can't gate deploys**: `npm test` mixes 5 ad-hoc scripts (2 of which have zero assertions: `verify-layering.js`, `verify-permission-workflow.ts` → rely on exit codes) and Playwright on a **dev server**; `test:e2e:smoke` needs SMOKE creds that aren't wired to CI | P1 | `package.json` scripts, `playwright.config.ts` L21-28 |
| 9 | **`cej-bot` runs as root** with a *command allowlist* that still includes `restart`, `log`, `tail`, `ps` against the ops dir, launched from a Telegram chat (single authorized chat id only); a compromised `TELEGRAM_CHAT_ID`/token ≈ root shell on the box | P1 | `/etc/systemd/system/cej-bot.service` (`User=root`, `CapabilityBoundingSet=` empty), `bot_daemon.py` L15 |
| 10 | **cadvisor `privileged: true`** in monitoring stack (container escape primitive if monitoring net is bridged into app net — `postgres_exporter` already joins `monitoring_gate-net`) | P1 | `/opt/server-monitoring/docker-compose.yml` cadvisor block; `SERVICE_INVENTORY.md` §2 |
| 11 | **FK_MAP / join-condition hardcoding in `PostgresQueryBuilder`**: unknown parent/target pairs fall back to `target.id = parent.target_s_id` (string-suffix heuristic) — silent wrong-JOINs for new tables; FK metadata cache never invalidated | P1 | `src/lib/postgres.ts` L471-488, L563-569 |
| 12 | **Worker and web share one DB/Redis with no queue or locks between them**: `dispatch_notifications` polls `notification_*_queue` while web inserts; both also run `audit_log` writes — lost-update window on `attempts` counters; worker has no leader election, so two worker containers would double-dispatch | P2 | `worker/jobs/dispatch_notifications.js`, `docker-compose.yml` (no locks) |
| 13 | **`users/route.ts` PATCH (admin-tier, rate-limited)** has role-scoped field rules in-handler; `users/bulk/commit` + `bulk-graduate` are destructive with only admin/sysadmin role check — no per-row authorization (e.g. graduate-by-ids bulk) | P2 | `api/users/bulk/commit`, `api/users/bulk-graduate` |
| 14 | **RAG chat streams external LLM output into DB and returns to clients** (bot_conversations/bot_messages tables; `UPDATE users SET bot_lang` per message); prompt-injection / PII-leak surface; egress to external OpenAI-compatible endpoint from inside the container | P2 | `api/bot/chat` L25-50, `src/lib/rag/*` |
| 15 | **Caddy→web is plain HTTP loopback-only** (by design, CF edge TLS) — so any service that joins `gate-net` can read all app traffic unencrypted (incl. JWTs in headers); the monitoring `postgres_exporter` already rides this shared bridge | P2 | `Caddyfile` comment L9-11, `SERVICE_INVENTORY.md` §3, `app-net: monitoring_gate-net` |

Honorable mentions (P3): `allergens`-style stale `.bak` files committed (auto-check.sh.bak,
docker-compose.yml.bak, types.ts.bak, db.ts.orig) — drift risk; `maxDuration=45` on SSE
`gate/stream` will disconnect long-lived dashboards on any serverless-like runtime (fine in
self-hosted standalone, but the config is vestigial); `dev/contact` POSTs PII to a Telegram
chat of the developer (rate-limited, audited — acceptable, document it).

## 6. Recommended minimal test targets (in priority order)

1. Unit tests for `PostgresQueryBuilder` (JSONB serialization, `not('in')` parameterization —
   **move that path to `$n` placeholders now, it's a P0**) against real Postgres (the repo
   already has `database/` + supabase migrations to seed).
2. Stage-gating matrix tests: every workflow_type × every approver role × branch rule
   (guards against the #296/#298/#299 regression class).
3. Role-tier snapshot test (extend `scripts/check-role-routing.ts` into CI + assert
   `ALL_ROLES` has no duplicates).
4. Kiosk-session, mobile-login, and `permissions/[ticket]/*` unauth/low-privilege negative tests
   (what a student token *must not* do).
5. CRON_SECRET negative tests for `api/cron/*`.
6. Worker job idempotency test (double-run of `dispatch_notifications`).
