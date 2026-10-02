# H0201 Biometric Device Integration Plan

**Document status:** Planning only. No production code has been written.
**Author role:** Senior backend / integration engineer
**Repository:** `gate-monitor` (JNTUH CEJ Gate Monitor / SBTS)
**Branch inspected:** `JC-1-hii` @ `0988523a`
**Date:** 2026-09-17
**Device under integration:** SBTS H0201 biometric attendance terminal (serial `1241920440010`)

> **Reading note.** Everything below is derived from the actual repository at the commit above.
> Statements are tagged `[CONFIRMED]`, `[PROBABLE]`, `[UNKNOWN]`, or `[REQUIRES DEVICE TEST]`.
> Nothing about the H0201 wire protocol has been assumed. Where the repository is silent, this
> document says so instead of inventing behaviour.

---

## 1. Executive Summary

The repository **already contains a partial H0201 integration**, not a blank slate. An earlier
effort shipped:

- `[CONFIRMED]` A standalone sync worker: `scripts/sync-bridge/` (`index.ts`, `log-fetcher.ts`,
  `mapper.ts`, `sink.ts`, `types.ts`, `selfcheck.ts`) with an explicit adapter boundary
  (`LogFetcher`), a stub TCP-4370 fetcher, text/binary file fetchers, and a working
  `USE_FAKE_DEVICE_LOGS=true` mock path.
- `[CONFIRMED]` A mapping table + migration: `supabase/migrations/20260913_device_user_mappings.sql`
  creating `public.device_user_mappings` keyed by `(device_serial, device_user_id) → users.id`.
- `[CONFIRMED]` RLS enablement for that table in
  `supabase/migrations/20260916000000_security_rls_and_function_hardening.sql`.
- `[CONFIRMED]` A documented, runnable self-check (`scripts/sync-bridge/selfcheck.ts`) that passes
  today, because it is pure-function only.

What is **not** done, and what this plan exists to close:

1. `[CONFIRMED]` **The real device protocol is absent.** `createTcpLogFetcher()` throws unless
   `USE_FAKE_DEVICE_LOGS=true`. No ZK/ADMS/HTTP implementation exists.
2. `[CONFIRMED]` **`public.attendance_records` does not exist in `supabase/schema.sql`.** The sink
   writes to it (upsert `onConflict: 'dedupe_key'`) and `src/lib/integrations/attendance.ts`
   writes with `onConflict: 'person_id,date'`. Both the sink and the lib read a table that is not
   declared in the schema of record. **This is the single largest correctness gap.**
3. `[CONFIRMED]` **No device registry table.** There is no `devices` table; `gates` is a
   *physical gate* concept, not a *biometric terminal* concept. Device serial is free-text with no FK
   (documented as such in the migration header).
4. `[CONFIRMED]` **No raw event store, no sync run log, no unresolved-event queue.**
   `SyncRunSnapshot` exists only as an in-memory TS type and is `console.log`ged — never persisted.
   Nothing survives a restart, and an admin cannot answer "why did this student's attendance not
   appear?" from the UI.
5. `[CONFIRMED]` **No admin UI for devices.** `src/components/sysadmin/GateManagement.tsx` and
   `/api/gate/devices` present *gates*, and the latter fabricates hardcoded mock devices with
   invented uptime numbers. There is no screen for device registration, mapping management, import
   upload, or sync history.
6. `[CONFIRMED]` **The mock fetcher is unsafe in production.** `USE_FAKE_DEVICE_LOGS=true` makes the
   worker return two synthetic punches every 30 seconds forever, which would be written into
   `movement_logs` and therefore into occupancy, daily stats, and the audit log. There is no guard
   preventing this in a production run.
7. `[CONFIRMED]` **Idempotency is inconsistent.** `mapper.ts` dedupes **in-memory, per run only**.
   `sink.ts` inserts into `movement_logs` with a plain `.insert()` and **no** unique constraint or
   dedupe key. Only `attendance_records` has a `dedupe_key`. Re-running a sync, or restarting the
   worker mid-batch, therefore **duplicates `movement_logs` rows** and double-counts occupancy and
   daily stats. This violates the primary requirement of Phase 6.
8. `[CONFIRMED]` **No test runner.** `package.json` has `test:e2e` (Playwright) and `lint` but no
   unit-test script, and no Jest/Vitest/node:test config. `selfcheck.ts` is run manually and is not
   wired into any script. There is no `sync-bridge` npm script at all despite the README instructing
   `npm run sync-bridge`.

**Recommended shape of the work.** Keep the existing architecture — it is correct in outline and
matches the requested conceptual design. The critical insight is that **`movement_logs` is this
system's attendance table.** Every consumer already reads it: `src/lib/integrations/attendance.ts`,
`/api/faculty/attendance`, `/api/staff/attendance`, `/api/gate/logs`, the admin attendance page, and
three database triggers (`trg_occupancy_on_movement`, `trg_daily_stats_on_movement`,
`trg_audit_on_movement`). Therefore the H0201 pipeline should **not** invent a parallel attendance
system. It should: land raw device events in a new `device_events` table, resolve identity through
`device_user_mappings`, and write **exactly one** deduplicated row per punch into the existing
`movement_logs`. `attendance_records` remains an optional HR mirror and must first be made real.

---

## 2. Existing System Analysis

### 2.1 Application `[CONFIRMED]`

| Item | Value | Evidence |
| :--- | :--- | :--- |
| Framework | Next.js `16.3.1`, App Router | `package.json` |
| UI | React `19.2.8`, Tailwind CSS `^4`, Framer Motion, Recharts | `package.json`, `docs/TECH_STACK.md` |
| Language | TypeScript `^5`, `strict: true`, path alias `@/* → ./src/*` | `tsconfig.json` |
| State | Zustand `^5` (`src/stores/*`) | `package.json` |
| Data client | `@supabase/supabase-js` `^2.112.3` | `package.json` |
| Package manager | npm (`package-lock.json` present) | repo root |
| Deployment | Vercel (`vercel.json` = `{"framework":"nextjs"}`), `.vercel/` present | repo root |
| Background jobs | `src/app/api/cron/reports/route.ts` only | file listing |
| Test tooling | Playwright E2E only; **no unit runner** | `package.json` |

Scripts in `package.json`: `prebuild` (`node scripts/validate-env.js`), `dev`, `build`, `start`,
`test:e2e`, `lint`. **There is no `sync-bridge` script** (`[CONFIRMED]`), contradicting
`scripts/sync-bridge/README.md` §Run.

### 2.2 Frontend structure `[CONFIRMED]`

Route groups under `src/app/`: `(admin)`, `(operator)`, `(person)`, `(student)`, `(supervisor)`,
`(sysadmin)`, plus ungrouped `api/`, `study/`, `login`, `profile`, `settings`, `security`.

Relevant existing operator/admin surfaces:

- `src/app/(operator)/gate/[gateId]/page.tsx` — live operator scan desk (QR + WebAuthn thumbprint).
- `src/app/(admin)/admin/attendance/page.tsx` — daily attendance grid, derives first-IN / last-OUT
  per student from `/api/gate/logs` + `/api/students`.
- `src/app/(admin)/admin/gates/page.tsx`, `src/app/(admin)/admin/gates/[id]/page.tsx`.
- `src/components/sysadmin/GateManagement.tsx`, `src/components/sysadmin/IntegrationsDashboard.tsx`
  (has a "Sync Now" button, but it is wired to `/api/integrations/[id]/sync` for **LMS/HR**, not
  biometrics — `[CONFIRMED]`, `src/app/api/integrations/[id]/sync/route.ts`).
- `src/components/sysadmin/BulkUserImportModal.tsx` — an existing bulk-import UX pattern worth
  reusing for file upload (`[CONFIRMED]` it exists; it is not a biometric importer).

### 2.3 Backend / API structure `[CONFIRMED]`

~90 route handlers under `src/app/api/**/route.ts`, all following one convention:

```ts
async function handleGet(req: NextRequest) { ... }
export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "gate_devices", maxRequests: 60 }
);
```

- `withAuthorization(handler, opts)` — `src/middleware/authorization.ts`. Validates a Supabase bearer
  token **once**, requires an `x-session-token` header to equal `users.handle` (single-device session
  pinning), checks `status === 'ACTIVE'`, enforces `requiredRole`/`requiredPermission`, and injects
  trusted `x-user-id` / `x-user-role` / `x-user-email` headers. Handlers must read identity **only**
  from those headers.
- `withRateLimit(fn, {keyPrefix, maxRequests})` — `src/lib/rate-limit.ts`.
- Responses are uniformly `{ success: true, data }` or
  `{ success: false, error: { code, message } }`.

**There is no `middleware.ts` at the repo root** (`[CONFIRMED]` — the file does not exist). Auth is
per-route via the wrapper, not via global Edge middleware. `src/middleware/` contains library
helpers imported by routes, not Next.js middleware.

### 2.4 Authorization / RBAC `[CONFIRMED]`

Roles in `users.role` CHECK: `operator, admin, sysadmin, guardian, student, warden, faculty, staff,
worker, visitor`.

- sysadmin → `/sysadmin/*` (infrastructure, users, integrations, audit)
- admin → `/admin/*` (campus ops)
- operator → `/gate/:gateId`
- Database helpers: `is_admin(uuid)`, `is_sysadmin(uuid)`, `is_warden`, `is_operator` plus new
  zero-arg cached overloads `is_admin_self()` etc. in the 2026-09-16 hardening migration.

**Everything is additive.** No existing attendance record is touched, no existing table is altered
destructively, and the current manual/QR operator flow on `/gate/[gateId]` is unaffected.

### 2.5 Environment `[CONFIRMED]`

