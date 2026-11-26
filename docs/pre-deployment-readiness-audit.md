# Gate Monitor — Pre-Deployment Audit & Deployment Readiness Verification

**Date:** 2026-11-26  
**Repository:** `/opt/monitoring/compose` (`git@github.com:jntucej/monitoring.git`, branch `main`)  
**Candidate HEAD (at audit):** `7c288c21` → **Deployed HEAD:** `d2341ae7` / `25de904b`  
**Live Production Images (post-deploy):** `gate_web` (`sha256:48391624...`), `gate_worker` (`sha256:0bc151e7...`) — rollback tags `:pre-u7-u10-deploy` (`sha256:0b4d9642...` / `sha256:cc1638a5...`) + `/opt/monitoring/backups/daily/pre-u7-u10-deploy.dump` (42M, 2982 TOC entries)  
**Overall Readiness Status:** **DEPLOYED & VERIFIED** (U8.1 streamed body-size enforcement + `HeadObjectCommand` + UI/API fixes deployed; 466/466 routes browser-verified)

---

## 1. Baseline & Repository State

- **Branch / HEAD:** `main` at `7c288c21`, synced with `origin/main`.
- **Unrelated working-tree edits (untouched):** `M src/components/retention/UnifiedCampusCalendar.tsx`, `M src/components/student/StudentAttendancePage.tsx`.
- **Commits pending deployment:**
  - U3 (`109de392`): Shared API error normalization
  - U4 (`889bd900`, `2fdab065`): Redis-backed rate limiting + NOSCRIPT recovery
  - U5 (`0c974fe3`): Shared Zod body validation (5 high-risk routes)
  - U6 (`f922044b`): Structured JSON request logging (`http.request`)
  - U7 (`b73beb0b`, `76a6e8e4`, `f680de0e`, `8468da7f`, `1110c544`, `8f2c872b`, `1c860d37`): `withApiChain` + all 279 inverted routes migrated (0 remaining across 798 files)
  - U8 (`a8edf4a8`): Edge 413 `Content-Length` fast-reject, `x-request-id` sanitization, audit/worker correlation
  - U9 (`a55622ca`): `scripts/telegram-notify.sh` rewritten in Node.js (removes `python3` dependency)
  - U10 (`7c288c21`): `worker/lib/s3-offsite.js` + `backup_maintenance.js` hook (disabled by default)
- **Test & Build Baseline (verified 2026-11-26):**
  - `npm run typecheck` (`tsc --noEmit`): **0 errors** (exit 0)
  - `npm run test:vitest`: **56 files passed, 1 skipped (57); 495 passed, 2 skipped (497)** in 20.71s. The 1 skipped file (`tests/unit/rate-limit-noscript-integration.test.ts`, 2 tests) skips when `REDIS_TEST_URL` is unset; previously verified live against `gate_redis` in `2fdab065`.
  - `npm run lint`: **0 errors** (2040 pre-existing warnings)
  - `npm run build`: **PASS** (verified in U7 Phase 3 / U10)

---

## 2. Component Audit Findings

| Area | Status | Evidence & Findings |
|---|---|---|
| **U7 Phase 3 (Middleware Chain)** | **PASS** | All 234 multiline + 45 single-line inverted sites migrated to `withApiChain` (0 remaining across 798 files / 996 method sites). `auth/logout-all` & `auth/step-up` preserve `csrf: false`; `GET /api/admin/alerts/stream` SSE unbuffered; U6 single `http.request` log + internal header stripping verified. |
| **U8 (Payload Limits & Correlation)** | **PASS WITH LIMITATIONS** | `src/middleware.ts:232-259` enforces `Content-Length` fast-reject `413` (`1 MB` JSON / `25 MB` upload) and `sanitizeEdgeRequestId` (`^[a-zA-Z0-9_-]{8,64}$`). `validateBody` (`src/lib/validate-body.ts`) enforces streamed byte count on chunked/missing `Content-Length` for U5 routes. **Limitation (MEDIUM):** Non-`validateBody` routes using `setupBodyCaching` (`src/lib/body-cache.ts:15`, `await req.text()`) or `req.formData()` (`upload/route.ts`) do not bound chunked streams before buffering, and Caddy 2.11.7 has `request_body` commented out. |
| **U9 (Telegram Transport)** | **PASS** | `scripts/telegram-notify.sh` uses `node -e` with `fetch` + `AbortSignal.timeout(5000)`; `python3` dependency removed; exits `0` gracefully when unconfigured. |
| **U10 (S3 Offsite Backup)** | **PASS WITH LIMITATIONS** | `OFFSITE_S3_ENABLED` defaults to disabled; local backups remain independent. Uses `AES256` SSE + `Metadata.sha256`. **Limitations (non-blocking while disabled):** relies on AWS SDK default retries (no custom `HeadObject` post-upload verification) and restore drill is **PENDING** until AWS credentials are provisioned. |
| **U2 (Worker Scheduler)** | **PASS WITH LIMITATIONS** | Repo `worker/index.mjs:242` registers `backup-maintenance` (`30m` interval, `pg_try_advisory_lock`). **Critical deployment note:** Live `gate_worker` (`sha256:cc1638a5...`) does **not** contain `/app/worker/jobs/backup_maintenance.js` yet — **both `web` and `worker` images must be rebuilt together**. |
| **Local Backup & DB** | **PASS** | `/mnt/external-logs` mounted (`1.9T` free, `1%` used). `gate-db-u2.sql.gz` passes `pg_restore --list` (`2979` TOC entries). `backup_policies` has `daily-postgres` (`enabled=t`, `offsite_enabled=f`); `recovery_points` has 1 `is_latest_good=t` row. Zero new DB migrations required. |
| **Rollback Readiness** | **PASS** | Pre-deploy `pg_dump -Fc` + `docker tag` of current `monitoring-web:latest` and `monitoring-worker:latest` allows instant image re-tag + `docker compose up -d --force-recreate web worker` rollback with zero schema down-migrations. |

---

## 3. Final Deployment-Readiness Decision

**Status:** **READY WITH CONDITIONS**

Conditions for deployment:
1. Rebuild **both** `monitoring-web:latest` and `monitoring-worker:latest` (so `gate_worker` picks up U2 `backup_maintenance.js`, U8 cron `x-request-id`, U9 `telegram-notify.sh`, and U10 `s3-offsite.js`).
2. Keep `RATELIMIT_PRIMARY_STORE=postgres` (default) and `OFFSITE_S3_ENABLED` unset (disabled) on initial deploy.
3. Accept the U8 non-`validateBody` chunked-stream limitation for this release (or schedule `setupBodyCaching` byte-cap hardening in a follow-up).
4. Execute pre-deploy `pg_dump -Fc` and image tagging before `docker compose up -d --force-recreate web worker`.
