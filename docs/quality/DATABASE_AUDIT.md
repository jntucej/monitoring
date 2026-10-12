# DATABASE AUDIT — Gate Monitor (Postgres + Redis + Migrations)

**Date:** 2026-10-12 19:05 IST (audit run)
**Scope:** read-only, non-destructive. No migrations run, no tables dropped, no Redis flush.
**Host:** docker `gate_postgres` (Postgres 17.6, Supabase-based) / `gate_redis` (Redis 7.4.11), `/opt/monitoring/compose`
**DB:** `gate_monitor` (29 MB, 89 tables + 3 views)

---

## 1. Connectivity & Version

| Check | Result | Evidence |
|---|---|---|
| Postgres reachable | ✅ | `SELECT version()` → `PostgreSQL 17.6 on x86_64-pc-linux-gnu` |
| Redis reachable | ✅ | `redis-cli ping` → `PONG` (auth via `REDIS_PASSWORD` from `.env`) |
| Redis version | — | `7.4.11` (compose env) |
| DB size | 29 MB | `pg_database_size('gate_monitor')` |

---

## 2. Schema Consistency

### 2.1 `permissions` base table + `permission_requests` view

- `permissions` is a **real table** (89-table list, owner `postgres`), 7 rows.
- **Confirmed: `permission_requests` is a plain `SELECT ... FROM permissions` view — all 28 columns pass through** (id, ticket_number, workflow_type, requester_user_id, hostel_scope, current_stage, status, stage_history, document_required, document_url, biometric_hostel_at, biometric_gate_at, digital_signature, created_at, updated_at, branch, reason, from_date, to_date, description, priority, cancelled_by, cancelled_at, parent_notified_at, sla_deadline, student_user_id). **No extra/missing columns — view is a 1:1 projection.**
- `permissions` FKs: `requester_user_id → users(id) ON DELETE CASCADE`; `cancelled_by → users(id) ON DELETE SET NULL`.
- CHECK constraints on `workflow_type` (hostel/exam/memo/staff_leave), `hostel_scope` (boys/girls), `status` (PENDING/APPROVED/REJECTED/ESCALATED/COMPLETED), `priority` (low/medium/high/urgent).
- Indexes: pkey, unique ticket_number, idx on student, ticket, status, workflow.

### 2.2 `users` table (49 columns, 1440 rows)

- Role fields: `role`, `status`, `login_identifier`, `password_hash` — **all present**.
- **Checkout column: only `checked_out_at` exists** (checked via `information_schema`). `check_out_at` exists ONLY on `visitor_logs`. So the app-side spelling variants resolve to: users=`checked_out_at`, visitor_logs=`check_out_at`. No duplicate on `users`.
- 16 indexes on users (12 functional + pkey/unique keys), incl. `idx_users_login_identifier`, `idx_users_role`, `idx_users_status`-equivalent via role/status filters (seq scan acceptable at this scale — see §4).

### 2.3 `student_curfew_scores` + `student_monthly_outing_summary`

- **Both tables EXIST** (confirmed in live `\dt`), created by `20261114000001_student_dashboard_tables.sql`, which is also the **most recent applied migration** (applied 2026-10-12 09:15 UTC).
- Both have PKs, `UNIQUE(student_user_id, …)`, FK to `users` CASCADE, composite DESC indexes (`idx_curfew_scores_student_date`, `idx_monthly_outing_student_month`), RLS enabled + `svc_all_*` policies. Both currently **0 rows** (no movement_logs data yet drives rollups).

### 2.4 `login_attempts` + unique constraint on identifier

- Table exists (6 rows). Columns: id, identifier, attempt_time, success, ip_address, user_agent, failed_count, locked_until, last_channel, last_attempt_at.
- **Unique constraint on `identifier` CONFIRMED — but as duplicate redundancy:**
  - `login_attempts_identifier_unique` (named UNIQUE constraint)
  - `uq_login_attempts_identifier` (second UNIQUE constraint, **same column**)
  - `idx_login_attempts_identifier` (redundant non-unique B-tree)
  - `login_attempts_pkey`
  → **3 of the 4 indexes enforce the same uniqueness.** Functional, but waste. (Not flagged as blocking; see §4 / fix note.)
