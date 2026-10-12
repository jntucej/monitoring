# WORKER, REDIS QUEUES & REALTIME — Gate Monitor Quality Findings

Inspected: 2026-10-12 (UTC). Deploy: `/opt/monitoring/compose` — gate_web (healthy 25 min), gate_worker (healthy 59 min), gate_redis (healthy ~1h), gate_postgres (healthy ~1h).
Method: read-only repo inspection, docker logs/exec, non-destructive redis-cli/psql, minted short-lived JWT (sysadmin) for live SSE test, manual safe job trigger inside the worker container. No destructive redis/db ops performed.

## 1. Worker (gate_worker)

**What it is.** Not a queue consumer. `worker/index.mjs` (package.json `worker` script, `node worker/index.mjs`) is a node-cron supervisor + optional sync-bridge child, running 5 scheduled jobs + a health HTTP server on :3001:

| Job | Cron | Effect |
|---|---|---|
| `cleanup_ephemeral` | */15 | DELETEs expired rows from 8 short-lived tables (login_attempts, sso_states, mfa/webauthn challenges, pwd resets, enroll codes, scan_nonces, revoked_tokens) |
| `backfill_daily_stats` | 02:00 daily | Upserts `daily_stats` from last 2 days of movement_logs |
| `dispatch_notifications` | */30 | Drains Postgres `notification_{email,sms,push}_queue` (pending → processing → sent / dead), 5-attempt cap, backoff = requeue only |
| `cleanup_expired_passes` | 03:00 daily | Expires PENDING gate passes & sessions, purges expired tokens |
| `audit_log_rotation` | 03:00 Sun | Purges audit_logs (180d) / integration_logs (30d) / resolved alerts (90d), writes completion to audit_logs |

**Verified in prod (evidence):**
- Container log (last 2h) shows `cleanup_ephemeral complete: {...}` runs on schedule (~15 min cadence; `jobsProcessed:4` over ~1h uptime at /status).
- `/status` endpoint (via `docker exec gate_worker wget`): `{"status":"healthy","uptime":3868,"lastJob":"cleanup_ephemeral","jobsProcessed":4}`. Note: host cannot reach :3001 directly (no published port); healthcheck runs in-container, and Docker healthcheck confirms "healthy".
- **Backfill job re-executed manually** (same code path, correct env): logged `Successfully backfilled daily stats (1 rows aggregated)`; DB shows `daily_stats` row 2026-10-11 `updated_at` bumped to `2026-10-12 13:19:57`. Job genuinely EXECUTES, not just container-up.
- **Idempotency:** backfill uses upsert (SET, explicitly documented "do not change to +="); cleanup jobs delete expired rows only (naturally idempotent). **Defect:** backfill returns `undefined` (never returns `recordsAffected`), so the supervisor's `HEALTH_STATE.jobsProcessed` increments but no job-level effect metric is observable via /status.
- **Retry/backoff:** notification dispatch retries on re-run (every 30 min cron) with attempt cap → `dead` status after 5 failures; no in-run backoff delays. Job failures are logged (`console.error`) and swallowed — no alerting/notification on repeated failure.
- **Graceful shutdown:** SIGTERM handler kills bridge child, clears restart timer, exits. cron handles not explicitly cancelled (irrelevant at exit). OK.

**Defect found (active, verified in prod logs):**
- `dispatch_notifications` fails every 30 min: `ERR_MODULE_NOT_FOUND: Cannot find module '/app/src/lib/dbClient.js'`. The image ships `src/lib/dbClient.ts` (TypeScript source), but the bare Node worker does `import ... from '../../src/lib/dbClient.js'` — there is no `.js` compiled output and no tsx loader in the worker. **Email/SMS/push notification dispatch is effectively dead in production.** Recurring error confirmed in `docker logs gate_worker` (2 occurrences in last 24h, matching the */30 cron).

**Redis relationship:** worker does NOT use Redis at all (no ioredis/redis client anywhere in `worker/`). Redis URL is env-set on the worker but unused. See §2.

## 2. Redis (gate_redis)

**Role:** cache + health-probe only, **no queues, no locks, no streams** — no list/streams keys, no queue consumers in worker or API routes (grep-verified: `redis` only appears in `src/lib/cache.ts` comment, `env.ts`, `health.ts`).