- Root `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `MOBILE_TOKEN_SECRET`, `SEED_DEFAULT_PIN`, SMS/EMAIL provider vars.
- Root `.env.local` / `.env.vercel`: Supabase keys + `VERCEL_OIDC_TOKEN` + `NEXT_PUBLIC_WS_URL`,
  `NEXT_PUBLIC_WS_MOCK` (values redacted here; do not commit).
- `scripts/sync-bridge/.env.example`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `BIOMETRIC_DEVICE_SERIAL`, `BIOMETRIC_DEVICE_HOST`, `BIOMETRIC_DEVICE_PORT`,
  `SYNC_INTERVAL_MS`, `BIOMETRIC_DEVICE_TCP_TIMEOUT_MS`, `USE_FAKE_DEVICE_LOGS`.
  Note the **naming inconsistency**: the worker reads `SUPABASE_URL`, while the Next.js app and
  `scripts/validate-env.js` read `NEXT_PUBLIC_SUPABASE_URL` (`[CONFIRMED]`).
- `.gitignore` exists; `.env.local` is not tracked.
- `scripts/validate-env.js` runs on `prebuild`; it knows nothing about biometric device vars, so a
  missing device host fails only at worker startup, not at build.

### 2.6 Logging / error handling `[CONFIRMED]`

- **Application:** `console.error`/`console.warn` throughout routes; no structured logger, no Sentry.
- **Database:** `audit_logs` table + `logAuditEvent()` (`src/lib/audit.ts`, ~30 `AuditAction`
  literals) and DB-side triggers (`create_audit_log_on_movement` writes on every `movement_logs`
  insert).
- **Worker:** `console.log` of a formatted `SyncRunSnapshot` line per cycle, and **nothing
  persisted**.
- **Notable adjacent bug:** `src/app/api/operator/override-biometric/route.ts` inserts an `alerts` row
  with `severity: "warning"`, but the schema CHECK allows only `low|medium|high|critical`. That insert
  silently fails today (`[CONFIRMED]` schema vs code mismatch; unrelated to H0201 but in the
  biometric-adjacent path).

### 2.7 Existing "integration" subsystem `[CONFIRMED]`

`src/lib/integration-types.ts` defines `IntegrationType = 'attendance' | 'sms' | 'email' |
'hr_sync' | 'sis_sync' | 'visitor_pre_reg' | 'mobile_api'`. Routes `/api/integrations*` read
`integration_configs` and write `integration_logs`; `/api/integrations/lms/*` is the LMS flow.

**These tables are referenced by code but are not present in `supabase/schema.sql`** — the same gap
as `attendance_records`. The 2026-09-16 hardening migration references them by name only (RLS
`ALTER TABLE`, policy loops) with no `CREATE TABLE`. They are `[PROBABLE]` created out-of-band via the
Supabase dashboard. **Must be confirmed against the live database before any H0201 table references
them.**

### 2.8 Database schema — as declared in `supabase/schema.sql` `[CONFIRMED]`

27 tables. Identity anchor is `users.id UUID` = `auth.users.id`.

| Table | Purpose | Key columns |
| :--- | :--- | :--- |
| `gates` | Physical gates | `id uuid PK`, `gate_code text UNIQUE`, `name`, `location`, `type`, `is_active` |
| `users` | Unified identity (1:1 auth.users) | `id uuid PK`, `unique_id VARCHAR(50) UNIQUE`, `handle TEXT UNIQUE`, `name`, `role`, `email UNIQUE`, `status`, `thumbprint_hash`, `pin_hash`, `gate_id → gates` |
| `student_details` | Student layer (PK = `user_id`) | `roll VARCHAR(20) UNIQUE`, `year`, `section`, `batch`, `guardian_id → users`, `hostel_block`, `room_number`, `warden_id` |
| `employee_details` | Staff layer (PK = `user_id`) | `employee_id VARCHAR(20) UNIQUE`, `designation`, `is_hod` |
| `movement_logs` | **The attendance/scan ledger** | `id uuid PK`, `user_id → users`, `direction IN\|OUT`, `reason` CHECK, `gate_id → gates NOT NULL`, `gate_name NOT NULL`, `operator_id → users`, `operator_name`, `timestamp TIMESTAMPTZ`, `is_manual`, `is_correction`, `original_log_id → movement_logs`, `correction_reason` |
| `campus_occupancy` | Current IN/OUT per user (PK `user_id`) | maintained by trigger |
| `daily_stats` | Per `(date, gate_id)` rollup | PK `(date, gate_id)` |
| `visitor_logs` | Visitor check-in/out | `check_in_at`, `check_out_at`, `status active\|completed` |
| `gate_passes` | Exit passes | `from_datetime`/`to_datetime`, approval status chain |
| `alerts` | Security alerts | `severity low\|medium\|high\|critical` |
| `notifications` (+3 queues) | Notification fan-out | `channels TEXT[]` |
| `audit_logs` | Audit trail | `action`, `user_id`, `user_name`, `user_role`, `details JSONB`, `ip_address` |
| `api_metrics`, `system_alerts`, `backups`, `webauthn_credentials`, `alert_rules`, `system_settings`, `sso_config`, `support_tickets`, `support_ticket_comments`, `gate_access_rules`, `predictions`, `zones` | platform | — |

**Declared outside `schema.sql`** (referenced by TS code / migrations, no `CREATE TABLE` in the
file): `attendance_records`, `device_user_mappings` (has its own migration), `integration_configs`,
`integration_logs`, `saved_report_definitions`, `retention_policies`, `data_compliance_logs`,
`gate_holidays`, `lms_config`, `sustainability_metrics`, `onboarding_progress`,
`role_change_requests`, `announcements`, `user_announcement_dismissals`. `[REQUIRES LIVE DB CHECK]`


### 2.9 Constraints, indexes, triggers `[CONFIRMED]`

Unique constraints: `gates.gate_code`, `users.unique_id`, `users.handle`, `users.email`,
`users.login_identifier`, `student_details.roll`, `employee_details.employee_id`,
`webauthn_credentials.credential_id`, `support_tickets.ticket_number`, `daily_stats (date,gate_id)`,
and `device_user_mappings (device_serial, device_user_id)`.

**`movement_logs` has NO unique constraint and NO dedupe column.** This is the central idempotency
problem (see §11).

Triggers on `movement_logs` (AFTER INSERT, each row):
- `trg_occupancy_on_movement` → `update_campus_occupancy_on_movement()` — upserts `campus_occupancy`
  to the new `direction`.
- `trg_daily_stats_on_movement` → `update_daily_stats_on_movement()` — increments
  `daily_stats.entries`/`exits` for `(NEW.timestamp AT TIME ZONE 'UTC')::date`.
- `trg_audit_on_movement` → `create_audit_log_on_movement()` — writes `audit_logs`.

> **Consequence for this project:** any duplicate insert into `movement_logs` corrupts occupancy,
> daily statistics, *and* the audit log in one shot. Idempotency is not a nice-to-have here; it is
> the correctness boundary of the whole feature.

Indexes: `idx_gates_active`, `idx_users_unique_id/handle/email`, plus `idx_device_mappings_lookup`
(partial, `WHERE is_active`), `idx_device_mappings_user_id`.

RLS: enabled on all core tables. Service-role write policies exist for `device_user_mappings`,
`integration_configs`, `integration_logs`, and core tables via the 2026-09-16 migration's
`service_tables` loop. `movement_logs` has SELECT policies for operator/staff/own and an INSERT policy
for staff; the bridge must use the **service-role** client, exactly as `sink.ts` documents.

### 2.10 Identity model `[CONFIRMED]`

```
auth.users.id  ──1:1──►  public.users.id (UUID, PK)
                              │
                              ├─ users.unique_id  = roll no (students, e.g. "24JJ1A0201")
                              │                     employee id (staff)
                              │                     phone/email (others)
                              ├─ users.handle     = session token anchor (single-device)
                              ├─ student_details.roll  (10-char JNTUH scheme, src/lib/rollNumber.ts)
                              └─ employee_details.employee_id
```

Roll numbers are 10 characters: `YY | JJ | 5A | 12 | 03` (year, college, entry mode, department,
sequence) — `src/lib/rollNumber.ts`.

**There is no concept of a "device user id" anywhere in the schema except
`device_user_mappings.device_user_id` (text).** The H0201 onboard id (e.g. `"101"`) is and must
remain distinct from `users.unique_id`.


---

## 3. Existing Attendance Architecture

### 3.1 The real flow today `[CONFIRMED]`

```
Operator opens /gate/[gateId]  (role: operator|admin|sysadmin|warden)
        │   QR (jsqr) or WebAuthn thumbprint (operatorStore.thumbprintVerified)
        ▼
POST /api/gate/scan
        │   withRateLimit( withAuthorization(handlePost, {requiredRole:[...]}) )
        │   + lockdown check (getActiveLockdown)  ──► 403 LOCKDOWN_ACTIVE
        │   + CSRF origin/host match              ──► 403 FORBIDDEN
        ▼
findUserById / validateRollNumber / isDuplicate / addScan   (src/lib/db.ts)
        ▼
INSERT INTO movement_logs {user_id, direction, reason, gate_id, gate_name,
                           operator_id, timestamp, is_manual, is_correction}
        ▼
DB triggers fire: campus_occupancy upsert · daily_stats increment · audit_logs row
        ▼
UI/reporting: /api/gate/logs · /api/analytics/* · admin/attendance · student history
```

### 3.2 Behaviour of each attendance concern `[CONFIRMED]`

| Concern | Current behaviour | Where |
| :--- | :--- | :--- |
| Check-in / check-out | `direction` is `'IN'` or `'OUT'`, supplied by the client/operator. The schema also has `process_gate_scan(...)` for a stored-procedure path. | `movement_logs.direction`, `src/lib/db.ts` |
| Duplicate punches | **No DB-level protection.** An in-request heuristic `isDuplicate()` exists in `src/lib/db.ts` for the interactive scan path; the biometric bridge has only in-memory per-run dedupe. | `src/lib/db.ts`, `scripts/sync-bridge/mapper.ts` |
| Missing punches | Not modelled. A user with only an IN produces `timeOut = null` in reports. | `src/lib/integrations/attendance.ts` |
| Date / time | `timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()`. Stored as UTC; rendered with `toLocaleTimeString("en-IN")`. | `movement_logs`, `admin/attendance/page.tsx` |
| Time zones | **UTC day boundary is used for stats**: `(NEW.timestamp AT TIME ZONE 'UTC')::date`. But `attendance.ts` computes its "late" cutoff as `new Date(\`${date}T09:15:00.000Z\`)` and filters `gte(timestamp, \`${date}T00:00:00.000Z\`)` — i.e. **the app treats the calendar date as UTC**, while a human at JNTUH CEJ reads 09:15 as **IST**. These are ~5.5 h apart and the day boundary shifts by 5.5 h. `[CONFIRMED — existing latent bug]` |
| Attendance status | Derived at read time: `present` if first IN ≤ 09:15 "Z", else `late`; no IN ⇒ `absent`. | `src/lib/integrations/attendance.ts` |
| Manual corrections | `is_manual`, `is_correction`, `original_log_id`, `correction_reason` columns + `SCAN_CORRECTED` audit action + `ManualEntryDialog.tsx`. | schema + operator UI |
| Admin overrides | `/api/operator/override-biometric` logs audit + alert + notification to admin/sysadmin. | that route |
| Thumbprint on file | `users.thumbprint_hash`, `thumbprint_verified_at`; WebAuthn creds in `webauthn_credentials`. **This is browser WebAuthn, not the H0201's onboard fingerprint templates.** | schema |

### 3.3 Critical architectural conclusions

1. `[CONFIRMED]` **`movement_logs` is the single attendance ledger.** Do not build a second one.
2. `[CONFIRMED]` `movement_logs.gate_id` is `NOT NULL REFERENCES gates(id)` and `gate_name` is
   `NOT NULL`. **Therefore an H0201 terminal must be bound to a `gates` row before any punch can be
   written.** The device registry must carry a `gate_id`, or the mapping must supply one. `sink.ts`
   currently writes `gate_id: event.meta?.gateId ?? null`, which will violate the NOT NULL constraint
   on the far side — today the failure is swallowed into `movementLogErrors` strings because the
   insert is wrapped in a try/catch that only records the error string. `[CONFIRMED — latent failure
   path]`
3. `[CONFIRMED]` `direction` must be `'IN'` or `'OUT'`. `mapper.ts` infers it from `log.state`
   (`0 → IN`, `1 → OUT`, unknown → `IN`). Whether H0201's `state`/punch field actually means that is
   `[REQUIRES DEVICE TEST]`.
4. `[CONFIRMED]` Because triggers fire on **every** `movement_logs` insert, the biometric pipeline
   gets occupancy, daily stats, and audit for free — provided inserts are exactly-once.
5. `[CONFIRMED]` `sink.ts` strips a `meta` field before the `movement_logs` insert
   (`const { meta, ...rest }`), so device provenance is **discarded** on the way in. There is
---

## 4. H0201 Capability Assessment

### 4.1 Method

The repository was searched for every protocol/format token requested:
`biometric`, `fingerprint`, `H0201`, `ATTLOG`, `ZKTeco`, `ADMS`, `device`, `terminal`,
`TCP`, `UDP`, `HTTP`, `API`, `SDK`, `CSV`, `DAT`, `sync`, `import`, `attendance logs`.

**Findings are limited to two artefacts:** `scripts/sync-bridge/*` and
`supabase/migrations/20260913_device_user_mappings.sql`. The only concrete device facts in the repo
are the ones hardcoded in `scripts/sync-bridge/index.ts` / `.env.example`:

```ts
const DEVICE_SERIAL = process.env.BIOMETRIC_DEVICE_SERIAL || '1241920440010';
const DEVICE_HOST   = process.env.BIOMETRIC_DEVICE_HOST   || '192.168.1.201';
const DEVICE_PORT   = Number(process.env.BIOMETRIC_DEVICE_PORT || 4370);
```

Everything else is the previous author's *design intent*, not a measured capability.

### 4.2 Confirmed `[CONFIRMED]`

| # | Fact | Evidence |
| :--- | :--- | :--- |
| C1 | The device is referred to as "SBTS H0201" and is expected to hold **onboard numeric device user ids** (e.g. `"101"`) enrolled directly on the terminal. | `supabase/migrations/20260913_device_user_mappings.sql` header |
| C2 | It is **expected to be reachable on the LAN** at `192.168.1.201:4370`. | `.env.example`, `index.ts` defaults |
| C3 | A **serial number** of `1241920440010` is expected and is the mapping key. | `.env.example`, README §Mapping setup |
| C4 | At least three ingestion modes were anticipated: TCP pull, USB text export, USB binary export. Two are implemented. | `log-fetcher.ts` `LogFetchMode` |
| C5 | A text export format of `deviceUserId,YYYY-MM-DD HH:mm:ss,verifyMode,state` (comma/tab/pipe delimited) is implemented and tested. Whether the device emits this is **not** confirmed. | `parseTextExport`, `parseTextLine`, `selfcheck.ts` |
| C6 | A fixed-block binary format — 8-byte user id, 12-byte timestamp, `uint32 state` at offset 20, default 40-byte blocks — is implemented. Whether the device emits this is **not** confirmed. | `parseBinaryBlock`, `BIOMETRIC_BINARY_BLOCK_SIZE` |
| C7 | Punch `state` is *assumed* to mean `0 = IN`, `1 = OUT`, defaulting to `IN` when absent. | `inferDirection()` |
| C8 | The real TCP adapter is **deliberately unimplemented** and carries an explicit TODO. | `createTcpLogFetcher()` throws unless fake mode |

### 4.3 Probable `[PROBABLE]`

| # | Inference | Basis, and why it is only probable |
| :--- | :--- | :--- |
| P1 | Port **4370** plus the phrase "ZK-derivative protocol" indicates the author believed this is a **ZKTeco-family terminal** exposing the standard UDP/TCP 4370 command protocol. | Port 4370 is the de-facto ZKTeco default. The `log-fetcher.ts` comment says "proprietary ZK-derivative socket protocol ... not assumed to be solved here." **No packet capture, SDK, or datasheet exists in the repo.** |
| P2 | The device likely supports **USB export to a file** (the "ATTLOG.DAT" family of formats). | Two file fetchers were built. No sample file exists in the repo. |
| P3 | The device likely supports **onboard enrolment with a short numeric id**. | The mapping design requires it. |
| P4 | `attendance_records` and `integration_configs`/`integration_logs` exist in the **live** Supabase project but were created outside `schema.sql`. | Code and RLS migrations reference them; `schema.sql` does not declare them. |

### 4.4 Unknown `[UNKNOWN]`

| # | Unknown | Impact if wrong |
| :--- | :--- | :--- |
| U1 | Actual wire protocol (ZKTeco `CMD_ATTLOG_RRQ`? HTTP push? ADMS? vendor SDK? WebSocket?). | The entire network path is blocked. |
| U2 | Whether the device supports **push (ADMS/HTTP to a server)** at all. Push would remove the need for a LAN-reachable worker. | Changes deployment topology substantially. |
| U3 | Whether the device supports **real-time event push** vs periodic pull only. | Determines latency and whether an SSE/Realtime stream is viable. |
| U4 | Whether a punch carries any **unique event id / record id**. Nothing in `RawDeviceLog` models one. | Directly determines the idempotency strategy (§11). |
| U5 | Exact **flash-export filenames and columns** (`ATTLOG.DAT` binary? `1_attlog.dat`? CSV? encoding — the parser assumes UTF-8). | Parser must be built against a real sample. |
| U6 | **Device clock timezone and NTP behaviour**, and whether it stores naive local time or UTC. | Determines whether the existing `Asia/Kolkata` shift logic is right. |
| U7 | **Max records** retained / returned per fetch, and whether old records are purged. | Determines backfill strategy and merge-window size. |
| U8 | Whether the device emits **punch states beyond 0/1** (break-out, overtime-in, …). | `direction` CHECK allows only IN/OUT. |
| U9 | Whether device credentials (comm key / device password) exist and are required. | Security design (§14). |
| U10 | Whether the live DB really has `attendance_records`, `integration_configs`, `integration_logs`. | Blocking for §7 DDL. |
| U11 | Multi-device reality: one H0201 or several? `device_serial` is part of the mapping key, implying several are anticipated. | Affects registry cardinality and `gate_id` binding. |
### 4.5 Requires Physical Device Testing `[REQUIRES DEVICE TEST]`

Each of the following **must** be executed against the actual unit before the network adapter is
written. These are the accept/reject gates for Phase 1 of implementation.

| ID | Test | How | Pass condition |
| :--- | :--- | :--- | :--- |
| T1 | **Port scan / listener check** | `nc -vz 192.168.1.201 4370`, plus `nmap -Pn -p 4370,80,443` | Confirms which ports answer |
| T2 | **Protocol fingerprint** | Attempt the ZKTeco handshake — connect, send the standard command prefix, capture the response — with `tcpdump`/Wireshark. Do **not** implement from memory. | A capture file is produced and attached to the task |
| T3 | **Read serial + firmware** | Vendor software (SBTS/ZKTeco bundle) or the protocol's get-device-info command | Actual serial + firmware recorded and compared with `1241920440010` |
| T4 | **Flash export** | Insert USB, export attendance, copy files to a machine | Exact filenames, sizes, and a hexdump of the first 200 bytes recorded |
| T5 | **Column mapping** | Open the export in the vendor tool **and** a hex editor | Field order, delimiter, encoding, timestamp layout confirmed |
| T6 | **`state`/punch semantics** | Perform a deliberate IN punch, an OUT punch, and a re-punch without leaving | Confirm which field distinguishes them; confirm whether IN/OUT is device-configured or punch-coded |
| T7 | **Event uniqueness** | Punch twice within the same second | Determines whether a native unique record id exists |
| T8 | **Capacity ceiling** | Enrol one test user, generate >1000 records, re-fetch | Pagination / record cap / retention confirmed |
| T9 | **Clock & drift** | Compare device clock with an NTP-synced phone at the same instant, then again after a week | Drift in seconds/week; decide the server-timestamp policy |
| T10 | **Timezone storage** | Set device time to IST, punch, export, compare against UTC | Whether the device stamps naive local time |
| T11 | **Credential requirement** | Reset/observe the device's comm-key setting | Whether a shared secret is required |
| T12 | **Concurrent access** | Pull while a user punches | Whether reads disturb operation |
| T13 | **Push support** | Inspect the menu for ADMS / "cloud server" / push configuration | Whether U2 is real |

> **Gate rule.** Phase 3 (device adapter) does not start until T1–T7 have produced artefacts. Until
> then only the **file-import** path (`[PROBABLE]` P2) and the existing mock path may be developed.

### 4.6 Vendor documentation check (external, not yet performed)

`[UNKNOWN]` — The repository contains **no** H0201 datasheet, no vendor SDK, no protocol PDF, and no
`.git`-tracked capture. A public web search for "SBTS H0201 biometric device" returns generic results
for unrelated `h.0201` / `HB-0201` OEM terminals; there is no authoritative public protocol spec for a
device named exactly "H0201" from a vendor named "SBTS". **Treat the model name as possibly a local or
supplier-assigned code.** The physical unit's manual, its vendor software `About` screen, and its

---

## 5. Integration Architecture

### 5.1 Decision: reuse, do not rebuild

`[CONFIRMED — recommended]` The existing conceptual architecture in `scripts/sync-bridge/` is
sound and matches the requested design. It is retained. Three corrections are required:

1. **One attendance ledger.** Normalized events go to `movement_logs` (existing, trigger-backed).
   `attendance_records` stays as an optional HR mirror and must be created before it can be written.
2. **Persist every stage.** Raw events, per-event processing status, and per-run counters must be
   rows in Postgres, not `console.log` lines. This is what makes "why is this student missing?"
   answerable from the UI.
3. **Move the dedupe boundary into the database.** In-memory dedupe cannot survive a restart and
   cannot protect `movement_logs`.

### 5.2 Target architecture

```
                 ┌────────────────────────────┐
                 │  H0201 Biometric Terminal  │
                 │  (serial 1241920440010)    │
                 └───────┬────────────┬───────┘
                         │            │
        [A] LAN protocol │            │ [B] USB flash export
            (UNKNOWN →   │            │     (PROBABLE: ATTLOG/CSV)
             REQUIRES    │            │
             DEVICE TEST)│            │
                         ▼            ▼
        ┌──────────────────────────────────────────────┐
        │ Device Integration Layer  (adapter boundary)  │
        │                                               │
        │  AttendanceDeviceAdapter (interface)          │
        │    ├── H0201LanAdapter    (protocol TBD)      │
        │    ├── H0201FileAdapter   (ATTLOG / CSV)      │
        │    └── H0201MockAdapter   (dev/CI only)       │
        │                                               │
        │        → NormalizedDeviceEvent[]              │
        └──────────────────┬───────────────────────────┘
                           │
                 ┌─────────▼──────────┐
                 │ device_events      │  raw + normalized + status
                 │ (append-only)      │  UNIQUE(device_serial, event_fingerprint)
                 └─────────┬──────────┘
                           │  resolve device_user_id → users.id
                           │  via device_user_mappings (existing table)
                           │
                 ┌─────────▼──────────┐
                 │ device_sync_runs   │  per-run counters & errors
                 └─────────┬──────────┘
                           │
                 ┌─────────▼──────────┐
                 │ Attendance         │  validate timestamp · clamp future
                 │ Processing Layer   │  infer direction · dedupe · map gate
                 └─────────┬──────────┘
                           │
                 ┌─────────▼──────────────────────────────┐
                 │ movement_logs  (EXISTING table)         │
                 │  ← triggers fire automatically:         │
                 │     campus_occupancy                    │
                 │     daily_stats                         │
                 │     audit_logs                          │
                 └─────────┬──────────────────────────────┘
                           │
                 ┌─────────▼──────────┐
                 │ attendance_records │  optional HR mirror (create it first)
                 └────────────────────┘
```

### 5.3 Deployment shape `[CONFIRMED — recommendation]`

The device sits on the campus LAN. **Vercel cannot reach it, and must not try to.** Therefore:

- The **adapter + poller remains a standalone long-running worker** in `scripts/sync-bridge/`, run on
  a campus host (PM2 / systemd / Docker with restart policy). This is what the existing README
  prescribes and it is correct. No Kafka, no Redis, no queue, no Kubernetes, no microservice.
- The **Next.js app** talks only to Supabase. Admin UI reads `device_events`, `device_sync_runs`, and
  `device_user_mappings` server-side through admin-gated routes using the service client.
- **File import** is the one exception that can live in Next.js: the admin uploads a file to a Next.js
  route handler (`POST /api/devices/[id]/import`), the route parses and inserts. No LAN access needed.
  **`[RECOMMENDED — start here]`** because it is the only path whose device side is `[PROBABLE]`
  rather than `[UNKNOWN]`.
- **"Sync Now"** for a LAN device cannot be triggered from Vercel. It must be a worker-side action
  (§16.4 gives the two allowed options).

### 5.4 What is explicitly rejected

Per Phase 18 — not justified by this codebase or by a 2–3 terminal deployment:

- Kafka / RabbitMQ / any message broker — a 30-second poll loop and one table are enough.
- Redis — `rate-limiter-flexible` already exists in-process; no new cache layer is warranted.
- Kubernetes / microservices — one worker process plus one Next.js app.
- An event-sourcing rewrite of attendance.
- Any new npm dependency for parsing. CSV/ATTLOG parsing is string splitting; `@supabase/supabase-js`
  is already present and is all the worker needs.

embedded network-config page are the authoritative sources and must be retrieved before
implementation.
---

## 6. Data Flow

### 6.1 USB / file import flow `[IMPLEMENTABLE NOW — device side is PROBABLE]`

```
H0201 terminal
   │  operator exports attendance to USB ("Download attendance logs")
   ▼
ATTLOG.DAT / 1_attlog.dat / *.csv / *.txt
   │
   ▼  Admin opens /sysadmin/devices → "Import Attendance File" → selects the terminal
POST /api/devices/[id]/import          (admin|sysadmin, multipart/form-data)
   │
   ├─ 1. Reject if no session / wrong role           → 401 / 403
   ├─ 2. Reject if body > 5 MB                       → 413 FILE_TOO_LARGE
   ├─ 3. Reject unsupported extension/MIME           → 415 UNSUPPORTED_FILE_TYPE
   ├─ 4. Compute sha256 of the bytes
   │     └─ if same hash already imported for this device
   │        → 200 { alreadyImported: true }  (no reprocessing)
   ├─ 5. INSERT device_sync_runs (status='running', trigger_mode='file_import',
   │        file_name, file_sha256, triggered_by = x-user-id)
   ├─ 6. Parse → RawDeviceLog[]  (per-line try/catch; a bad line never aborts the batch)
   │
   ▼  for each raw row
INSERT INTO device_events (
      device_serial, device_user_id, event_timestamp_local, event_timestamp_utc,
      event_type, verify_mode, raw_payload, sync_run_id, source_kind,
      event_fingerprint, processing_status )
   ON CONFLICT (device_serial, event_fingerprint) DO NOTHING
   │
   ├─ conflict              → 'duplicate', counted, NO movement_logs write
   ├─ parse failure         → 'invalid',  error_message = reason
   ├─ no mapping row        → 'unmapped', error_message = 'no device_user_mappings row'
   ├─ mapping inactive      → 'unmapped'
   ├─ user status != ACTIVE → 'unmapped'   (never punch for disabled/locked users)
   └─ otherwise             → 'resolved'
   │
   ▼  for each resolved event
INSERT INTO movement_logs (
      user_id, direction, reason='Regular', gate_id = device.gate_id,
      gate_name = device.gate_name, operator_id = NULL,
      operator_name = 'H0201 <serial>',
      timestamp = event_timestamp_utc, is_manual = false, is_correction = false )
   │     ← occupancy / daily_stats / audit triggers fire here
   │
   ├─ UPDATE device_events SET processing_status='processed', movement_log_id=<id>
   └─ on error → 'error', error_message = db error (event is NOT lost)
   │
   ▼
UPDATE device_sync_runs SET status, finished_at, duration_ms,
       raw_count, resolved_count, inserted_count, duplicate_count,
       unmapped_count, invalid_count, error_count, error_summary
   │
   ▼
UI: /sysadmin/devices/[id] renders the run summary, failed-event table, unmapped panel
```

**Report artefact.** The import report is the `device_sync_runs` row joined to the `device_events`
rows with `processing_status IN ('invalid','unmapped','error')`. No separate report file is generated;
that table *is* the report, and it can be exported to CSV with the existing client-side export
pattern (`src/lib/export.ts`, as used in `UserAnalytics.tsx`).

### 6.2 Network sync flow `[BLOCKED PENDING T1–T7]`

```
H0201 terminal  (LAN 192.168.1.201:4370, per repo defaults)
   │  protocol [UNKNOWN]
   ▼
worker on campus host  →  H0201LanAdapter  →  RawDeviceLog[]
   │
   ▼
store raw events            (identical device_events insert as §6.1 step 7)
   ▼
normalize / resolve / dedupe / persist to movement_logs   (identical processor)
   ▼
update device_sync_runs + device_registry.last_sync_at / last_sync_status
```

**Key design property:** everything after the adapter is **byte-identical** between the file flow and
the network flow. Only the adapter differs. This is the entire point of the boundary and it is what
keeps attendance logic device-agnostic.

### 6.3 Failure & retry flow

```
Device unreachable
   │  adapter throws (ECONNREFUSED / ETIMEDOUT)
   ▼
device_sync_runs: status='failed', error_summary='ECONNREFUSED 192.168.1.201:4370'
device_registry: last_sync_status='failed', consecutive_failure_count += 1
   │  previous data untouched — nothing is deleted or corrected
   ▼
next interval retries. Back-off MIN(interval * 2^failures, 15 min), reset on success.
   └─ ≥5 consecutive failures → INSERT INTO alerts
        (severity='high', title='H0201 device unreachable')
      ⚠ alerts CHECK allows only low|medium|high|critical — use 'high', NOT 'warning'.
```

### 6.4 Unresolved-user flow (Phase 8 requirement)

```
device_user_id = '1042'
   │
   ▼  SELECT … FROM device_user_mappings WHERE device_serial=… AND device_user_id='1042'
no row
   │
   ├─ device_events row IS written with processing_status='unmapped'
   ├─ raw_payload preserved so the punch is never lost
   ├─ NO user created. NO fake student. NO movement_logs row.
   └─ UI: /sysadmin/devices/[id] "Unmapped device users" panel lists distinct device_user_id
          values with counts and first/last seen, each with an inline "Map to user…" action
          that inserts into device_user_mappings, plus "Reprocess these events now".
```

---

## 7. Database Changes

All changes are **additive**. No existing table is dropped, renamed, or retyped. No existing row is
modified. Migrations follow the repo convention already visible in
`supabase/migrations/20260913_device_user_mappings.sql` and `20260916000000_*`:
`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, idempotent `DROP TRIGGER IF EXISTS` +
`CREATE TRIGGER`, and explicit `ENABLE ROW LEVEL SECURITY` plus service-role policy.

> **Prerequisite:** confirm against the live database that `attendance_records` exists (U10). The
> existing sink writes to it. If it does not exist, the migration must create it (or the mirror sink
> must be removed) — see §7.7.

### 7.1 New table: `public.device_registry`

Closes the "no public.devices table exists yet" gap flagged in the existing migration header.
**`gates` is deliberately not reused** as the device registry: a gate is a physical location that
outlives any terminal, and one gate may host more than one terminal.

```sql
CREATE TABLE IF NOT EXISTS public.device_registry (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_serial          text NOT NULL UNIQUE,            -- '1241920440010'
  device_name            text NOT NULL,                   -- 'Main Gate H0201'
  device_type            text NOT NULL DEFAULT 'h0201',   -- adapter key
  vendor                 text,                            -- 'SBTS'
  model                  text,                            -- 'H0201'
  firmware_version       text,
  gate_id                uuid REFERENCES public.gates(id) ON DELETE RESTRICT,
  gate_name              text,            -- denormalised for movement_logs.gate_name
  location               text,
  connection_type        text NOT NULL DEFAULT 'usb_file'
                         CHECK (connection_type IN ('usb_file','lan_tcp','lan_http','adms_push')),
  ip_address             text,
  port                   integer,
  credential_ref         text,  -- NAME of the env var holding the comm key. NEVER the key itself.
  is_active              boolean NOT NULL DEFAULT true,
  status                 text NOT NULL DEFAULT 'UNKNOWN'
                         CHECK (status IN ('ONLINE','OFFLINE','DEGRADED','UNKNOWN','DISABLED')),
  last_sync_at           timestamptz,
  last_sync_status       text CHECK (last_sync_status IN ('success','partial','failed')),
  consecutive_failure_count integer NOT NULL DEFAULT 0,
  timezone               text NOT NULL DEFAULT 'Asia/Kolkata',
  clock_drift_seconds    integer,   -- measured during device acceptance testing (T9)
  notes                  text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_device_registry_active
  ON public.device_registry (device_serial) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_device_registry_gate
  ON public.device_registry (gate_id);
```

> **`gate_id` is required in practice.** `movement_logs.gate_id` is `NOT NULL REFERENCES gates(id)`,
> so a punch from a device with no bound gate **cannot** be persisted. The write path must refuse.
> A DB-level `NOT NULL` is intentionally *not* added so a device may exist in a "pending
> configuration" state without inventing a fake gate — enforcement lives in the write path and UI.
### 7.2 New table: `public.device_events`

The raw/normalized event store. This is the table that makes the pipeline observable and replayable.

```sql
CREATE TABLE IF NOT EXISTS public.device_events (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_serial          text NOT NULL
                         REFERENCES public.device_registry(device_serial) ON DELETE CASCADE,
  device_user_id         text NOT NULL,
  event_timestamp_utc    timestamptz,   -- normalized; NULL when raw ts was unparseable
  event_timestamp_local  text,          -- device's own naive local string, verbatim, for forensics
  event_type             text,          -- 'IN'|'OUT'|'UNKNOWN' after inference
  verify_mode            text,          -- 'fp'|'face'|'card'|'pin' or raw code
  source_kind            text NOT NULL
                         CHECK (source_kind IN ('usb_file','lan_tcp','lan_http','adms_push','mock')),
  source_ref             text,          -- file name, or protocol record index
  event_fingerprint      text NOT NULL, -- computed by the application (§11.2)
  sync_run_id            uuid REFERENCES public.device_sync_runs(id) ON DELETE SET NULL,
  processing_status      text NOT NULL DEFAULT 'pending'
                         CHECK (processing_status IN
                           ('pending','resolved','processed','duplicate','unmapped','invalid','error')),
  movement_log_id        uuid REFERENCES public.movement_logs(id) ON DELETE SET NULL,
  resolved_user_id       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  raw_payload            jsonb NOT NULL,   -- THE ORIGINAL, unmodified device row
  error_message          text,
  processed_at           timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now()
);

-- THE idempotency anchor: same physical punch => same fingerprint => rejected by the DB.
CREATE UNIQUE INDEX IF NOT EXISTS uq_device_events_fingerprint
  ON public.device_events (device_serial, event_fingerprint);

CREATE INDEX IF NOT EXISTS idx_device_events_status
  ON public.device_events (device_serial, processing_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_events_unmapped
  ON public.device_events (device_serial, device_user_id)
  WHERE processing_status = 'unmapped';
CREATE INDEX IF NOT EXISTS idx_device_events_user_time
  ON public.device_events (resolved_user_id, event_timestamp_utc DESC);
CREATE INDEX IF NOT EXISTS idx_device_events_run
  ON public.device_events (sync_run_id);
```

`event_fingerprint` is computed by the application; Postgres stores and enforces it. Keeping the
derivation in code lets the algorithm be revised via a backfill migration without a schema change.

### 7.3 New table: `public.device_sync_runs`

Persists what `SyncRunSnapshot` currently only prints.

```sql
CREATE TABLE IF NOT EXISTS public.device_sync_runs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_serial      text NOT NULL
                     REFERENCES public.device_registry(device_serial) ON DELETE CASCADE,
  trigger_mode       text NOT NULL CHECK (trigger_mode IN ('scheduled','manual','file_import')),
  triggered_by       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  source_kind        text NOT NULL,
  file_name          text,
  file_sha256        text,
  status             text NOT NULL DEFAULT 'running'
                     CHECK (status IN ('running','success','partial','failed')),
  started_at         timestamptz NOT NULL DEFAULT now(),
  finished_at        timestamptz,
  duration_ms        integer,
  raw_count          integer NOT NULL DEFAULT 0,
  resolved_count     integer NOT NULL DEFAULT 0,
  inserted_count     integer NOT NULL DEFAULT 0,
  duplicate_count    integer NOT NULL DEFAULT 0,
  unmapped_count     integer NOT NULL DEFAULT 0,
  invalid_count      integer NOT NULL DEFAULT 0,
  error_count        integer NOT NULL DEFAULT 0,
  error_summary      text,
  metrics            jsonb   -- free-form extras (bytes read, protocol version, retries)
);

CREATE INDEX IF NOT EXISTS idx_device_sync_runs_device_time
  ON public.device_sync_runs (device_serial, started_at DESC);
-- Guard against re-importing the identical file twice.
CREATE UNIQUE INDEX IF NOT EXISTS uq_device_sync_runs_file
  ON public.device_sync_runs (device_serial, file_sha256)
  WHERE file_sha256 IS NOT NULL;
```
### 7.4 Extend `public.device_user_mappings` (existing table — additive columns only)

The existing table is correct and is **kept as-is**. Three non-breaking nullable columns are added so
admins can see provenance without joining audit logs. Every existing row stays valid.

```sql
ALTER TABLE public.device_user_mappings
  ADD COLUMN IF NOT EXISTS enrolled_at timestamptz,  -- when the fingerprint was enrolled on device
  ADD COLUMN IF NOT EXISTS notes       text,         -- e.g. 're-enrolled after sensor swap'
  ADD COLUMN IF NOT EXISTS created_by  uuid REFERENCES public.users(id) ON DELETE SET NULL;

-- Guard the reverse direction: one user should not be actively mapped twice on the SAME device
-- (catches accidental double-enrolment of one person under two ids -> double punches).
CREATE UNIQUE INDEX IF NOT EXISTS uq_device_mapping_one_active_per_user
  ON public.device_user_mappings (device_serial, user_id)
  WHERE is_active = true;
```

> **Risk check on that index.** It is a real behavioural constraint. If a person is legitimately
> enrolled under two device ids on the same terminal, this rejects the second row. That is the
> desired behaviour (two active ids for one person = double punching = duplicated attendance), and
> the violation surfaces as a clear `409` in the mapping API rather than as silent duplicate
> attendance. Omit it if operations insists on multi-id enrolment.

### 7.5 Optional: provenance columns on `movement_logs` (nullable — zero risk)

Today `sink.ts` strips device metadata before insert, so nothing in `movement_logs` says which
terminal produced a punch. Two nullable columns fix that and are the cheapest way to answer
"which device did this come from?" in existing reports.

```sql
ALTER TABLE public.movement_logs
  ADD COLUMN IF NOT EXISTS device_serial text,
  ADD COLUMN IF NOT EXISTS source        text;   -- 'qr'|'webauthn'|'biometric_h0201'|'manual'
```

- Nullable ⇒ **all existing rows and all existing query paths are unaffected.** No trigger reads
  these columns. No index is required (a partial index on `device_serial` can be added later if
  reporting demands it).
- `source` would also let the existing manual/QR path be tagged, but **that change is out of scope
  for this migration** and must not be bundled in, to keep the blast radius at zero.

### 7.6 RLS for the new tables

Follow the exact pattern of `20260916000000_security_rls_and_function_hardening.sql`: RLS enabled,
`service_role` gets `FOR ALL`, reads granted to admin/sysadmin only. Device data is security-sensitive
(it is a movement trail of real people) and must never be world-readable.

```sql
ALTER TABLE public.device_registry   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_sync_runs  ENABLE ROW LEVEL SECURITY;

-- Worker + import route use the service-role client.
CREATE POLICY svc_all_device_registry  ON public.device_registry  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY svc_all_device_events    ON public.device_events    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY svc_all_device_sync_runs ON public.device_sync_runs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Admin/sysadmin read access for the UI (cached-uid helpers from the 2026-09-16 migration).
CREATE POLICY admin_select_device_registry  ON public.device_registry  FOR SELECT TO authenticated USING (public.is_admin_self());
CREATE POLICY admin_select_device_events    ON public.device_events    FOR SELECT TO authenticated USING (public.is_admin_self());
CREATE POLICY admin_select_device_sync_runs ON public.device_sync_runs FOR SELECT TO authenticated USING (public.is_admin_self());
```

**Deliberately no `FOR INSERT` policy for `authenticated`.** All writes go through service-role
(a Next.js route using `getSupabaseServiceClient()`, or the worker). A compromised admin session
therefore cannot forge raw device events directly through PostgREST.

### 7.7 Conditional: `public.attendance_records`

`scripts/sync-bridge/sink.ts` upserts into `attendance_records` with `onConflict: 'dedupe_key'`, while
`src/lib/integrations/attendance.ts` upserts with `onConflict: 'person_id,date'`. These two conflict
targets **cannot both resolve** unless both unique constraints exist. `[REQUIRES LIVE DB CHECK]`
before writing any DDL:

- If `attendance_records` **exists** with both constraints → leave it alone.
- If it exists with **only one** → the other upsert path is silently failing today. Fix separately
  from H0201.
- If it **does not exist** → either create it in this migration, or delete the mirror sink from
  `scripts/sync-bridge/sink.ts` and keep `movement_logs` as the only sink. **Recommended: the
  latter.** The mirror creates a second source of truth for attendance — exactly the duplication
  Phase 7 forbids — and nothing in the UI reads `attendance_records`.

### 7.8 Explicitly not changed

- `users` — no new columns. Device ids live in `device_user_mappings`, never on `users`.
- `student_details` / `employee_details` — untouched.
- `gates` — untouched, but the seeded rows (`MAIN`, `HOSTEL`, `BACK` from `scripts/seed-gates.js`)
  become the valid `gate_id` targets for device binding.
- All existing RLS policies, triggers, functions, and `movement_logs` semantics — untouched.
- `schema.sql` — **append the new DDL as a migration file, do not edit `schema.sql` in place**, so
  the existing bootstrap path for a fresh database is not disturbed. (Optional follow-up: mirror the
  final DDL into `schema.sql` in a separate, clearly-labelled commit.)
---

## 8. Device Identity Mapping

### 8.1 The rule

```
Biometric template on the H0201   →  device_user_id  (e.g. "1042")   ← device's own namespace
        ↓  resolve via device_user_mappings(device_serial, device_user_id, is_active)
SBTS identity                     →  users.id (UUID) → users.unique_id (e.g. "23JJ1A1203")
```

`[CONFIRMED — critical]` **`H0201` is the device model name, never a student identifier.**
`device_user_id` is never written into `users.unique_id`, `student_details.roll`, or any identity
column. Resolution is a **lookup**, never a parse. There is no "device id → roll number" arithmetic
anywhere in the pipeline.

### 8.2 Resolution algorithm (authoritative)

```
resolve(device_serial, device_user_id):
  1. row = device_user_mappings
             WHERE device_serial   = :serial
               AND device_user_id  = :device_user_id
               AND is_active       = true
     ─ none      → UNMAPPED      (keep raw, warn, do not invent a user)
     ─ >1 rows   → CONFIG_ERROR  (impossible by UNIQUE, still assert defensively)
  2. user = users WHERE id = row.user_id
     ─ none      → UNMAPPED      (FK makes this unreachable, still assert)
  3. user.status ≠ 'ACTIVE' → UNMAPPED with reason ACCOUNT_NOT_ACTIVE
                              (LOCKED / SUSPENDED / DISABLED / DEPROVISIONED must not punch)
  4. else → RESOLVED → write movement_logs(user_id = row.user_id)
```

> **Deliberately excluded from resolution:** `users.thumbprint_hash` / `thumbprint_verified_at`.
> `[CONFIRMED]` those belong to the browser WebAuthn flow (`webauthn_credentials`), a completely
> separate system. `device_user_mappings` — and only `device_user_mappings` — is the trust anchor
> between the terminal and SBTS, exactly as the existing migration header states.

### 8.3 Lifecycle

| Stage | Action | Where |
| :--- | :--- | :--- |
| Enrol | Physical enrolment on the H0201 keypad → device assigns/accepts a numeric id | Device (manual) |
| Map | Admin inserts `(device_serial, device_user_id → user_id)` | New UI + `POST /api/device-users/mappings` |
| Verify | UI shows an identity card (name, unique_id, role) so the admin confirms the right person | New UI |
| Re-enrol | If the device id changes, create a new row and set the old row `is_active = false` | New UI (never mutate `device_user_id` in place) |
| Offboard | On `users.status → DISABLED`, do **not** delete the mapping; set `is_active = false` | New UI + documented ops step |
| Bulk | CSV upload of `device_user_id,unique_id` for the initial roster | New UI (reuse `BulkUserImportModal` pattern) |

### 8.4 Why not store the device id on `users`

Rejected: (a) a person may be enrolled on multiple terminals, so it is 1:N not 1:1; (b) it would leak
terminal internals into the identity table that every auth path reads; (c) `device_user_mappings`
already solves this and is already RLS-hardened. Rung 2 of the ladder: **the table already exists —
reuse it.**
---

## 9. Raw Event Processing

### 9.1 Contract

```ts
// scripts/sync-bridge/types.ts — existing shape, extended
export interface RawDeviceLog {
  deviceUserId: string;
  localTimestamp: string;         // verbatim, exactly as the device emitted it
  verifyMode?: string;
  state?: number;
  deviceRecordId?: string;        // NEW: device-native unique record id, when one exists (U4/T7)
  meta?: Record<string, unknown>; // raw line / block index / raw hex
}

export interface NormalizedDeviceEvent {
  deviceSerial: string;
  deviceUserId: string;
  localTimestamp: string;
  timestampUtc: string | null;    // NEW: null when unparseable, instead of throwing
  eventType: 'IN' | 'OUT' | 'UNKNOWN';
  verifyMode?: string;
  deviceRecordId?: string;
  sourceKind: 'usb_file' | 'lan_tcp' | 'lan_http' | 'adms_push' | 'mock';
  sourceRef?: string;
  raw: unknown;                   // NEW: the untouched original row
}
```

### 9.2 Processing rules

1. **Never discard.** Every raw row produces exactly one `device_events` row, whatever happens to it.
   `invalid`, `unmapped`, and `duplicate` are *statuses*, not reasons to drop data.
2. **Never throw out of a batch.** The existing `parseTextExport` behaviour — per-line `try/catch`,
   log and continue — is correct and is preserved (`scripts/sync-bridge/log-fetcher.ts`).
3. **Timestamp parse failure is not fatal.** Current `mapper.ts` *throws*
   (`normalizeTimestamp` → `Error('[mapper] cannot parse device timestamp')`), which aborts the whole
   run. Change to: store `event_timestamp_utc = NULL`, `processing_status = 'invalid'`, continue.
   `[CONFIRMED — required fix]`
4. **`raw_payload` is stored verbatim** as `jsonb` (`{ line, index, raw }` for text; `rawHex` for
   binary). This satisfies "preserve the original device event".
5. **Direction inference is isolated and total.** `inferDirection` keeps its precedence (`state` →
   `verifyMode` substring → default) but gains an explicit `'UNKNOWN'` outcome; a policy layer then
   decides how `UNKNOWN` maps (§10.2).
6. **Idempotent by construction.** The `device_events` insert is
   `ON CONFLICT (device_serial, event_fingerprint) DO NOTHING`. Re-running a sync is a no-op at the
   row level. `[CONFIRMED — the fix for in-memory-only dedupe]`
7. **Ordering independence.** Events are sorted by `event_timestamp_utc ASC` before the attendance
   pass, so a device that returns newest-first cannot produce a wrong "first IN of the day".

### 9.3 Parser hardening (file path)

Current `parseTextLine` returns `null` when `parts.length < 2`. Required additions, all still
dependency-free:

- Strip a UTF-8 BOM (`\uFEFF`) from the first line. `[CONFIRMED — currently unhandled; a BOM would
  corrupt the first `deviceUserId`]`
- Accept `\r\n`, `\n`, and a lone `\r`. `[CONFIRMED — `/\r?\n/` handles the first two only]`
- Tolerate a header row (`User ID,Date,Time,...`) by detecting and skipping a non-numeric first field.
- Preserve the raw line in `meta.raw` even when parsing fails, so it lands in `raw_payload`.
- Reject rows whose `deviceUserId` exceeds a sane length (e.g. 32 chars) rather than inserting
  unbounded strings into the DB.
- For binary: read `blockSize` from the device's documented record size once T4 confirms it; keep the
  40-byte default only as a fallback and keep the existing
  `buffer.length % blockSize !== 0` warning.
---

## 10. Attendance Processing

### 10.1 The one-sink rule

```
NormalizedDeviceEvent
   → resolve identity            (§8)
   → validate + clamp timestamp  (§10.3)
   → decide direction            (§10.2)
   → dedupe (DB unique)          (§11)
   → INSERT movement_logs        ← THE ONLY attendance write in the biometric path
```

Because `movement_logs` drives `campus_occupancy`, `daily_stats`, and `audit_logs` through existing
triggers, **no new attendance logic is written**. This is the reuse decision that keeps the diff small
and keeps H0201 punches visible in every existing screen (admin attendance, analytics, student
history, occupancy).

### 10.2 Direction policy (decide before coding — depends on T6)

| Policy | Rule | When to use |
| :--- | :--- | :--- |
| **A. Trust the device** (current `mapper.ts`) | `state 0 → IN`, `1 → OUT`, unknown → `IN` | Only if T6 proves the device emits meaningful IN/OUT |
| **B. Alternate (toggle)** | Read the user's `campus_occupancy.current_status` and flip it; unknown state → flip; no occupancy row → `IN` | Best when the device emits a single undifferentiated punch (common on cheap terminals) |
| **C. Session rule** | First punch of the calendar day → `IN`; later same-day punches → `OUT` | Fallback if neither A nor B is reliable |

**Recommended default: B, with C as the fallback when the user has no occupancy row.** Rationale:
`campus_occupancy` already exists and is already maintained by the trigger, so a toggle is consistent
with every other entry point into the system and degrades sensibly when the device gives no direction
data. Store the chosen policy per device so terminals can differ.

> Whichever is chosen must live in **one named function with the policy as a parameter**, not
> scattered conditionals, so switching after T6 is a one-line change.

### 10.3 Timestamp validation and clamping

| Condition | Action | `processing_status` |
| :--- | :--- | :--- |
| Unparseable | store `NULL`, keep raw | `invalid` |
| > 24 h in the future | reject; for the `movement_logs` write clamp to `now()` | `invalid` |
| > 1 year in the past (device clock reset) | accept but flag | `resolved` + `error_message = 'implausible timestamp'` |
| 0–24 h in the future (clock drift) | accept as `min(event, now())` | `resolved` |
| Repeat of an existing `(user, direction)` within ±2 s, **and no native record id** | treat as duplicate | `duplicate` |

**Rationale for the ±2 s window:** `event_fingerprint` (§11.2) already catches exact repeats. The
window is an *additional* guard for the realistic case where one physical punch is exported twice with
a formatting difference. It applies **only** when the device exposes no native record id (`U4`) —
otherwise it could suppress two genuinely distinct rapid punches.

### 10.4 Business rules to preserve

- `reason` is written as `'Regular'` (the existing sink's choice; satisfies the CHECK constraint and
  matches gate-scan defaults).
- `is_manual = false`, `is_correction = false` — a biometric punch is neither.
- `operator_id = NULL`, `operator_name = 'H0201 <serial>'` — the terminal is the actor, and
  `operator_name` accepts arbitrary text.
- Attendance **status** (`present`/`late`/`absent`) is **not** written. It stays derived at read time
  by `src/lib/integrations/attendance.ts` and the admin attendance page. Writing it would create the
  second attendance system the brief forbids.
- Manual corrections and admin overrides keep using the existing
  `is_correction`/`original_log_id`/`correction_reason` machinery and `ManualEntryDialog`. The
  biometric pipeline must not add a parallel correction path.
---

## 11. Idempotency & Deduplication

### 11.1 Why the current design is insufficient

`[CONFIRMED]` Today `mapper.ts` keeps a `Set<string>` of `deviceSerial::userId::tsUtc::direction`
**within a single `resolve()` call**, and `sink.ts` then does a plain `.insert()` into
`movement_logs`. Therefore:

- Worker restart mid-batch → rows re-fetched → **duplicate `movement_logs` rows**.
- A USB file imported twice by the admin → **duplicate rows**.
- A device that re-emits its last N records every poll (very common) → **N duplicates every 30 s**.

Each duplicate fires the three triggers, so `campus_occupancy` flips wrongly, `daily_stats` inflates,
and `audit_logs` fills with noise. This is the most damaging defect in the existing attempt.

### 11.2 Chosen strategy: `event_fingerprint` + DB unique index

Primary identity is the **device's own record id when available**, with a deterministic composite
otherwise:

```
event_fingerprint =
  deviceRecordId present
    ?  sha256( `${device_serial}|rec|${deviceRecordId}` )
    :  sha256( `${device_serial}|${device_user_id}|${event_timestamp_utc}|${rawPunchCode}` )
```

Enforced by `UNIQUE (device_serial, event_fingerprint)` on `device_events`, inserted with
`ON CONFLICT DO NOTHING`. This makes the import idempotent **at the database**, so no restart, retry,
concurrent run, or duplicate file can create a second copy. SHA-256 is in the Node standard library —
no dependency.

### 11.3 Collision and suppression risk analysis

| Scenario | With `deviceRecordId` | Without (composite) | Verdict |
| :--- | :--- | :--- | :--- |
| Byte-identical repeat (re-poll, re-import, restart) | suppressed ✓ | suppressed ✓ | correct |
| Two distinct punches, one user, same second, same code | **distinct** ✓ | **suppressed** ✗ | acceptable — a sub-second double-punch on one terminal is operationally meaningless, and §10.3 already treats it as one event |
| Two users punch in the same second | distinct ✓ | distinct ✓ | correct |
| Two *devices*, same user, same second | distinct ✓ (serial in key) | distinct ✓ | correct |
| Device clock reset then re-punch (same timestamp, different real time) | distinct ✓ | suppressed ✗ | **documented limitation** — admin sees `duplicate_count > 0` and can use a manual correction |
| Genuine IN then OUT inside one second | suppressed ✗ | suppressed ✗ | negligible — physically impossible for one person |

**Conclusion:** prefer the native record id everywhere (`T7` decides whether one exists). The
composite fallback is safe for the realistic threat (repeated import/poll) and its only failure mode
is suppressing physically-implausible rapid duplicates — it errs toward under-counting, which is
auditable, rather than toward double-counting, which silently corrupts occupancy. **This trade-off is
deliberate and must be re-validated after T7.**

### 11.4 Second layer: never double-write `movement_logs`

`device_events` is the dedupe gate, but the attendance write needs its own protection against a
partially-failed batch being retried. Two options; option 1 is recommended:

1. **Idempotency by `device_events` status (recommended).** The processor writes `movement_logs` only
   for rows it has just transitioned `pending`→`resolved`. Because the `device_events` insert is
   itself unique-guarded, a retry re-reads the row in its final status (`processed`) and skips it. No
   extra schema on `movement_logs`, no behaviour change to the existing scan path.
2. **A nullable dedupe column on `movement_logs`**
   (`device_event_id uuid UNIQUE REFERENCES device_events(id)`). Stronger, but touches the hottest
   table in the system. If chosen it **must** be nullable with no backfill so existing rows and the
   QR/WebAuthn path are untouched. Listed for completeness; not recommended for the first release.

### 11.5 Repeat-import safety checklist

- [x] Identical file SHA-256 → rejected before parsing (`uq_device_sync_runs_file` + route check).
- [x] Overlapping (not identical) file → per-event fingerprint rejects it.
- [x] Worker restart → fingerprint rejects it.
- [x] Two concurrent runs for the same device → advisory lock (§12.4) prevents interleaving.
- [x] Partial batch failure → succeeded rows keep `processed`; failed rows keep `error` and are
      retryable via "Reprocess failed events".
---

## 12. Timezone & Timestamp Handling

### 12.1 Current state `[CONFIRMED]`

| Layer | Representation | Evidence |
| :--- | :--- | :--- |
| Database | `timestamptz` everywhere (`movement_logs.timestamp`, `users.created_at`, …) | `supabase/schema.sql` |
| DB session TZ | **Not set anywhere.** Supabase defaults to UTC. | no `SET TIME ZONE` in any migration |
| Stat day boundary | `(NEW.timestamp AT TIME ZONE 'UTC')::date` | `update_daily_stats_on_movement()` |
| App "late" cutoff | `${date}T09:15:00.000Z` — i.e. **09:15 UTC**, not 09:15 IST | `src/lib/integrations/attendance.ts:38` |
| App day window | `gte(timestamp, \`${date}T00:00:00.000Z\`)`, `lte(… T23:59:59.999Z)` | same file |
| Display | `toLocaleTimeString("en-IN")` | `admin/attendance/page.tsx` |
| Worker | Optional shift only if `BIOMETRIC_DEVICE_TIMEZONE` is set; supports `ist`, `asia/kolkata`, `+05:30`; otherwise treats the device string as UTC | `mapper.ts` `convertFromTimeZone`, `selfcheck.ts` |
| Device | `[UNKNOWN]` — whether the H0201 stores naive local or UTC, and its NTP behaviour | T10/T9 |

### 12.2 The standard for this project

**`Asia/Kolkata` (UTC+05:30, no DST) is the single local timezone.** Decisions:

1. **Storage is always UTC `timestamptz`.** Unchanged from today. Never store a local timestamp in a
   naive column.
2. **`device_events` keeps both**: `event_timestamp_local` (the device's verbatim string — forensic
   evidence, never parsed twice) and `event_timestamp_utc` (the normalized instant used for logic).
   This dual tracking already exists in spirit in the worker (`timestampUtc` + `localTimestamp`) and
   is now made durable.
3. **`device_registry.timezone` is a per-device column defaulting to `'Asia/Kolkata'`.** A device
   installed elsewhere (or with a mis-set clock) is a configuration change, not a code change.
4. **The device is configured to IST in its own menu** as an ops step, recorded in the device
   acceptance test (T10). The pipeline then interprets device naive strings as IST.
5. **No DST handling.** India has none. `[CONFIRMED — no DST logic is required, and adding it would
   be over-engineering]`.
6. **Do not use `new Date('YYYY-MM-DD HH:mm:ss')`** for device strings. That constructor is
   implementation-defined for space-separated, zone-less input and in practice parses as local server
   time — which on Vercel is UTC and on a campus laptop may be IST. **This is the bug class currently
   latent in `parseDeviceTimestamp`.** The replacement is explicit, dependency-free, and total:

```ts
// scripts/sync-bridge/time.ts  (NEW FILE)
const IST_OFFSET_MINUTES = 330; // Asia/Kolkata, fixed; India observes no DST

/** Parse a device naive local string as IST. Returns null instead of throwing. */
export function parseDeviceLocalToUtc(raw: string, timezone = 'Asia/Kolkata'): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(raw.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const utcMs = Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s ?? '0'));
  if (Number.isNaN(utcMs)) return null;
  // Guard against JS Date silently rolling over impossible values (e.g. month 13).
  const probe = new Date(utcMs);
  if (probe.getUTCMonth() !== +mo - 1 || probe.getUTCDate() !== +d) return null;
  const offset = timezone === 'Asia/Kolkata' ? IST_OFFSET_MINUTES : 0;
  return new Date(utcMs - offset * 60_000);
}
```

This is the **only** place a device timestamp is converted. `mapper.ts` imports it; the file-import
route imports it. One implementation, one test.

### 12.3 Reporting-time correction

`[CONFIRMED — pre-existing bug, must be fixed deliberately, not incidentally]` The
`src/lib/integrations/attendance.ts` "late" cutoff of `09:15:00.000Z` is **09:15 UTC = 14:45 IST**.
Every late/present classification in that report is therefore wrong by 5 h 30 m. Two options:

- **Option 1 (recommended, small):** interpret the query date as an IST calendar day and convert the
  cutoff to UTC: day window `[date T00:00 IST → date T23:59:59.999 IST]` =
  `[date-1 T18:30Z → date T18:29:59.999Z]`; cutoff `09:15 IST` = `03:45Z`.
- **Option 2 (larger):** change the DL trigger and all analytics routes to an IST day boundary. This
  touches `daily_stats` and is **out of scope**.

**Rule for this project: fix the read-side (Option 1) in its own commit, flagged as a bug fix, not
bundled into the H0201 feature.** The H0201 work must not silently change existing attendance
numbers. Note it in the rollout notes (§20) so the change in reported late counts is expected and
explained.

### 12.4 Time-related operational rules

- **Sort before processing** by `event_timestamp_utc ASC` (§9.2 rule 7).
- **Clock drift:** record `device_registry.clock_drift_seconds` from T9. If `|drift| > 60 s`, surface
  a warning badge on the device page. Optionally, when drift is known, correct the event instant by
  the drift value — **do not** do this silently; store the correction in
  `device_events.error_message` or `device_sync_runs.metrics`.
- **One processor at a time per device.** Use a Postgres advisory lock
  (`SELECT pg_try_advisory_lock(hashtext(device_serial))`) or, more simply, an `INSERT … ON CONFLICT`
  guard on a `device_sync_runs` row with `status = 'running'`. Without this, two triggers of the same
  import could interleave. `[Cheap insurance; the `running`-row guard is one query]`
- **Server timestamp vs device timestamp:** the device timestamp is authoritative for the
  *movement*; `device_events.created_at` / `device_sync_runs.started_at` record server time. Never
  substitute server time for a missing device time — mark the event `invalid` instead.
---

## 13. Error Handling

Every failure mode below has a **defined destination row**. Nothing is dropped, nothing is silent.

| # | Failure | Detection | Handling | Visible where |
| :--- | :--- | :--- | :--- | :--- |
| E1 | Device unreachable (LAN) | `ECONNREFUSED` / `ETIMEDOUT` in adapter | `device_sync_runs.status='failed'` + `error_summary`; `device_registry.last_sync_status='failed'`, `consecutive_failure_count++`; no data mutated; retry next tick with back-off | Device page "Last sync failed"; `alerts` row after ≥5 consecutive failures |
| E2 | Worker crash mid-run | `device_sync_runs` stuck `running` | On next start, mark any `running` row older than 2× interval as `failed` with `error_summary='worker restarted'`; fingerprints make reprocessing safe | Sync history |
| E3 | Unmapped `device_user_id` | resolution returns none | `device_events.processing_status='unmapped'`; raw preserved; **no user created**; no `movement_logs` row | "Unmapped device users" panel with one-click map + reprocess |
| E4 | Mapped user not ACTIVE | `users.status !== 'ACTIVE'` | `'unmapped'` + `error_message='ACCOUNT_NOT_ACTIVE'` | Same panel, reason filter |
| E5 | Duplicate event | unique fingerprint conflict | `'duplicate'`, counted; **no write** | Sync run `duplicate_count` |
| E6 | Invalid / unparseable row | parser / validator | `'invalid'` + `error_message`; raw line kept in `raw_payload` | Failed-events table + CSV export |
| E7 | Invalid or implausible timestamp | §10.3 rules | `'invalid'` (unparseable / >24 h future) or `resolved` + flag (>1 yr past) | Failed-events table |
| E8 | `movement_logs` insert rejected (NULL `gate_id`, FK, CHECK) | PostgREST error | `'error'` + `error_message`; event retained and retryable | Failed-events table with "Retry" |
| E9 | Device has no bound gate | `device_registry.gate_id IS NULL` | **Import/sync refuses to start**: run created `status='failed'`, `error_summary='device has no gate_id'` | Device page shows a blocking config warning |
| E10 | Supabase unavailable | client throws | run `failed`; nothing written; retry next tick; no in-memory queue is attempted (no durability claim) | Sync history |
| E11 | `attendance_records` mirror fails (if kept) | upsert error | recorded in `error_count`, **does not fail the run** — `movement_logs` is the source of truth | Sync run `error_summary` |
| E12 | File too large / wrong type / malformed | route validation | `400`/`413`/`415` before any DB write | Upload dialog error |
| E13 | Same file re-uploaded | SHA-256 match | `200 { alreadyImported: true }`, no run created | Upload dialog info message |
| E14 | Partial batch failure | per-event try/catch | continue; succeeded rows stay `processed`; failures stay `error` + one "Reprocess failed events" button | Sync run summary |

### 13.1 Rules

1. **One failed event never aborts a batch.** Already true for parsing; extend to the write phase.
2. **Retry is idempotent by construction**, never by bookkeeping (§11).
3. **Every error has a message a non-engineer can act on.** `error_message` is user-facing prose
   ("device user 1042 is not mapped to any person"), not a stack trace. Stack traces go to the
   worker's stdout only.
4. **Never fail silently.** Today `sink.ts` records `movementLogErrors` into an array that is
   `console.log`ged and then discarded at process exit — that is a silent failure and it is explicitly
   replaced by persisted `error_message` / `error_summary`.
5. **No fake recovery.** Never create a placeholder user, never substitute `now()` for a missing
   device time, never invent a `gate_id`.
---

## 14. Security

### 14.1 Threat model in one line

The device is an unauthenticated-by-default appliance on the campus LAN whose output **creates
movement records for real people**. Both the data path in (device → DB) and the data path out
(DB → admin UI) are trust boundaries.

### 14.2 Network topology (required)

```
                 Campus LAN (VLAN, no inbound internet)
   ┌──────────────────┐        ┌──────────────────────────────┐
   │ H0201 terminal   │◄──────►│ Worker host (campus server / │
   │ 192.168.1.201    │  TCP   │ mini-PC, PM2/systemd)        │
   │ (no public IP)   │  4370  │  • outbound HTTPS to Supabase│
   └──────────────────┘        │  • NO inbound from internet  │
                               └──────────────┬───────────────┘
                                              │ HTTPS (service role)
                                              ▼
                                        ┌───────────┐
                                        │ Supabase  │ ◄── Vercel (Next.js admin UI)
                                        └───────────┘