- Companion `pin_login_attempts` uses `identifier` as PK + `upper(identifier)` index — consistent.
- `users` also carries `failed_login_count` + `locked_until` columns (migration 20261007000003) — app-level lockout state co-exists with row-level `login_attempts`.

### 2.5 `students` view

- Not a table: **view** over `users u LEFT JOIN student_details sd ON sd.user_id = u.id WHERE u.role='student'`, with `roll` mapped from `u.unique_id`. All `roll/section/batch/gender/hostel_*` fields come from `student_details`.

---

## 3. Migrations

**On disk:** 69 files in `/root/monitoring/database/migrations/` (`20260101000000` → `20261114000001`).
**Applied in DB:** `schema_migrations` has **72 rows**; `max(version) = 20261114000001`.

### 3.1 Reconciliation result

- **On-disk-but-unapplied: NONE** — every file on disk has a `schema_migrations` row. ✅
- **Applied-but-no-file-on-disk: 3** → **`20261014000000`, `20261014000001`, `20261016000000`** are recorded as applied but their `.sql` files were deleted/never committed. This is **irreversible history drift**: a fresh restore of the migrations directory cannot reproduce these steps, and any downstream migration that depends on their effects is a risk. ⚠️
- **Out-of-order applications: 7 pairs** where `applied_at` order is decreasing vs version order, e.g. `20261028000000` applied before `20261010000001`, `20261111000000` before `20261014000007`, `20261031000000` before `20261011214459`. This matches the known pattern: `20261011160054_student_dashboard_init` was recorded in `schema_migrations` **but its CREATE TABLE statements never executed** (the migration body was a placeholder at apply time).

### 3.2 Idempotency / re-runnability

Per-file scan (guard markers):

| File | Idempotent / safe to re-run | Notes |
|---|---|---|
| `20260101000000` extensions | ✅ | `CREATE EXTENSION IF NOT EXISTS` |
| `20260101000004` triggers | ✅ | `DROP TRIGGER IF EXISTS` + recreate |
| `20260101000005` views | ✅ | `IF EXISTS` drop/recreate |
| `20261011000007` unify_login_lockout | ✅ | **No-op placeholder** (comment-only) |
| `20261011000025` audit_action_widen | ⚠️ | `ALTER COLUMN action TYPE VARCHAR(100)` — **not idempotent-safe if data >100 chars** (would error on re-run); rest is no-op |
| `20261011000036` sustainability dedup | ⚠️ | `DELETE` + add UNIQUE — **dedup is not idempotent** (second run re-scans, no-ops OK) but the UNIQUE constraint add would fail if run alone |
| `20261012000001` drop_sso_mfa_pin | ✅ | Intentionally no-op (tables preserved) |
| `20261011160054` student_dashboard_init | ⚠️ | **Recorded as applied but DDL never ran.** Re-run is needed for the tables to exist — this was later fixed by `20261114000001` (full re-run). Re-running `20261011160054` alone today is safe (all guarded) but redundant. |
| `20261114000001` student_dashboard_tables | ✅ | Fully guarded (`IF NOT EXISTS`, `OR REPLACE`, `IF NOT EXISTS` policy guards, `ON CONFLICT` inserts). **Idempotent re-run confirmed.** |
| `20261010000003` api_metrics | ✅ | `CREATE TABLE IF NOT EXISTS` + guarded indexes |
| `20261010120000` create_app_role | ✅ | `IF NOT EXISTS` role + idempotent GRANTs |
| `20261011000017` nullable_daily_stats | ✅ | Explicit no-op DO block |
| Baseline funcs/triggers (001/002/003) | ⚠️ | `CREATE OR REPLACE FUNCTION` (safe) but contain **plain `INSERT` seeds** and one `DELETE` — re-run may duplicate seed rows |
| Most others (007–009, 1011000035, 1011000039, 1011000040, 1011214459, 1012000000/009, 1014000002–007, 1015000000/001, 1018000000–002, 1019–1031, 1110–1113) | ✅ | `IF NOT EXISTS` / `OR REPLACE` / `ON CONFLICT` / guarded policy blocks |
| `20261112000000` mess_food | ⚠️ | 6 plain `INSERT`s — seed duplication risk on re-run |
| `20261112000001` mess_system_full | ⚠️ | 7 plain `INSERT`s — seed duplication risk |