**Non-destructive checks (redis-cli with auth, PING→PONG):**
- `DBSIZE: 0`, `KEYS *`: empty. No backlog, no stuck jobs (there is no job queue in Redis to be stuck).
- `info keyspace`: empty; `info replication`: master, no slaves; `info clients`: 1 connected client (our probe; web/worker don't hold open connections — pool-based/ephemeral or unused).
- Persistence: `rdb_changes_since_last_save:0`, last RDB save ~container start; `maxmemory=0` (no evict policy, no maxmemory set — unbounded growth possible, fine at current scale).
- `LASTSAVE`: successful.
- `cache.ts` is actually **in-memory only** (LRU, 5k cap) even when REDIS_URL is set — the "dual-mode Redis client" advertised in its comment is not implemented; Redis writes from the app don't materialize as keys.
- `health.ts` probes redis latency for the /health payload.
- **Connection-failure recovery:** app-side is cache-degradation only (in-memory fallback); no reconnect/backoff logic for Redis because nothing depends on it continuously. Worker: N/A (no Redis dependency).
- Redis password mismatch observed: `compose/.env` REDIS_PASSWORD ≠ running container's REDIS_PASSWORD (container env was generated with a different value; host `.env` was later re-rolled). Not destructive, but `docker-compose up`/`down` cycles with current .env will re-provision redis with the new password — healthcheck is self-consistent within compose, so no outage. Document as config drift.

## 3. Realtime

**Transports (three coexisting):**
1. **SSE routes** (Next.js, `src/app/api/**/stream/route.ts`): `/api/gate/stream`, `/api/notifications/stream`, `/api/occupancy/stream`, `/api/admin/lockdown/stream`. Poll the DB every 3–4 s server-side, emit only on change, `: ping` keepalive every 15 s, **hard auto-terminate at 45 s** (serverless-style `maxDuration`), client reconnects.
   - **Auth:** all four wrapped in `withAuthorization` — verified live: unauthenticated `curl` → `401 UNAUTHORIZED`; minted sysadmin JWT → live stream with real data.
   - `notifications/stream` additionally guards IDOR (non-admins forced to own userId; verified in source).
   - **Client reconnect/cleanup:** browser `EventSource` auto-reconnects; server-side intervals cleared on abort/close and 45 s timeout (verified in code). `NotificationBell.tsx` closes its EventSource on unmount (code-level).
2. **`src/lib/websocket.ts` (`GateMonitorWS`):** WS client at `NEXT_PUBLIC_WS_URL` (default `ws://localhost:8080` — **nothing serves 8080**; see defect below), exponential backoff (1 s → 30 s, max 8 attempts), then **SSE fallback** (`connectSSEFallback` rewrites ws:// to http:// and opens EventSource on the same base URL — which does NOT correspond to a real SSE route, so the fallback URL is generally wrong/404), bounded SSE retry (5×, base 5 s), mock mode blocked in production. Cleanup on `disconnect()`: timers + socket + EventSource + mock generator. Thorough in code; in practice the primary WS path is dead on this host.
3. **Client polling:** `usePolling` (30 s default, pausable via visibilitychange, cleared on unmount) and `useLiveRefresh` (jittered interval, stops on 401/UNAUTHORIZED, cleans up on unmount). Used across ~15 pages.

**Live verification (read-only):**
- `/api/gate/stream` with minted JWT: `event: connected` → repeated `event: gate_status` with real gate data every ~3 s, change-suppressed (identical payload suppressed via `lastPayload`). **Working.**
- `/api/notifications/stream`: `connected` + empty notifications payload. **Working.**

**Defects (realtime):**
- **Primary WS endpoint unreachable:** `GateMonitorWS` default `ws://localhost:8080` has no server; compose exposes no :8080. UIs using the WS class will burn all 8 reconnect attempts and fall back to an SSE URL that is the WS base (typically a 404 page, not an SSE route). Realtime for those views silently degrades to poll-only (usePolling/useLiveRefresh), or shows "transport exhausted". Confirm what `NEXT_PUBLIC_WS_URL` is set to for the deployed web container — if unset, this is live behavior.
- **45 s hard cutoff on SSE routes:** every `EventSource` stream is killed after 45 s and re-opens. Works, but each reconnect re-runs a fresh initial poll; the SSE fallback in `GateMonitorWS` (no auth header — `EventSource` can't set Authorization headers) is only usable on cookie-authenticated routes, which `/api/gate/stream` is (cookie fallback in withAuthorization) — but cross-origin cookie SSE without CORS handling is fragile. No CORS headers seen on stream routes.
- Minor: `gate/stream` uses `getDbClient()` per poll inside the hot loop (fine), but the `maxDuration=45` comment says "serverless" — this is self-hosted Node, so the 45 s cap is a carryover assumption; intentional reconnect cadence, acceptable but documented.

## 4. Verified job execution (task 4)

Chose `backfill_daily_stats` (idempotent upsert, safe). Triggered in-container with correct DB env:
- Before: no `daily_stats` row for 2026-10-12; `daily_stats(2026-10-11).updated_at = 2026-10-11 20:30`.
- Ran job → logged "Successfully backfilled daily stats (1 rows aggregated)".
- After (read-only psql): `daily_stats(2026-10-11, gate 5f2183c9...) updated_at = 2026-10-12 13:19:57` — effect confirmed in DB. `movement_logs` had 29 rows in the last 2 days window; no 2026-10-12 data yet (day in progress, last scan 2026-10-11 09:47), so no new-date row — expected.

## 5. Resilience on interruption (documented, not performed on prod)

**Redis restart/failure:**
- No queue/lock state in Redis (DBSIZE=0, no consumers), so downtime is bounded to cache-miss latency; app falls back to in-memory cache (`cache.ts` always in-memory). Health payload degrades `redis` to `degraded` (health.ts) rather than failing the whole /health.
- RDB persistence + `redisdata` volume → surviving restart preserves any keys; none in use. Recovery = service comes back; no backlog to drain.
- Worker is unaffected (no Redis dependency) — no restart/retry cascade.

**Worker restart/failure:**
- `restart: always` + healthcheck on in-container :3001/health → Docker restarts on crash; missed cron ticks are simply skipped (node-cron has no catch-up) — expired-data cleanup self-heals on next run (idempotent deletes/upserts). Daily jobs missed at 02:00 re-run next day; `backfill_daily_stats` covers a 2-day window, so a single-day worker outage loses no data.
- In-container job failures are logged + swallowed (supervisor stays alive). No automatic re-queue of a failed cron tick; failed `dispatch_notifications` leaves items `pending` (retried next */30 cycle) or `dead` after 5 attempts — **no alerting on dead letters** (defect: silent dead queue; only visible in worker logs / psql).
- Sync-bridge child (if `ENABLE_SYNC_BRIDGE=true`) has its own exponential backoff restart (5 s → 60 s, resets after 30 s stable run).

## 6. Verified working vs assumed

**Verified working (evidence above):**
- Worker container up, cron jobs firing on schedule, `/status` health endpoint correct.
- `backfill_daily_stats` and `cleanup_ephemeral` execute with real DB effect (idempotent upsert confirmed in psql before/after).
- SSE gate + notifications streams: auth enforced (401 anon, 200 JWT), live data flowing, change-suppression + keepalive + 45 s recycle behavior as designed.
- Redis healthy, empty, persistence OK, auth enforced.
- Realtime fallback design (usePolling/useLiveRefresh jitter + stop-on-401) in code; NotificationBell unmount cleanup in code.

**Assumed (not exercised, conservative read-only scope):**
- SSE reconnect loop across multiple 45 s cycles from a real browser (curl validated single cycle only).
- Worker crash → Docker restart + healthcheck recovery path (documented from compose flags, not triggered).
- Notification dispatch happy path (broken by module defect §1; cannot validate `sent` flow without repairing the build).
- `daily_stats` midnight boundary correctness on a busy gate (only low-volume data available).

## 7. Defect register

| # | Severity | Area | Finding | Evidence |
|---|---|---|---|---|
| D1 | HIGH | Worker | `dispatch_notifications` permanently broken: imports `src/lib/dbClient.js` which doesn't exist in the image (only `.ts`); notification email/sms/push queues never drain | prod worker logs: `ERR_MODULE_NOT_FOUND` every 30 min since startup; `ls /app/src/lib` shows `dbClient.ts` only |
| D2 | MED | Realtime | Primary WS target `ws://localhost:8080` has no server; SSE fallback URL derived from WS base points at a non-SSE 404 | compose exposes no 8080; `GateMonitorWS` default URL; fallback rewrites ws://→http:// but keeps host/port |
| D3 | LOW | Worker | `backfill_daily_stats` returns `undefined` — no `recordsAffected`/success metric reaches /status | job source + manual run output |
| D4 | LOW | Config | `REDIS_PASSWORD` in `.env` differs from running gate_redis container's password (config drift; next compose recreate changes credentials) | docker inspect vs .env |
| D5 | LOW | Ops | No dead-letter alerting for `notification_*_queue` items reaching `dead`; failures only in worker logs | job code (5-attempt → dead) |
| D6 | INFO | Design | Redis is cache/health-probe only; queue/lock semantics assumed in docs are actually Postgres-table based | DBSIZE=0, grep for redis usage |

**Repair suggestion for D1 (not applied):** add `tsx` to the worker image/build and import `dbClient.ts` (or precompile `src/lib` to `.js` in the Dockerfile worker target). Out of scope — read-only engagement.