```

**Hard rules:**

- **Never expose the H0201 to the public internet.** No port-forward, no DDNS, no reverse proxy, no
  "temporary" firewall rule. It has no meaningful authentication and no TLS.
- Device and worker share a **management VLAN**, or a host firewall rule limited to the worker's IP
  (`ufw allow from <worker-ip> to any port 4370`).
- The worker makes **outbound-only** connections (device on LAN, Supabase on 443).
- File import requires **no** network path to the device at all — another reason to ship it first.

### 14.3 Credentials

| Secret | Storage rule |
| :--- | :--- |
| `SUPABASE_SERVICE_ROLE_KEY` | Server/worker env only (`scripts/sync-bridge/.env.local`, `.env.local`). Never in a `NEXT_PUBLIC_*` var, never returned by an API, never logged. |
| Device comm key / password | **Never in the database.** `device_registry.credential_ref` stores the *name* of the env var; the value lives in the worker's env source. |
| API key for a future push endpoint | Generated with Node stdlib `randomBytes`, stored **hashed** (bcryptjs is already a dependency), shown once at creation. |

`[CONFIRMED — current state]` No device credentials exist in the repo.
`scripts/sync-bridge/.env.example` correctly contains only host/port/serial. **There is no credential
leak today**; the risk is introduced only if a comm key is added carelessly later.

### 14.4 Application-layer controls

- **Authentication:** every new route is wrapped in `withAuthorization(...)`. No exceptions.
- **Authorization:** `requiredRole: ["sysadmin"]` for device register/update/delete/config;
  `["sysadmin","admin"]` for read-only views, mapping writes, and file import. Mirrors the model
  applied to `integration_configs`.
- **RLS:** new tables use service-role-write / admin-read-only policies (§7.6).
- **Rate limiting:** `withRateLimit` on every route — sync trigger 6/min, import 4/10 min, mapping
  writes 30/min — using the existing `{ keyPrefix, maxRequests }` style.
- **Request validation:** explicit field allow-listing; reject unknown keys rather than passing them
  to PostgREST (blocks mass-assignment into new columns).
- **File upload validation:** extension allow-list (`.dat`, `.csv`, `.txt`), first-bytes MIME sniff,
  hard 5 MB cap enforced by reading the stream with a running length check, `blockSize` divisibility
  sanity check for binary. Reject **before** creating a `device_sync_runs` row.
- **Malicious file contents:** the parser is a plain string/byte splitter with per-line try/catch — no
  `eval`, no dynamic import, no archive extraction, no filesystem writes. Cap per-line length and
  total line count (e.g. 200 000) to stop a bomb-style payload.
- **SQL injection:** structurally impossible via the Supabase client (parameterized). The only raw SQL
  in the design is the advisory lock, keyed by a server-derived hash, not user input.
- **No PII in logs:** log `device_user_id` and counts, never names, rolls, or full `raw_payload`.

### 14.5 Audit

- Every admin action on the new surface writes an `audit_logs` row via the existing
  `logAuditEvent()` (`src/lib/audit.ts`). New `AuditAction` literals:
  `DEVICE_REGISTERED`, `DEVICE_UPDATED`, `DEVICE_DISABLED`, `DEVICE_SYNC_TRIGGERED`,
  `DEVICE_FILE_IMPORTED`, `DEVICE_USER_MAPPED`, `DEVICE_USER_UNMAPPED`, `DEVICE_EVENTS_REPROCESSED`.
- **Plus** the free DB-side audit: every accepted punch already produces a `MOVEMENT_CREATED` row via
  `create_audit_log_on_movement()`, so `operator_name = 'H0201 <serial>'` makes biometric punches
  distinguishable from operator scans in the existing audit viewer.
- **Biometric data note:** no fingerprint templates, images, or hashes ever leave the device.
  `device_user_id` is an opaque number. `users.thumbprint_hash` (WebAuthn) is unrelated and untouched.
  The integration is a *counting* integration, not an *identity-storage* one.
---

## 15. Admin UI

### 15.1 Principle

Only build what the chosen integration method requires. Because the file-import path is the one that
can ship first, and because the LAN path shares the same data model, **one device page serves both**.
No new UI framework: reuse `src/components/ui/{card,button,table,tabs,modal,badge,input,select}.tsx`,
the existing page layout in `src/app/(sysadmin)/sysadmin/*`, `useLiveRefresh`, `getAuthHeaders()`,
and the `BulkUserImportModal` pattern for uploads.

### 15.2 Screens

| Screen | Route | Contents | Justified by |
| :--- | :--- | :--- | :--- |
| Devices list | `/sysadmin/devices` | Table: name, serial, model, bound gate, connection type, status, last sync (relative), last sync result, unresolved count. Actions: "Register Device", "Import File" | Phase 10 |
| Device detail | `/sysadmin/devices/[id]` | Tabs: **Status** (identity, gate binding, last sync, drift warning, consecutive failures), **Sync history**, **Failed events** (`invalid`/`unmapped`/`error` + retry), **Mappings**, **Unmapped users** (inline map action) | Phase 10, §6.4 |
| Register / edit | modal on the list page | serial, name, model, connection type, gate select (from `gates`), IP/port (LAN only), timezone, notes. **Gate required to enable.** | §7.1 |
| Import file | modal → `POST /api/devices/[id]/import` | file picker, drag-drop, 5 MB hint, progress, run summary | §6.1 |
| Mapping manager | tab on device detail | search users by `unique_id`/name; list active + inactive mappings; deactivate (never delete) | §8.3 |

### 15.3 Explicitly NOT built

- No live punch ticker / realtime stream — not justified while the device is poll/import based, and
  `campus_occupancy` already gives live presence.
- No device firmware/config management.
- No separate "attendance by device" report — the admin attendance page already reads
  `movement_logs` and will show biometric punches automatically.
- No new navigation framework; add entries to the existing sysadmin sidebar config
  (`src/hooks/useNavigation.ts` + `src/components/shared/Sidebar.tsx`).

### 15.4 Reuse checklist

| Need | Reuse | Do not create |
| :--- | :--- | :--- |
| Tables | `src/components/ui/table.tsx` | a new grid lib |
| Modal | `src/components/ui/modal.tsx` | a new dialog lib |
| Toasts | `src/components/ui/toast.tsx` | — |
| Auth headers | `getAuthHeaders()` (`src/lib/utils.ts`) | — |
| Auto-refresh | `useLiveRefresh(load, { intervalMs })` | polling code |
| CSV export | the `rows.join(",")` + `Blob` pattern from `UserAnalytics.tsx` / `src/lib/export.ts` | an xlsx dependency |
| File upload UX | `BulkUserImportModal.tsx` structure | — |
---

## 16. API Contracts

All routes follow the observed conventions exactly:
`withRateLimit(withAuthorization(handler, { requiredRole }), { keyPrefix, maxRequests })`,
identity read only from `x-user-id` / `x-user-role`, and the envelope
`{ success: true, data }` / `{ success: false, error: { code, message } }`.

**Common to all routes:** `401 UNAUTHORIZED` (missing/invalid bearer or session mismatch),
`403 FORBIDDEN` (wrong role), `403 ACCOUNT_INACTIVE`, `500 INTERNAL_ERROR`. All produced by the
existing middleware, not by new code.

### 16.1 `POST /api/devices` — register a device

- **Auth:** `["sysadmin"]` · **Rate limit:** 10/min · **Idempotency:** `device_serial` UNIQUE; a
  duplicate returns `409 DEVICE_EXISTS`, not a second row.
- **Request:**
  ```json
  { "deviceSerial": "1241920440010", "deviceName": "Main Gate H0201",
    "vendor": "SBTS", "model": "H0201", "gateId": "<uuid>",
    "connectionType": "usb_file", "ipAddress": null, "port": null,
    "timezone": "Asia/Kolkata", "notes": "Installed 2026-09" }
  ```
- **Validation:** `deviceSerial` 1–64 chars `^[A-Za-z0-9._:-]+$`; `deviceName` 1–120;
  `connectionType` ∈ enum; `gateId` must exist in `gates` **when `connectionType` is a LAN type**;
  `ipAddress` must parse as an IPv4/IPv6 literal; `port` 1–65535.
- **Response `201`:** `{ success: true, data: { id, deviceSerial, status: "UNKNOWN" } }`
- **Side effects:** `audit_logs` `DEVICE_REGISTERED`. **Never** accepts or returns a credential.

### 16.2 `GET /api/devices` — list devices

- **Auth:** `["sysadmin","admin"]` · **Rate limit:** 60/min
- **Response:** each device joined with `gates(name, gate_code)` plus derived `lastSyncAt`,
  `lastSyncStatus`, `unresolvedEventCount`, `failedEventCount`, `mappingCount`.
- **No pagination initially** — a campus has a handful of terminals. Add `limit`/`offset` only past
  ~50 rows. `[Deliberate simplification; upgrade path is a range query]`

### 16.3 `GET /api/devices/[id]` — one device

- **Auth:** `["sysadmin","admin"]` · **Response:** the device row + last 10 `device_sync_runs` +
  counts by `processing_status`. `404 DEVICE_NOT_FOUND` for an unknown id.

### 16.4 `POST /api/devices/[id]/sync` — trigger a sync

- **Auth:** `["sysadmin","admin"]` · **Rate limit:** 6/min
- **Behaviour depends on connection type:**
  - `usb_file` → `409 USE_FILE_IMPORT` (there is no pull to trigger).
  - LAN types → **enqueue a request the worker picks up** (recommended, and the only option that works
    from Vercel): insert a `device_sync_runs` row with `trigger_mode='manual'`, `status='running'`,
    `metrics = { requestedBy, requestedAt }`; the worker polls for such rows and executes. The UI
    shows "requested" until the worker updates the row.
  - **Rejected alternative:** the Next.js route talking to the LAN device directly. Vercel cannot
    reach it; a self-hosted Next.js could, but that would put the device protocol in the web tier.
    Not recommended.
- **Response `202`:** `{ success: true, data: { runId, status: "requested" } }`
- **Side effects:** `audit_logs` `DEVICE_SYNC_TRIGGERED`.

### 16.5 `POST /api/devices/[id]/import` — import an attendance file

- **Auth:** `["sysadmin","admin"]` · **Rate limit:** 4 per 10 min · **Content-Type:**
  `multipart/form-data`, field `file`.
- **Validation & errors:** `400 BAD_REQUEST` (no file), `400 EMPTY_FILE`, `413 FILE_TOO_LARGE` (>5 MB),
  `415 UNSUPPORTED_FILE_TYPE`, `409 DEVICE_HAS_NO_GATE`.
- **Idempotency:** identical SHA-256 for the device →
  `200 { success: true, data: { alreadyImported: true, runId: <original> } }`.
- **Response `200`:** `{ success: true, data: { runId, rawCount, insertedCount, duplicateCount,
  unmappedCount, invalidCount, errorCount } }`
- **Side effects:** `device_sync_runs` + `device_events` (+ `movement_logs` via the shared processor)
  + `audit_logs` `DEVICE_FILE_IMPORTED`.
- **Partial success is still `200`.** A run with `invalidCount > 0` is a valid, reported outcome, not
  an HTTP error — the report table is the contract.

### 16.6 `GET /api/devices/[id]/sync-history`

- **Auth:** `["sysadmin","admin"]` · **Query:** `limit` (default 25, max 100).
- **Response:** `device_sync_runs` rows, newest first, with all counters.

### 16.7 `GET /api/devices/[id]/events`

- **Auth:** `["sysadmin","admin"]` · **Query:** `status` (comma list), `from`, `to`, `deviceUserId`,
  `limit` (default 100, max 500), `offset`, `includeRaw` (default `false`).
- **Response:** `device_events` rows, newest first. `raw_payload` is **omitted** unless
  `includeRaw=true` — keeps list responses small and avoids spreading raw device data unnecessarily.

### 16.8 `POST /api/devices/[id]/events/reprocess`

- **Auth:** `["sysadmin","admin"]` · **Rate limit:** 4/10 min
- **Request:** `{ "statuses": ["unmapped","error","invalid"], "deviceUserId": "1042" }` (last field
  optional).
- **Behaviour:** re-runs resolution + validation for the selected events. Events already `processed`
  are never re-run (idempotency §11.4). Returns the same summary shape as import.
- **Primary use case:** admin maps device user `1042` → student, then clicks "Reprocess".
- **Side effects:** `audit_logs` `DEVICE_EVENTS_REPROCESSED`.
### 16.9 `GET /api/device-users/mappings`

- **Auth:** `["sysadmin","admin"]` · **Query:** `deviceSerial`, `isActive`, `search`, `limit`.
- **Response:** mapping rows joined with `users(name, unique_id, role, status)`.

### 16.10 `POST /api/device-users/mappings`

- **Auth:** `["sysadmin"]` · **Rate limit:** 30/min · **Idempotency:** `(device_serial,
  device_user_id)` UNIQUE.
- **Request:** `{ "deviceSerial": "…", "deviceUserId": "1042", "userId": "<uuid>",
  "enrolledAt": "2026-09-17T04:00:00Z", "notes": "…" }`
- **Validation:** device must exist and be active; `userId` must exist in `users`; `deviceUserId`
  1–32 chars.
- **Errors:** `409 MAPPING_EXISTS` (same pair), `409 MAPPING_CONFLICT` (same user already active on
  the same device — the §7.4 index), `404 DEVICE_NOT_FOUND`, `404 USER_NOT_FOUND`.
- **Response `201`:** `{ success: true, data: { id } }`
- **Side effects:** `audit_logs` `DEVICE_USER_MAPPED`.

### 16.11 `PATCH /api/device-users/mappings/[id]` — deactivate / re-point

- **Auth:** `["sysadmin"]` · **Request:** `{ "isActive": false }` (or `userId` to re-point).
- **Behaviour:** deactivation is `is_active = false`, **never a delete** — historical events must keep
  resolving for audit. `device_user_id` is immutable; re-enrolment creates a new row.

### 16.12 `POST /api/device-users/mappings/bulk` — CSV roster import

- **Auth:** `["sysadmin"]` · **Request:** `multipart/form-data` with `deviceSerial` + `file`
  (columns `device_user_id,unique_id`). **Response:** `{ created, skipped, failed: [{ row, reason }] }`
- **Behaviour:** resolves `unique_id` → `users.id`; an unknown `unique_id` is a *failure row*, never a
  new user.

### 16.13 `POST /api/devices/[id]/heartbeat` (worker-facing; future push/ADMS only)

- **Auth:** a device-scoped hashed API key (`Authorization: Device <key>`), **not** a user session.
  Documented so a future ADMS push path has a defined contract; **not built in this release** because
  the device's push capability is `[UNKNOWN]` (U2).
- **Behaviour:** accepts a batch of raw punches, writes `device_events` exactly as the import path
  does, returns the same run summary. Idempotent via the same fingerprint.

---

## 17. Logging & Observability

### 17.1 The admin question

> "Why did this student's attendance not appear?"

It must be answerable **without opening server logs**. The pipeline is therefore observable at each
stage, and each stage's counter is persisted:

```
Device ──► Sync ──► Import ─► Parse ──► Mapping ──► Attendance ──► movement_logs
   │         │         │          │          │             │
   │    sync_runs   sync_runs   device_events  device_events  device_events
   │    file_sha    raw_count   invalid       unmapped       processed
   │                                        (has reason)   (has log id)
   └─ device_registry.last_sync_*
```

### 17.2 Decision tree the UI must support

| Admin sees | Look up | Meaning |
| :--- | :--- | :--- |
| No run at all for the day | `device_sync_runs` | Device was never synced/imported — operational issue |
| Run `failed` | `error_summary` | Device unreachable / no gate / Supabase down |
| Run ok, `unmapped_count > 0` | `device_events` where `processing_status='unmapped'` | Fingerprint enrolled on device but no mapping row — **the most common real cause** |
| Run ok, `invalid_count > 0` | `device_events` where `='invalid'` | Malformed rows / bad timestamps |
| Event `processed`, but no attendance shown | `device_events.movement_log_id` → `movement_logs.timestamp` | Likely a **reporting-window** issue (the UTC/IST boundary bug, §12.3), not an ingestion issue |
| Event `error` | `error_message` | DB rejection (e.g. gate not bound) |

### 17.3 Counters (all persisted on `device_sync_runs`)

`raw_count`, `resolved_count`, `inserted_count`, `duplicate_count`, `unmapped_count`,
`invalid_count`, `error_count`, `duration_ms`, plus `device_registry.last_sync_at`,
`last_sync_status`, `consecutive_failure_count`.

### 17.4 Health surfacing

- **Device list** shows a status pill: `ONLINE` (last sync success < 2× interval),
  `DEGRADED` (success but errors/unmapped > 0), `OFFLINE` (failed or stale), `UNKNOWN` (never synced).
- **`/api/health`** (`src/app/api/health/route.ts` exists) can be extended later with a device-check
  summary; **do not** make the app health endpoint depend on the device — Vercel cannot see it.
- **Alerts:** ≥5 consecutive failures, or unmapped-event count over a threshold, inserts an `alerts`
  row (`severity='high'`) which the existing alerts UI already renders.
- **Worker stdout** keeps the current one-line summary (it is useful when someone *is* on the box) but
  is now backed by durable rows. Structured JSON logging is **not** introduced — no logger dependency
  is justified (Phase 18).

### 17.5 What is deliberately not built

No Prometheus/Grafana/OpenTelemetry. The counters above answer every operational question this
deployment generates. `[Deliberate simplification; the upgrade path is to emit the same counters to a
metrics endpoint if the campus ever centralises monitoring]`
---

## 18. Testing Strategy

### 18.1 Constraint and decision `[CONFIRMED]`

`package.json` has **no unit-test runner** and no Jest/Vitest config. The repo's existing testing
pattern for pure logic is `scripts/sync-bridge/selfcheck.ts`: plain `assert`, `try/catch` at the
bottom, `process.exit(1)` on failure, run manually with `node`. **That pattern is extended, not
replaced.** No vitest/jest dependency is added — Phase 18 forbids unjustified dependencies and the
Node standard library covers this entirely.

**Recommended wiring (small, reversible):**

```jsonc
// package.json — one script
"test:sync": "node scripts/sync-bridge/selfcheck.ts"
```

Node 20+ runs `.ts` directly only with a loader; if the deployment host's Node does not, the options
are (a) `npx tsx`, or (b) keep `selfcheck.ts` as the single runnable check and extend it. **Decide at
implementation time from the actual Node version — do not add a build step.**

### 18.2 Test matrix

#### Parser (`log-fetcher.ts`, `time.ts`)

| # | Case | Expectation |
| :--- | :--- | :--- |
| P1 | Valid CSV `101,2026-09-13 09:00:00,fp,0` | 1 event, correct fields |
| P2 | Valid tab and pipe delimited | Same result as comma |
| P3 | Binary `ATTLOG`, exact block multiple | N events, no trailing-bytes warning |
| P4 | Binary with trailing partial block | N events, warning logged, no crash |
| P5 | Malformed line mid-file (`BADLINE`) | Skipped, others parsed (existing behaviour, keep) |
| P6 | Missing optional fields (`101,<ts>`) | Parsed with `verifyMode`/`state` undefined |
| P7 | Unexpected extra fields | Ignored, not appended to another field |
| P8 | UTF-8 BOM on first line | First `deviceUserId` clean (**new fix**) |
| P9 | CRLF and lone-CR line endings | Parsed correctly (**new fix**) |
| P10 | Header row present | Skipped, not treated as an event |
| P11 | `deviceUserId` > 32 chars | Rejected as invalid |
| P12 | Empty / whitespace-only file | 0 events, no crash |
| P13 | 200 001 lines | Rejected by the line cap, no OOM |

#### Identity mapping

| # | Case | Expectation |
| :--- | :--- | :--- |
| M1 | Mapped, active, ACTIVE user | `resolved` → `movement_logs` row |
| M2 | No mapping row | `unmapped`, no user created, raw preserved |
| M3 | Mapping row `is_active = false` | `unmapped` |
| M4 | Duplicate mapping rows | Impossible by UNIQUE; code asserts and reports `CONFIG_ERROR` instead of picking one |
| M5 | Mapped user `status = 'DISABLED'` | `unmapped` + `ACCOUNT_NOT_ACTIVE` |
| M6 | Mapped user `status = 'SUSPENDED'` | Same as M5 |
| M7 | `device_user_id` matches on a *different* device serial | `unmapped` (serial is part of the key) |

#### Attendance

| # | Case | Expectation |
| :--- | :--- | :--- |
| A1 | First punch of the day | One `movement_logs` row, occupancy set |
| A2 | Repeated identical punch | Exactly one row (fingerprint) |
| A3 | IN then OUT | Two rows, direction per chosen policy |
| A4 | Same file imported twice | Second run `duplicate_count = N`, `inserted_count = 0` |
| A5 | Events out of order (newest first in file) | Sorted; final occupancy correct |
| A6 | Same user on two devices, same second | Two distinct rows (serial in key) |
| A7 | Punch with no bound gate | `error`, `movement_logs` untouched |
| A8 | Punch for LOCKED user | `unmapped`, no row |
| A9 | 500-event file with 1 bad line | 499 processed, 1 `invalid`, run `success` |
#### Time

| # | Case | Expectation |
| :--- | :--- | :--- |
| T1 | `2026-09-13 09:00:00` IST device string | `2026-09-13T03:30:00.000Z` |
| T2 | Naive string when device TZ is UTC | Pass-through |
| T3 | `2026-02-30 10:00:00` | `invalid` (rollover guard) |
| T4 | `not-a-date` | `invalid`, `event_timestamp_utc = NULL` |
| T5 | 48 h in the future | `invalid` |
| T6 | 2 h in the future (drift) | `resolved`, clamped for the write |
| T7 | 2 years in the past | `resolved` + flag |
| T8 | Event at 23:45 IST | Stored UTC correctly; the IST-day report includes it (guards §12.3) |

#### Sync (network path; mock adapter until T1–T7)

| # | Case | Expectation |
| :--- | :--- | :--- |
| S1 | Successful pull | Counters correct, `last_sync_at` set |
| S2 | Device offline (`ECONNREFUSED`) | Run `failed`, data untouched, `consecutive_failure_count++` |
| S3 | Timeout | Same as S2 with a timeout message |
| S4 | Partial failure (1 of 3 batches) | Run `partial`, succeeded events `processed` |
| S5 | Retry after failure | No duplicates (fingerprint) |
| S6 | Repeated sync, unchanged device data | `inserted_count = 0`, `duplicate_count = N` |
| S7 | Two concurrent runs for one device | Second refuses (advisory lock / `running` guard) |
| S8 | Worker restart with a stuck `running` row | Reaped to `failed` with the documented message |

#### Security

| # | Case | Expectation |
| :--- | :--- | :--- |
| X1 | Unauthenticated call to each new route | `401` |
| X2 | `admin` calling a sysadmin-only route | `403` |
| X3 | `operator` calling any device route | `403` |
| X4 | Upload 6 MB file | `413`, before any DB write |
| X5 | Upload `.exe` | `415` |
| X6 | File whose lines are 1 MB long | Rejected by the line-length cap |
| X7 | Binary file claiming to be CSV | Sniffed and rejected, or parsed without crash |
| X8 | Grep every new route + worker file for `SERVICE_ROLE` in a `NEXT_PUBLIC_` var or a response body | None present |
| X9 | `credential_ref` API round-trip | Only the env-var name is ever returned |
| X10 | `GET /events` without `includeRaw` | No `raw_payload` in the body |

### 18.3 Checks left behind (lazy-but-finished rule)

- `scripts/sync-bridge/selfcheck.ts` — extended to cover P1–P12, M1–M7 (pure parts), A1/A2/A4 (pure
  parts) and **T1–T8** against the new `time.ts`. One command, no fixtures, no framework.
- **One DB-backed integration check** for the fingerprint / `ON CONFLICT` path, because that is the
  load-bearing guarantee and cannot be proven in a pure function. Smallest viable form: a script
  (`scripts/verify-device-pipeline.ts`) that inserts the same logical event twice into `device_events`
  with the service client, asserts the second insert affects 0 rows, then cleans up. Mirrors the
  existing `scripts/verify-supabase-migrations.ts` style.

> **Honest limitation:** this plan does not claim the integration works. Until the
> `[REQUIRES DEVICE TEST]` items in §4.5 are executed, no test against real device output exists and
> the TCP adapter remains a stub. The self-check proves the *pipeline contracts*, not device
> compatibility.

---

## 19. Migration Strategy

### 19.1 Order (strictly additive)

```
1. CREATE device_registry, device_events, device_sync_runs        (new tables only)
2. ADD nullable columns to device_user_mappings                   (no backfill, no rewrite)
3. ADD nullable movement_logs.device_serial, movement_logs.source (no backfill, no rewrite)
4. ENABLE RLS + service_role/admin policies on the three new tables
5. (Conditional) resolve attendance_records per §7.7
6. Deploy Next.js (new routes + UI)      — safe before any data exists
7. Deploy the worker with the FILE adapter only
8. Register a device, bind a gate, map test users
9. Import a real exported file — dry run
10. Enable the LAN adapter only after T1–T7
```

Each step is independently reversible, and none can alter an existing row.

### 19.2 Backwards compatibility

| Concern | Guarantee |
| :--- | :--- |
| Existing `movement_logs` rows | Untouched; new columns are `NULL` for all of them |
| Existing QR/WebAuthn scan path (`/api/gate/scan`, `src/lib/db.ts`) | Untouched; no signature change, no new required field |
| Existing triggers | Untouched; biometric inserts simply fire them like any other insert |
| Existing reports (`attendance.ts`, `/api/gate/logs`, analytics, admin attendance) | Read the same columns as today; new punches appear automatically, tagged only by nullable columns they can ignore |
| `device_user_mappings` consumers (`mapper.ts`) | `select('device_user_id, user_id, is_active')` still works; new columns are additive |
| RLS | No existing policy is dropped or modified |
| `schema.sql` | Not edited (§7.8), so fresh-database bootstrap is unchanged |

### 19.3 Feature flags

Two flags, both server-side env, both defaulting to **off**:

- `BIOMETRIC_INGEST_ENABLED` (worker) — when false the worker logs one line and exits immediately.
  Protects against a stray worker writing punches during a maintenance window.
- `BIOMETRIC_LAN_ADAPTER_ENABLED` (worker) — gates the network path independently of the file path.

**No flag gates the file import**, because it is admin-initiated, audited, and reversible by deleting
the run's events if ever needed.

### 19.4 Data preservation

- Raw events are never deleted by any code path in this design.
- Retention, if ever required, is a scheduled job on `device_events` older than N months with
  `processing_status='processed'` — **out of scope now**, and must be a deliberate audited decision
  because it destroys the forensic trail.
- Deactivating a mapping never deletes history.
- Deleting a device is `is_active = false` + `status='DISABLED'`, **never a row delete** (the FK would
  cascade to `device_events`, destroying the trail). Soft-delete only.
---

## 20. Deployment Strategy

### 20.1 Topology

| Component | Where | How |
| :--- | :--- | :--- |
| Next.js app | **Vercel** (existing) | unchanged deploy flow (`vercel.json`, `prebuild` env validation) |
| Database | **Supabase Cloud** (existing) | migrations applied via SQL editor / CLI |
| Worker (file + LAN adapters) | **Campus host** (server or mini-PC on the device LAN) | PM2 / systemd / Docker with restart policy |
| H0201 terminal | **Campus LAN** (e.g. `192.168.1.201`) | no inbound internet; firewall limited to the worker IP |

### 20.2 Worker options (all already allowed by the existing README)

```ini
# /etc/systemd/system/h0201-bridge.service
[Unit]
Description=SBTS H0201 Sync Bridge
After=network-online.target

[Service]
WorkingDirectory=/opt/gate-monitor
ExecStart=/usr/bin/node scripts/sync-bridge/index.ts
EnvironmentFile=/opt/gate-monitor/scripts/sync-bridge/.env.local
Restart=always
RestartSec=10
User=gatebridge

[Install]
WantedBy=multi-user.target
```

```bash
# or PM2
pm2 start scripts/sync-bridge/index.ts --name h0201-bridge --time
pm2 save && pm2 startup
```

**Never deploy the worker to Vercel.** Serverless functions cannot hold a 30 s poll loop and cannot
reach the campus LAN; the existing README already says this explicitly.

### 20.3 Environment variables

**Worker** (`scripts/sync-bridge/.env.local`, never committed):

```bash
SUPABASE_URL=…                 # worker uses the non-public name (existing convention)
SUPABASE_SERVICE_ROLE_KEY=…
BIOMETRIC_DEVICE_SERIAL=1241920440010
BIOMETRIC_DEVICE_HOST=192.168.1.201
BIOMETRIC_DEVICE_PORT=4370
BIOMETRIC_DEVICE_TIMEZONE=Asia/Kolkata   # NEW — must be explicit, not empty
SYNC_INTERVAL_MS=30000
BIOMETRIC_INGEST_ENABLED=false           # NEW — flip to true at cutover
BIOMETRIC_LAN_ADAPTER_ENABLED=false      # NEW — flip only after T1–T7
USE_FAKE_DEVICE_LOGS=false               # must be false anywhere real
```

> `[CONFIRMED — required fix]` `USE_FAKE_DEVICE_LOGS=true` writes two synthetic punches into
> `movement_logs` every 30 s, corrupting occupancy, daily stats, and audit. It must be `false` in
> every non-dev environment, and the worker must **refuse to start** when
> `BIOMETRIC_INGEST_ENABLED=true` **and** `USE_FAKE_DEVICE_LOGS=true` at the same time. That single
> guard is the highest-value line in this entire plan.

**App / Vercel:** no new required variable. No device credential is ever placed in a
`NEXT_PUBLIC_*` var.

### 20.4 Migration ordering across environments

1. Dev/local Supabase → apply migrations → run the self-check → import a synthetic file.
2. Staging (if used) → identical.
3. Production → apply migrations (tables are inert until a device row exists) → deploy the Next.js UI
   (the devices page shows an empty list, harmless) → start the worker with ingest **disabled** →
   register + map → import a real export → reconcile counts against the vendor tool → enable ingest.
4. Only then evaluate the LAN adapter.

### 20.5 Cutover checklist

- [ ] Migrations applied; the three tables exist with RLS enabled
- [ ] `attendance_records` question (U10) resolved
- [ ] Vercel deploy green; `/sysadmin/devices` loads empty
- [ ] Worker running, `BIOMETRIC_INGEST_ENABLED=false`, idling cleanly
- [ ] Device row registered with a bound gate
- [ ] Test users mapped; a deliberate IN and OUT punch verified end-to-end in the admin UI
- [ ] Re-import of the same file yields `alreadyImported` (or `duplicate_count = N`)
- [ ] `movement_logs` row delta == expected inserted count (no double count)
- [ ] Occupancy and daily stats delta matches expectation
- [ ] Audit log shows `MOVEMENT_CREATED` with `operator_name='H0201 …'`
- [ ] Rollback rehearsed (§21)

---

## 21. Rollback Strategy

| Failure after | Rollback | Data impact |
| :--- | :--- | :--- |
| Migration applied, nothing else | Drop the three new tables; drop the added columns. No other object references them. | None |
| UI deployed | Revert the Vercel deployment (existing standard flow). Routes stop being reachable. | None |
| Worker running | `systemctl stop` / `pm2 stop`, or set `BIOMETRIC_INGEST_ENABLED=false`. | None; written `device_events` remain |
| Bad punches already written to `movement_logs` | Targeted cleanup: `DELETE FROM movement_logs WHERE source='biometric_h0201' AND timestamp BETWEEN …`, then recompute `campus_occupancy` from the last remaining movement per user and rebuild `daily_stats` with the existing `scripts/backfill-daily-stats.js` | Only biometric rows in the stated window; operator/QR rows untouched |
| Wrong direction policy | Fix the single policy function, disable ingest, delete affected `movement_logs` rows, reprocess from `device_events` | Contained and reversible **because raw events were kept** |
| Wrong timezone interpretation | Same as above — delete affected rows, fix `time.ts`, reprocess from `device_events` | Contained |
| Suspected credential exposure | Rotate `SUPABASE_SERVICE_ROLE_KEY` in Supabase + Vercel + worker env; rotate the device comm key; redeploy | None |

**The rollback superpower:** because `device_events` holds every raw punch with a deterministic
fingerprint, *any* processing bug is fixable by re-running the processor over stored events. Attendance
can be rebuilt from the raw trail. This is the single most important reason the raw store is
non-negotiable.

### 21.1 What cannot be rolled back

- Deleting a `device_registry` row cascades to `device_events` → the raw trail is destroyed.
  **Therefore device deletion is soft-delete only** (§19.4).
- Any manual correction an admin applied on top of a biometric row. Documented; not automated.
---

## 22. File-Level Implementation Plan

Paths that exist today are marked `MODIFY`. Everything else is `NEW FILE`. App paths use the existing
`@/*` alias convention.

```text
DATABASE  (apply in this order)
  NEW FILE  supabase/migrations/20260918000000_device_registry.sql
  NEW FILE  supabase/migrations/20260918000001_device_events_and_sync_runs.sql
  NEW FILE  supabase/migrations/20260918000002_device_pipeline_rls.sql
  NEW FILE  supabase/migrations/20260918000003_device_mapping_and_log_columns.sql

WORKER  (scripts/sync-bridge/ — the LAN-capable process)
  NEW FILE  scripts/sync-bridge/time.ts                ← parseDeviceLocalToUtc(), IST; the only TZ parser
  NEW FILE  scripts/sync-bridge/device-store.ts        ← device_events / sync_runs persistence + counters
  NEW FILE  scripts/sync-bridge/processor.ts           ← normalize → resolve → validate → dedupe → movement_logs
  NEW FILE  scripts/sync-bridge/h0201-file-adapter.ts  ← ATTLOG/CSV → RawDeviceLog[]   (ships first)
  NEW FILE  scripts/sync-bridge/h0201-lan-adapter.ts   ← TCP 4370 (BLOCKED until T1–T7)
  NEW FILE  scripts/sync-bridge/registry.ts            ← loads device config from device_registry
  MODIFY    scripts/sync-bridge/types.ts               ← deviceRecordId, source kind, raw, NormalizedDeviceEvent
  MODIFY    scripts/sync-bridge/log-fetcher.ts         ← BOM/CR/header handling, raw preservation,
                                                         no throw on bad timestamp, 'UNKNOWN' direction
  MODIFY    scripts/sync-bridge/mapper.ts              ← delegate to processor.ts; drop in-memory-only
                                                         dedupe; never throw on one bad row
  MODIFY    scripts/sync-bridge/sink.ts                ← gate_id/gate_name from device_registry, persist
                                                         errors, stop discarding device provenance,
                                                         make the attendance_records mirror optional
  MODIFY    scripts/sync-bridge/index.ts               ← honour BIOMETRIC_INGEST_ENABLED, refuse
                                                         fake+real ingest together, back-off,
                                                         pick up manual runs, reap stale 'running' rows
  MODIFY    scripts/sync-bridge/selfcheck.ts           ← extend to the §18.2 P/M/A/T matrix
  MODIFY    scripts/sync-bridge/README.md              ← real operations runbook
  MODIFY    scripts/sync-bridge/.env.example           ← timezone + the two new flags
  NEW FILE  scripts/verify-device-pipeline.ts          ← the one DB-backed idempotency check

APP — API ROUTES  (src/app/api/)
  NEW FILE  src/app/api/devices/route.ts                        ← POST create, GET list
  NEW FILE  src/app/api/devices/[id]/route.ts                   ← GET one, PATCH update, DELETE (soft)
  NEW FILE  src/app/api/devices/[id]/import/route.ts            ← file upload + parse + run
  NEW FILE  src/app/api/devices/[id]/sync/route.ts              ← enqueue a manual run
  NEW FILE  src/app/api/devices/[id]/sync-history/route.ts      ← GET runs
  NEW FILE  src/app/api/devices/[id]/events/route.ts            ← GET events (status filter)
  NEW FILE  src/app/api/devices/[id]/events/reprocess/route.ts  ← POST reprocess
  NEW FILE  src/app/api/device-users/mappings/route.ts          ← GET, POST
  NEW FILE  src/app/api/device-users/mappings/[id]/route.ts     ← PATCH deactivate / re-point
  NEW FILE  src/app/api/device-users/mappings/bulk/route.ts     ← CSV roster import

APP — SHARED LIBRARY  (src/lib/)
  NEW FILE  src/lib/device-types.ts  ← Device, DeviceEvent, SyncRun, Mapping TS types
  NEW FILE  src/lib/device-ingest.ts ← the file-path entrypoint shared by import/reprocess routes
  NEW FILE  src/lib/device-time.ts   ← app-side IST parse (or a shared import of time.ts)
  MODIFY    src/lib/audit.ts         ← add the 8 new AuditAction literals
  MODIFY    src/lib/validation.ts    ← device serial / IP / port validators (existing style)
  # OPTIONAL, separate commit, NOT part of this feature:
  MODIFY    src/lib/integrations/attendance.ts  ← IST day window + 03:45Z late cutoff (§12.3)

APP — UI  (src/app/(sysadmin)/sysadmin/ + components/)
  NEW FILE  src/app/(sysadmin)/sysadmin/devices/page.tsx       ← devices list + register modal
  NEW FILE  src/app/(sysadmin)/sysadmin/devices/[id]/page.tsx  ← detail: status/history/failed/mappings
  NEW FILE  src/components/sysadmin/DeviceRegistry.tsx         ← list + register/edit modal
  NEW FILE  src/components/sysadmin/DeviceDetail.tsx           ← tabs container
  NEW FILE  src/components/sysadmin/DeviceSyncHistory.tsx      ← runs table
  NEW FILE  src/components/sysadmin/DeviceFailedEvents.tsx     ← failed/unmapped + retry + CSV export
  NEW FILE  src/components/sysadmin/DeviceUserMappings.tsx     ← mapping manager
  NEW FILE  src/components/sysadmin/DeviceFileImportModal.tsx  ← upload UX (BulkUserImportModal pattern)
  MODIFY    src/hooks/useNavigation.ts                         ← add the Devices nav entry
  MODIFY    src/components/shared/Sidebar.tsx                  ← nav visibility for sysadmin/admin

SCRIPTS / CONFIG
  MODIFY    package.json            ← add "test:sync" and a "sync-bridge" script
  MODIFY    scripts/validate-env.js ← OPTIONAL: warn when BIOMETRIC_* are half-configured
  MODIFY    .env.example            ← document that no device secret goes in a NEXT_PUBLIC_* var
```

### 22.1 Files that must NOT be touched

```text
src/app/api/gate/scan/route.ts   the operator scan path — unrelated
src/lib/db.ts                    the scan/occupancy data layer — unrelated
supabase/schema.sql              bootstrap schema; additions go via migrations
vercel.json                      no app deployment change needed
src/app/api/operator/*           the WebAuthn thumbprint flow — a different system entirely
```
---

## 23. Implementation Phases

Phases 2–9 are implementable **without the device**. Phase 10 needs a real export. Phase 1 runs in
parallel and blocks only Phase 11 and the LAN half of Phase 3.

### Phase 0 — Repository audit ✅ COMPLETE

- **Objective:** understand the system before changing it.
- **Output:** this document, §2–§3.
- **Completion criteria:** every table, route convention, identity rule, and existing H0201 artefact
  identified and cited with a file path.

### Phase 1 — Device capability verification `[BLOCKS Phase 11 + LAN adapter]`

- **Objective:** replace `[UNKNOWN]` with measured fact. Execute T1–T13.
- **Files:** none (evidence gathering). Output is a task attachment: port scan, capture file, export
  sample, hexdump, vendor manual, firmware report.
- **DB changes / APIs:** none.
- **Dependencies:** physical access to the terminal, a laptop on the LAN, Wireshark, a USB stick.
- **Risks:** vendor software may be Windows-only; the protocol may be undocumented; the export may be
  proprietary binary.
- **Tests:** N/A — the tests *are* T1–T13.
- **Completion criteria:** every `[UNKNOWN]` in §4.4 is resolved or explicitly deferred with a written
  reason; a real export sample exists (not committed if it contains PII).

### Phase 2 — Database / schema changes

- **Objective:** create the additive schema.
- **Files:** the four migrations in §22 (all `NEW FILE`).
- **DB changes:** `device_registry`, `device_events`, `device_sync_runs`, nullable columns on
  `device_user_mappings` and `movement_logs`, RLS.
- **APIs:** none.
- **Dependencies:** U10 resolution (`attendance_records` reality check).
- **Risks:** low — additive only. `uq_device_mapping_one_active_per_user` is the one behavioural
  constraint; decide before applying (§7.4).
- **Tests:** apply to a scratch Supabase project; apply twice (idempotency); verify RLS with an anon key.
- **Completion criteria:** migrations apply cleanly twice; no existing table altered destructively;
  RLS verified; rollback (`DROP TABLE`/`DROP COLUMN`) rehearsed.

### Phase 3 — Device adapter

- **Objective:** isolate all device-specific code behind `AttendanceDeviceAdapter`.
- **Files:** `NEW scripts/sync-bridge/h0201-file-adapter.ts` (**first**),
  `NEW .../h0201-lan-adapter.ts` (blocked), `MODIFY .../log-fetcher.ts`, `.../types.ts`.
- **DB changes / APIs:** none (worker-internal).
- **Dependencies:** Phase 1 for the LAN adapter; a sample export for the file adapter.
- **Risks:** the LAN protocol may be unimplementable without vendor cooperation — **which is exactly
  why the file adapter ships first and the design does not depend on the LAN path.**
- **Tests:** §18.2 parser matrix P1–P13; adapter contract test with a fixture file.
- **Completion criteria:** both adapters implement one interface; swapping them changes no downstream
  code; no H0201-specific import exists outside the adapter files.

### Phase 4 — Parser / import pipeline

- **Objective:** raw rows → `device_events`, idempotently.
- **Files:** `NEW .../time.ts`, `NEW .../device-store.ts`, `NEW .../processor.ts`,
  `NEW scripts/verify-device-pipeline.ts`.
- **DB changes:** writes to `device_events`, `device_sync_runs`.
- **APIs:** none yet (invoked by the Phase 7 route).
- **Dependencies:** Phase 2.
- **Risks:** the fingerprint choice is load-bearing — validate it against a real duplicate-import
  scenario before proceeding.
- **Tests:** idempotency (A4, S5, S6), time matrix T1–T8, error rows E6–E8.
- **Completion criteria:** importing the same file twice produces identical `device_events` counts and
  **no** additional `movement_logs` rows on the second run — proven by `verify-device-pipeline.ts`,
  not by inspection.

### Phase 5 — Identity mapping

- **Objective:** device user → SBTS user, with an admin-managed mapping.
- **Files:** `NEW src/app/api/device-users/mappings/**`, `NEW src/lib/device-types.ts`,
  `MODIFY src/lib/audit.ts`.
- **DB changes:** uses the existing `device_user_mappings` + the new nullable columns.
- **APIs:** §16.9–§16.12.
- **Dependencies:** Phase 2.
- **Risks:** bulk CSV import can mis-map if `unique_id` is ambiguous — always report a failure row.
- **Tests:** M1–M7, X9.
- **Completion criteria:** an unmapped device user produces an `unmapped` event and a UI-visible
  warning, and **never** a `users` row.
### Phase 6 — Attendance processing

- **Objective:** resolved events → `movement_logs` exactly once.
- **Files:** `MODIFY .../processor.ts`, `MODIFY .../sink.ts`.
- **DB changes:** none (writes the existing table).
- **APIs:** none.
- **Dependencies:** Phases 4, 5.
- **Risks:** the direction policy (§10.2) is the main correctness risk; pick, document, and test it.
- **Tests:** A1–A9, plus a reconciliation test comparing expected vs actual `movement_logs` deltas.
- **Completion criteria:** isolated test punches appear correctly in the existing admin attendance
  page, occupancy, daily stats, and audit log — with **no code change** to any of those consumers.

### Phase 7 — Admin UI

- **Objective:** register devices, import files, review failures, manage mappings.
- **Files:** the UI files in §22 + `MODIFY src/hooks/useNavigation.ts`,
  `MODIFY src/components/shared/Sidebar.tsx`.
- **DB changes:** none.
- **APIs:** §16.1–§16.8 implemented here.
- **Dependencies:** Phases 2, 4, 5, 8.
- **Risks:** scope creep — hold the line at §15.3.
- **Tests:** X1–X7; one Playwright spec on the happy path (upload → summary → device list) following
  the existing `tests/*.spec.ts` style.
- **Completion criteria:** an admin can answer "why is this student missing?" using only the UI.

### Phase 8 — Logging / observability

- **Objective:** persist the `SyncRunSnapshot` counters and surface them.
- **Files:** `MODIFY .../index.ts` (back-off, stale-run reaping, counters), `MODIFY .../README.md`.
- **DB changes:** writes `device_sync_runs`; updates `device_registry.last_sync_*`.
- **APIs:** §16.6, §16.7.
- **Dependencies:** Phases 2, 4.
- **Risks:** low.
- **Tests:** S1–S4, S7, S8.
- **Completion criteria:** every §17.3 counter is queryable from the DB; no operational question
  requires server-log access.

### Phase 9 — Testing

- **Objective:** consolidate the matrix into runnable checks.
- **Files:** `MODIFY .../selfcheck.ts`, `NEW scripts/verify-device-pipeline.ts`, `MODIFY package.json`.
- **DB changes / APIs:** none.
- **Dependencies:** Phases 3–8.
- **Risks:** the temptation to add Jest — **don't**; extend the existing `assert` pattern.
- **Tests:** the whole §18.2 matrix.
- **Completion criteria:** `npm run test:sync` passes; the DB check passes; the security cases pass.

### Phase 10 — Deployment

- **Objective:** ship the file-import path to production.
- **Files:** `MODIFY scripts/sync-bridge/.env.example`, `MODIFY .env.example`; a systemd/PM2 unit
  (ops artefact — `docs/runbooks/` exists but is currently empty, so it belongs there).
- **DB changes:** apply the migrations to production.
- **APIs:** none new.
- **Dependencies:** Phases 2–9.
- **Risks:** enabling ingest before mapping is complete → a wave of `unmapped` events. Mitigate with
  the §20.4 ordering.
- **Tests:** the §20.5 checklist end-to-end.
- **Completion criteria:** the cutover checklist is fully ticked; `USE_FAKE_DEVICE_LOGS=false` is
  verifiably false in production; rollback rehearsed.

### Phase 11 — Device acceptance testing

- **Objective:** prove compatibility with the real unit (T1–T13) and, if the LAN path verifies, enable
  `h0201-lan-adapter.ts`.
- **Files:** `NEW .../h0201-lan-adapter.ts` receives its real implementation here.
- **DB changes:** set `device_registry.connection_type` / `ip_address` / `port` / `clock_drift_seconds`.
- **APIs:** none.
- **Dependencies:** Phase 1 evidence + Phases 3–10 live.
- **Risks:** **highest in the project.** The protocol may not be implementable, the vendor may not
  cooperate, and the device may only support USB export.
- **Tests:** T1–T13 as real assertions plus a 24-hour soak (S1–S8 under real traffic).
- **Completion criteria:** one full day of real device punches reconciles **exactly** against the
  vendor's own attendance report for the same day — same count, same times, no duplicates. Until that
  reconciliation passes, the integration is **not** claimed to work.
---

## 24. Acceptance Criteria

### 24.1 Functional

- [ ] **AC1** — A real USB export from the H0201 can be uploaded by a sysadmin/admin and produces one
      `device_events` row per device record, with the raw row preserved.
- [ ] **AC2** — A punch for a mapped, ACTIVE user produces **exactly one** `movement_logs` row.
- [ ] **AC3** — A punch for an unmapped user produces an `unmapped` `device_events` row, **no**
      `users` row, **no** `movement_logs` row, and a visible admin warning.
- [ ] **AC4** — Importing the same file twice (or after a worker restart) creates **zero** additional
      `movement_logs` rows.
- [ ] **AC5** — `campus_occupancy`, `daily_stats`, and `audit_logs` update for biometric punches with
      no changes to their triggers or consumers.
- [ ] **AC6** — The existing QR/WebAuthn operator scan flow is unchanged (regression-tested).
- [ ] **AC7** — An admin can map a device user and reprocess previously-unmapped events from the UI.
- [ ] **AC8** — The device page shows last sync time/status, counters, and a failed-event list.

### 24.2 Non-functional

- [ ] **AC9** — An import of 5 000 events completes within the platform request timeout, or is
      chunked (decide from the measured record size in Phase 1).
- [ ] **AC10** — Idempotency is enforced by a **database** constraint, demonstrated by a test that
      bypasses all application dedupe.
- [ ] **AC11** — No route returns or logs a service-role key or a device credential.
- [ ] **AC12** — RLS blocks an `authenticated` (non-admin) user from reading and writing device tables.
- [ ] **AC13** — All device timestamps are stored as UTC `timestamptz`; exactly one IST parser exists.
- [ ] **AC14** — The worker refuses to start with `BIOMETRIC_INGEST_ENABLED=true` and
      `USE_FAKE_DEVICE_LOGS=true` together.
- [ ] **AC15** — Rollback is possible without touching existing attendance data.

### 24.3 Not accepted as "done"

- "The pipeline works" without a real device export reconciled against the vendor's own report.
- "Duplicate-safe" without the database-level test.
- Any solution that writes attendance outside `movement_logs`.
- Any protocol implementation written from memory rather than from a capture.
---

## 25. Open Questions

| # | Question | Owner | Blocks | Default if unanswered |
| :--- | :--- | :--- | :--- | :--- |
| Q1 | What is the H0201's real wire protocol, and is it ZKTeco-4370-compatible? | Vendor / hardware team | Phase 3 LAN, Phase 11 | Ship file import only |
| Q2 | Does the device support ADMS/HTTP push to a server? | Vendor | Deployment topology | Poll/import only |
| Q3 | Does a punch carry a unique record id? | T7 | Fingerprint tier (§11.2) | Use the composite fingerprint |
| Q4 | Exact export filenames, delimiter, encoding, column order? | T4, T5 | Phase 3 file adapter | Keep both text and binary parsers |
| Q5 | What does `state`/punch code mean, and is IN/OUT configurable? | T6 | Direction policy (§10.2) | Policy B (toggle) |
| Q6 | Device clock timezone, and does it drift? | T9, T10 | §12 | Assume naive IST; monitor drift |
| Q7 | Does the device require a comm key/password? | T11 | §14.3 | No credential; LAN-isolated |
| Q8 | How many H0201 terminals exist/will exist, and for which gates? | Campus ops | Registry cardinality, `gate_id` binding | One device, one gate |
| Q9 | Does `attendance_records` exist live, with which unique constraints? | DBA | §7.7 | Drop the mirror sink |
| Q10 | Do `integration_configs`/`integration_logs` exist live? | DBA | nothing in this plan (informational) | Leave alone |
| Q11 | Who is enrolled first, and who maintains the mapping? | Campus ops | Phase 5 rollout | A pilot of one department |
| Q12 | Is a biometric-consent/notice policy required for attendance derived from fingerprints? | Institution / legal | Phase 10 | Store only the opaque `device_user_id`; no templates leave the device |
| Q13 | Expected daily punch volume? | Campus ops | AC9 | Assume ≤5 000/day |
| Q14 | Is a campus host available for the worker, or is import manual-only? | IT | Deployment shape | Manual import via the sysadmin UI |
| Q15 | Who owns the device clock correction if drift is found? | IT / vendor | T9 follow-up | Document drift; do not auto-correct |
---

## 26. Risks & Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| **R1** | **Protocol proprietary/undocumented**; the LAN path cannot be implemented | High | Medium | The architecture does not depend on it. File import ships independently and satisfies the core requirement; LAN is a Phase 11 enhancement. |
| **R2** | **Duplicate `movement_logs` rows** inflate occupancy/stats/audit | High (already true today) | High | DB-unique `event_fingerprint` + `ON CONFLICT DO NOTHING`; AC4/AC10 tests. **Highest-priority fix.** |
| **R3** | `USE_FAKE_DEVICE_LOGS=true` in production writes synthetic punches forever | Medium | High | Startup guard refusing ingest + fake together (AC14); remove the mock from the production runbook. |
| **R4** | `attendance_records` missing or with the wrong unique key → mirror silently fails | High | Medium | Resolve Q9 first; recommended action is to drop the mirror entirely. |
| **R5** | No `gate_id` bound → every punch fails to persist and the error is swallowed | Medium | High | `device_registry.gate_id` + refuse-to-ingest guard (E9) + a blocking UI warning. |
| **R6** | Device clock wrong or drifting | Medium | Medium | `clock_drift_seconds`, implausible-timestamp rules, a warning badge, and the "flag, don't fabricate" policy. |
| **R7** | **Pre-existing UTC/IST reporting bug** makes correct punches look missing | High (exists today) | Medium | Fix in a separate flagged commit (§12.3); document the expected change in reported late counts. |
| **R8** | Unmapped device users cause a silent attendance gap | High during rollout | Medium | `unmapped` status + a prominent UI panel + "Reprocess" — the gap becomes visible and one click from fixed. |
| **R9** | Admin UI scope creeps into a full device-management console | Medium | Low | §15.3 enumerates explicitly what is *not* built. |
| **R10** | Service-role key leaks into client code or a response body | Low | Critical | `credential_ref` indirection, server-only routes, AC11 grep test, existing env conventions. |
| **R11** | Device exposed to the public internet "temporarily" | Low | Critical | §14.2 hard rule; no port-forward; VLAN + host firewall. |
| **R12** | Import file is huge or malformed and breaks the route | Medium | Medium | 5 MB cap, extension/MIME checks, line/length caps, per-line try/catch, E12/E13 handling. |
| **R13** | Two worker instances run concurrently and double-process | Low | High | Advisory lock / `running`-row guard (S7); the fingerprint is the backstop. |
| **R14** | Person enrolled twice on one terminal under two ids → double punches | Medium | Medium | `uq_device_mapping_one_active_per_user` (§7.4) + a clear 409 in the API. |
| **R15** | Rollback needed after bad punches are already in `movement_logs` | Low | High | Raw events preserved → targeted delete + reprocess; `backfill-daily-stats.js` rebuilds stats; occupancy recomputed. |
| **R16** | Timezone assumption wrong (device stores UTC while config says IST) | Medium | Medium | T10 test; dual `event_timestamp_local`/`_utc` makes the error detectable and reversible from the raw trail. |
| **R17** | The `movement_logs` dedupe-column option gets chosen and destabilises the hot table | Low | Medium | §11.4 recommends status-based idempotency; option 2 is documented but not selected. |
| **R18** | Report reconciliation fails on device acceptance day | Medium | High | Phase 11's completion criterion **is** that reconciliation. Do not declare success before it passes. |

### 26.1 Risk-to-phase mapping (what to watch when)

| Phase | Watch |
| :--- | :--- |
| 1 | R1, R16 — evidence quality decides everything downstream |
| 2 | R4, R14, R17 — schema decisions are the most expensive to reverse |
| 3–4 | R2, R12, R13 — the idempotency guarantee is built here |
| 5 | R8, R14 — mapping is where silent gaps appear |
| 6 | R5, R6, R7 — the write path and time semantics |
| 7–8 | R9, R3 — scope and safety guards |
| 10 | R10, R11, R15 — security and reversibility at cutover |
| 11 | R18 — the honest acceptance gate |

---

## Appendix A — Quick reference: facts vs assumptions

| Statement | Status |
| :--- | :--- |
| `movement_logs` is the attendance ledger, trigger-backed | `[CONFIRMED]` |
| `movement_logs.gate_id` and `gate_name` are `NOT NULL` | `[CONFIRMED]` |
| `movement_logs` has no unique dedupe constraint | `[CONFIRMED]` |
| `device_user_mappings` exists with `UNIQUE(device_serial, device_user_id)` | `[CONFIRMED]` |
| `attendance_records` is absent from `supabase/schema.sql` | `[CONFIRMED]` |
| The worker's TCP adapter is a stub that throws | `[CONFIRMED]` |
| `mapper.ts` dedupes only in memory, per run | `[CONFIRMED]` |
| No unit-test runner in `package.json` | `[CONFIRMED]` |
| Auth is per-route via `withAuthorization`; no root `middleware.ts` | `[CONFIRMED]` |
| App "late" cutoff `09:15:00.000Z` is UTC, not IST | `[CONFIRMED — bug]` |
| Device is a ZKTeco-family terminal on TCP 4370 | `[PROBABLE]` |
| Device supports USB file export | `[PROBABLE]` |
| Device supports ADMS / HTTP push | `[UNKNOWN]` |
| Punches carry a unique record id | `[UNKNOWN]` |
| Device stores naive IST | `[UNKNOWN]` → T10 |
| `state 0/1` means IN/OUT | `[REQUIRES DEVICE TEST]` T6 |
| Export format matches an implemented parser | `[REQUIRES DEVICE TEST]` T4/T5 |

## Appendix B — One-page implementation order

```
Phase 1  (parallel) gather device evidence T1–T13
Phase 2  migrations: registry, events, runs, nullable columns, RLS
Phase 3  file adapter  (+ LAN adapter only after Phase 1)
Phase 4  time.ts, device-store.ts, processor.ts, verify-device-pipeline.ts
Phase 5  mapping APIs + audit actions
Phase 6  movement_logs write path + direction policy
Phase 7  /sysadmin/devices UI + import route
Phase 8  counters persisted + back-off + stale-run reaping
Phase 9  selfcheck matrix + package.json script
Phase 10 deploy the file-import path; cutover checklist
Phase 11 device acceptance; reconcile against the vendor report
```

**Do not skip Phase 1, and do not declare success before Phase 11's reconciliation.** Everything else
can be built and verified without the physical device.

## Appendix C — Repository evidence index

| Evidence | Path |
| :--- | :--- |
| Existing worker + README + self-check | `scripts/sync-bridge/{index,log-fetcher,mapper,sink,types,selfcheck}.ts`, `scripts/sync-bridge/README.md`, `scripts/sync-bridge/.env.example` |
| Existing mapping table migration | `supabase/migrations/20260913_device_user_mappings.sql` |
| RLS hardening migration (pattern to follow) | `supabase/migrations/20260916000000_security_rls_and_function_hardening.sql` |
| Schema of record | `supabase/schema.sql` |
| Auth / authorization wrappers | `src/middleware/{auth,authorization}.ts` |
| Rate limiting | `src/lib/rate-limit.ts` |
| Attendance read/report layer | `src/lib/integrations/attendance.ts` |
| Audit logging | `src/lib/audit.ts` |
| Scan path (must not break) | `src/app/api/gate/scan/route.ts`, `src/lib/db.ts` |
| Admin attendance view | `src/app/(admin)/admin/attendance/page.tsx` |
| Gate device UI (gate-level, not terminal-level) | `src/app/api/gate/devices/route.ts`, `src/components/sysadmin/GateManagement.tsx` |
| Existing integration UI + Sync Now button (LMS/HR, not biometric) | `src/components/sysadmin/IntegrationsDashboard.tsx`, `src/app/api/integrations/**` |
| Upload UX pattern to reuse | `src/components/sysadmin/BulkUserImportModal.tsx` |
| Daily-stats backfill (rollback tool) | `scripts/backfill-daily-stats.js` |
| Verification-script pattern | `scripts/verify-supabase-migrations.ts` |
| Env validation | `scripts/validate-env.js`, `src/lib/env.ts` |
| Gate seeds (valid `gate_id` targets) | `scripts/seed-gates.js` |
| Roll-number identity scheme | `src/lib/rollNumber.ts` |

---

*End of plan. No production code was written. Implementation starts at Phase 1 (device evidence) in
parallel with Phase 2 (additive migrations).*
   currently no column anywhere holding `device_serial` / `device_user_id` for a punch.