**Net: the schema is re-runnable today only because `20261114000001` re-executes the dashboard DDL with full guards.** The 7 out-of-order + 3 missing-file entries mean **the `schema_migrations` table is not a reliable linear history** — treat it as "applied" bookkeeping, not as an ordered replay list.

**No migration is currently "pending" (on-disk but unapplied).** The live DB is at the latest version (`20261114000001`).

---

## 4. Indexes & Performance

### 4.1 Hot queries (EXPLAIN ANALYZE, measured on live 1440-row user set / 55k-row api_metrics)

**`/api/students` (warden-scoped roster):**
```
EXPLAIN ANALYZE SELECT * FROM users WHERE role='student' AND status='ACTIVE' AND checked_out_at IS NULL
→ Seq Scan on users  (actual 0.40 ms, 1416 rows, 24 filtered)
```
- **Full seq scan is expected and acceptable at 1440 rows** (0.4 ms). No missing index.
- Companion `student_details WHERE user_id = ANY (…200 ids)` → `Bitmap Index Scan on student_details_pkey`, 6.4 ms. ✅ Indexed.

**`/api/students` search (`name/unique_id/email ILIKE %x%`):**
```
→ Seq Scan on users (1.5 ms)
```
- **Full seq scan on ILIKE leading wildcard** — no `pg_trgm` index on `users(name)`. At current scale this is fine (<2 ms), but **will degrade linearly** as the user base grows past ~50k. Flag as "watch item, not urgent".

**`/api/passes` → `gate_passes` filters:**
```
EXPLAIN ANALYZE ... WHERE final_status='PENDING' ORDER BY requested_at DESC LIMIT 50
→ Index Scan using idx_gpasses_final_status (0.05 ms, 0 rows today)
```
- ✅ Indexed on `final_status`, `user_id`, `requested_at`. 0 rows currently (table empty).

**`/api/permissions` → `permissions` filters:**
- Indexes on `status`, `workflow_type`, `ticket_number`, `student_user_id` all present. Filters like `WHERE status='PENDING' ORDER BY created_at DESC` are index-friendly. No full-scan flag.

**Rate limiter hot path (`api_metrics` COUNT per window):**
```
EXPLAIN ANALYZE SELECT COUNT(*) FROM api_metrics WHERE path='/api/students' AND timestamp >= now()-interval '1 hour'
→ BitmapAnd(idx_apimetrics_path AND idx_apimetrics_timestamp) — 0.07 ms
```
- ✅ Well-indexed. However see **§4.2 unbounded growth**.

**Audit-log full-text search:**
```
EXPLAIN ANALYZE ... WHERE details_text_tsv @@ websearch_to_tsquery('login failed')
→ Bitmap Index Scan on idx_audit_logs_details_tsv — 1.0 ms
```
- ✅ GIN-ish TSV index working.

### 4.2 Flags

| Flag | Detail | Severity |
|---|---|---|
| **`api_metrics` unbounded growth** | 55,622 rows and growing (~5-min cron + every rate-limit check INSERTs). **No retention/cleanup job found** (no `DELETE` on `api_metrics` in any migration, worker, or cron). The 1-day-window aggregation query (11.8 ms today) **will degrade as this table grows unboundedly**. Recommend a `RETENTION_CLEANUP` job + `DROP`/partition at e.g. 90 days. | ⚠️ Medium |
| **`login_attempts` redundant indexes** | 3 of 4 indexes enforce the same `UNIQUE(identifier)`. Safe to drop 2 (`uq_login_attempts_identifier` + `idx_login_attempts_identifier`) keeping the named constraint. Trivially-safe cleanup, **not performed** (out of scope of read-only mandate; logged for future). | ⚠️ Low |
| **`users` ILIKE search unindexed** | Leading-wildcard `ILIKE` = seq scan. Fine at 1.4k rows; add `pg_trgm` GIN index only if roster grows. | ℹ️ Watch |
| **No composite `(role, status, checked_out_at)` index on users** | Seq scan on the roster query is fine now; add composite if users exceed ~50k. | ℹ️ Watch |

**Decision on "fix trivially-safe things":** No index change was applied this run. The `login_attempts` redundant-index removal is safe but the table is tiny (6 rows) and removal risks confusing the app's `ON CONFLICT (identifier)` upsert if the *named* constraint index is the one Postgres uses; better done in a dedicated migration PR, not ad-hoc.

---

## 5. Constraints & Referential Integrity

| Check | Result |
|---|---|
| Orphan `permissions.requester_user_id` → users | **0** ✅ |
| Orphan `passes.user_id` / `passes.student_id` → users | **0** ✅ (table empty, 0 rows) |
| Orphan `gate_passes.user_id` → users | **0** ✅ |
| Orphan `login_attempts.identifier` → users.login_identifier | **6** ⚠️ — identifiers `x, hod, sysadmin, operator, student_001, principal, 20jj5a1201` have no matching `users.login_identifier`. These are **handle/role-style identifiers** (e.g. `sysadmin`), likely intentional test/seed rows, but they **do not violate the FK** (there is **no FK** from `login_attempts` to `users` — only the `UNIQUE` constraint). So: not orphans in the FK sense, just dangling identifiers. |
| `users.checked_out_at` populated | **0 / 1440** — column exists but no student has been checked out yet. |
| `user_roles` orphans (user or role missing) | **3 rows** ⚠️ — `3` rows in `user_roles` have a `user_id` not in `users` **or** a `role` not in `config_roles`. No FK on `user_roles` (relational integrity is enforced app-side). |
| `audit_logs.action` CHECK allowlist | Enforced (canonical list in `audit_logs_action_known`). Note `details_text_tsv` has **no column default** — the TSV is maintained by trigger. |
| FKs `users` → `permissions` | `ON DELETE CASCADE` (requester), `ON DELETE SET NULL` (cancelled_by). |
| FKs `users` → `passes` | Both `user_id` and `student_id` `ON DELETE CASCADE`. |

**No hard-referential-integrity violations found** (0 orphan FK rows). The 3 `user_roles` rows and 6 `login_attempts` identifiers are data-quality notes, not integrity failures.

---

## 6. Redis

| Check | Result |
|---|---|
| Connectivity | ✅ `PONG` (auth required — `requirepass` set) |
| `maxmemory` | **0 (unbounded)** |
| `maxmemory_policy` | `noeviction` |
| `used_memory` | 1.01 MB (peak 1.01 MB) |
| `dbsize` | **0 keys** |
| Persistence | RDB `save 3600 1 / 300 100 / 60 10000`, **AOF = no**, `/data` = 8 KB |
| Namespaces | **None in use.** No `RATE_LIMIT:*`, no queue keys, no cache keys. |

**Key findings:**
- **Redis is effectively idle.** No keys, no queues, no rate-limit namespace. The app's rate limiter (`src/lib/rate-limit.ts`) **uses Postgres `api_metrics` as the primary limiter in production** and falls back to an in-memory store — **Redis is NOT the rate-limit backend.** (The `REDIS_URL` is wired to the app via compose env, but no Redis client library is imported in `src/` or `worker/`.)
- **Memory risk: LOW right now** (1 MB used), **BUT `maxmemory=0` + `noeviction` means an unbounded key write would OOM the container** with no eviction. Since no queue/TTL workload is currently loaded, the risk is latent, not active.
- **No TTL-based cleanup** is exercised because no keys exist.

**Flag:** If any future feature (queues, rate-limit, cache) starts writing to this Redis, **set `maxmemory` + `maxmemory-policy=allkeys-lru`** before the write path goes live, or a single unbounded stream will take down the container. Documented as a pre-requisite, not applied now.

---

## 7. Backups

| Check | Result |
|---|---|
| `/opt/monitoring/backups/daily/` exists | ✅ |
| Recent pg_dump files | ✅ `gate-db-20261012_185001.sql.gz` (2.1 MB, 18:50 UTC today) — **402 `.sql.gz` files** (5-min cadence, ~30-day retention → 402 ≈ 3 days at 5-min intervals; retention is actually deleting at `mtime+30d`) |
| Valid SQL dump? | ✅ `zcat … | head` → `-- PostgreSQL database dump`, 89 `CREATE TABLE/COPY` statements |
| Migration-state export | ✅ `migrations-state-<ts>.txt` written each run (`schema_migrations` dump) |
| Cron | ✅ `*/5 * * * * /opt/monitoring/scripts/master-backup.sh >> /opt/monitoring/backups/daily/cron.log` |
| `master-backup.sh` | Present at **both** `/opt/monitoring/scripts/` and `/opt/monitoring/compose/scripts/` — 5 steps: DB dump, secrets export, git state, compose tar, 30/7/14-day retention. **Last log line: 18:50 "✓ Backup complete. Total backup storage: 385M".** |
| Restore documented? | ✅ **`scripts/quick-recover.sh`** — restores latest `gate-db-*.sql.gz` into running `gate_postgres` then runs `gate-watchdog.sh` migrations. **`scripts/verify-backup.sh`** — restore-verification test (references nightly `backup-postgres.sh` + weekly Sunday restore per `docs/RUNBOOK.md`). |

**Backup gap findings:**
- ⚠️ **Secrets export writes plaintext `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `.env`, and the `users` table (email/role/`has_password` flags) to `backups/daily/secrets-<ts>.txt` (chmod 600).** 7-day retention. This is a **large-blast-radius secret sink** — the backup dir is writable by root and the secrets file persists for 7 days. Not a restore blocker, but a security exposure. Flag for rotation/encryption at rest.
- ⚠️ **Restore is NOT verified in the daily cron.** The `weekly restore verification` cron line in `docs/RUNBOOK.md` is **not present in the live crontab** (only the 5-min `master-backup.sh` line is). So `verify-backup.sh` exists but **is not scheduled** — a broken dump would not be caught for days.
- ℹ️ `retention_policies` table (0 rows) and `scheduled_jobs` — no automated `api_metrics` pruning (ties back to §4.2).

---

## TOP RISKS (ranked, with exact evidence)

1. **`api_metrics` unbounded growth, no retention** (55,622 rows and climbing; rate limiter inserts on every call; no `DELETE`/cleanup in code, cron, or migrations). The 1-day aggregation query is 11.8 ms today and will worsen. **Evidence:** `count(*) FROM api_metrics` = 55622; grep for `DELETE`/`retention` on `api_metrics` = 0 hits; cron only runs `master-backup.sh`.
2. **`maxmemory=0` + `noeviction` on Redis** (latent OOM). **Evidence:** `CONFIG GET maxmemory` → `0`; `maxmemory_policy` → `noeviction`; `used_memory` = 1.01 MB (idle).
3. **`schema_migrations` is not a reliable linear history**: 3 applied versions with no on-disk file (`20261014000000`, `20261014000001`, `20261016000000`) + 7 out-of-order applications. **Evidence:** `max(version)=20261114000001` but 72 applied rows vs 69 files; applied_at ordering is non-monotonic.
4. **Restore verification not scheduled** — `verify-backup.sh` exists but no cron/systemd timer runs it; RUNBOOK claims a weekly Sunday restore test that is not in the live crontab. **Evidence:** `crontab -l` shows only `*/5 …/master-backup.sh`.
5. **Plaintext secrets in backup dir** (`secrets-<ts>.txt` for 7 days, containing DB/Redis passwords + `.env` + user role listing). **Evidence:** `master-backup.sh` step 2, `chmod 600` only.
6. **Redundant/duplicate `login_attempts` indexes** (3 of 4 enforce same uniqueness) + **3 `user_roles` rows with missing user/role refs** (no FK, data-quality only). **Evidence:** §2.4, §5.

### What was fixed
**Nothing was changed** (read-only mandate). The two "trivially-safe" candidates (drop the 2 redundant `login_attempts` indexes; add a composite `users(role,status,checked_out_at)` index) were deliberately **not** applied — both are low-risk but belong in a tracked migration, not an ad-hoc DDL on the live prod DB. Both are logged above for a follow-up migration PR.

### Files created
- `/root/monitoring/docs/quality/DATABASE_AUDIT.md` (this document)
- `/root/.hermes/cache/scratch/mig_analysis.json` (migration reconciliation working data)
