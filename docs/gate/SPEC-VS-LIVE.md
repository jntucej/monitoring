# Gate Records — Spec vs. Live Schema Collision Report

Date: 2026-11-25. Grounded against the **live** `gate_monitor` DB (247
migrations) + actual repo conventions. The pasted spec was written *without*
inspecting this system, so several of its "new" tables and helpers collide with
things that already exist. This report maps each spec table/field to live
reality so you can decide the build strategy.

## 0. Convention deltas (spec assumed the wrong stack)

| Spec assumption | Live reality | Impact |
| :--- | :--- | :--- |
| `postgres.js` — `sql` tagged-template (`sql\`...${x}\``) | **node-postgres** (`pg`) via `query<T>(text, params[])` in `src/lib/postgres.ts` | Every §2.4/§2.5 query must be rewritten to `$1,$2` params. The `sql.json`/`sql\`` snippets won't run. |
| `withAuthorization({requiredRole})` returns a handler | `withAuthorization(handler, {requiredRole})` — **handler-first**; `requireRole(...)`/`requirePermission(...)` are the convenience wrappers | Route handlers wrap a function; spec's options-first calls won't compile. |
| `public.` schema | Correct — app role writes `public.*` | No change needed. |
| Migrations in `supabase/migrations/` | Migrations live in `database/migrations/` (timestamped `YYYYMMDDNNNNNN_*.sql`, `.down.sql` pairs) | Put new SQL there, next timestamp. |
| New `/api/gate/events/stream` SSE | **`/api/gate/stream` already exists** and is the live kiosk feed (ring-buffer reconnect, per-gate scoping for operator/supervisor) | Wire gate events into the existing bus, don't build a parallel one. |

## 1. Table collision matrix

Legend: **REUSE** = use the existing table as the source of truth; **EXTEND** =
add columns to it; **NEW** = genuinely missing, build it; **DROP** = don't build.

| Spec table | Live equivalent | Verdict |
| :--- | :--- | :--- |
| `gate_events` (append-only ledger, all 10 event types) | `movement_logs` (IN/OUT) + `visitor_logs` (check-in/out) + `gate_passes` (pass) + `campus_events` + `audit_events`/`case_events`/`conduct_events`/`event_feedback` — the "one ledger for everything" does **not** exist; events are already split by type | **DECIDE:** (A) build one `gate_events` on top (dupes the 4) or (B) reuse the per-type tables and add only the missing event types (device, vehicle, security, shift, exam_access, hostel_gate) |
| `ref_categories` (taxonomy) | **nothing** — closest is ad-hoc `CHECK` constraints / enums in `gates.type`, `gate_passes.final_status` | **NEW** — genuinely missing. This is the "premade long-term scope" answer and the most valuable piece of the spec. |
| `gate_field_blueprints` (role×gate×event field matrix) | **nothing** — field scoping is currently hard-coded in components | **NEW** — genuinely missing and high-value (config-driven field visibility). |
| `gate_devices` | **nothing** for gate hardware (only `worker_job_heartbeats` for the worker, `device_verification_settings` for WebAuthn) | **NEW** — missing. |
| `gate_shifts` | `shifts` (gate_id, shift_date, start/end_time, operator_id) + `shift_handovers` (by_user, to_role, items jsonb, notes) | **REUSE** — `shifts` + `shift_handovers` already cover the shift/handover records; don't build `gate_shifts`. |
| `visitor_visits` (check-in→check-out lifecycle) | `visitor_logs` (check_in_at, check_out_at, host_user_id, purpose, status) + `visitor_pre_registrations` | **REUSE/EXTEND** — `visitor_logs` is the lifecycle table; add `visitor_category`, `id_document_type`, `id_number`, `vehicle_type`, `badge_no`, `host_ack_at` as columns rather than a new table. |
| `watchlist_entries` | `visitor_watchlist` (user_id, reason, added_by, added_at, active) | **REUSE/EXTEND** — add `subject_type`, `subject_ref`, `severity`, `expires_at`; no new table. |
| `vehicles` / `vehicle_entries` | **nothing** | **NEW** (small) or fold into `gate_events` vehicle rows. |
| `curfew_returns` | **nothing** (`student_curfew_scores` is a score, not a return log) | **NEW** — genuinely missing. |
| `exam_hall_access` | `exam_access_exceptions` (day, severity, candidate, roll, hall, resolved) + `hall_tickets` (status) + `config_exam_eligibility_rules` (min_attendance_pct, require_fees_paid, require_academic_active) | **REUSE/EXTEND** — `exam_access_exceptions` is the closest; eligibility is already computed from `hall_tickets.status` + `config_exam_eligibility_rules`. No new `exam_hall_access` table; add an access-log table only if you need the positive "allowed" audit, not just exceptions. |
| `lockdowns` / `emergency_alerts` | `campus_events` (title, category, location, starts/ends, is_public) is the general events table; lockdown state likely in a control table | **VERIFY** — check `automation_controls`/`gate_schedules` before building; a dedicated `lockdowns` table is probably NOT needed. |

## 2. Field-level collisions (existing → spec)

**movement_logs** already has: `direction`, `reason`, `gate_id`, `gate_name`,
`operator_id`, `operator_name`, `timestamp`, `is_manual`, `is_correction`,
`original_log_id`, `correction_reason`, `category`, `user_id`.
Spec adds: `event_type`, `device_id`, `shift_id`, `verification_method`,
`outcome`, `photo_url`, `geo`, `subject_ref`, `watchlist_hit`,
`curfew_violation`, `duplicate_scan`, `payload` jsonb.
→ If reusing `movement_logs`, these become **added columns** (nullable), not a
new table. The `payload jsonb` + `watchlist_hit`/`curfew_violation` derived
flags are the key new bits.

**gate_passes** already has: `qr_code`, `final_status`, `from_datetime`,
`to_datetime`, `roll`, `guardian_status`/`admin_status`, approvers.
Spec's "pass auto-resolve" (valid_from/to/status/verification_result) maps
directly onto `qr_code` + `final_status` + the two datetimes — **no new table**,
the resolver just reads `gate_passes`.

**visitor_watchlist** already has: `user_id`, `reason`, `active`, `added_at`.
Spec's watchlist auto-check reads this — **works today**; only add
`subject_ref`/`severity`/`expires_at` if you need non-user subjects.

## 3. The two pieces that are unambiguously worth building regardless

These have **no live equivalent** and are the spec's actual value-add:

1. **`ref_categories`** — a single migration-seeded taxonomy (visitor_category,
   id_document_type, purpose_code, exception_category, severity, resolution_action,
   security_event_type, fault_code, vehicle_type, leave_type, handover_reason,
   gate_type, curfew_window, exam_session_type, escalation_target,
   verification_method, direction). Changes only via migration, never free-text.
   This is the "premade, long-term scope" guarantee.

2. **`gate_field_blueprints`** — `(role, gate_type, event_type, context) →
   ordered field list with fill_mode`. This makes operator-field-visibility
   config-driven (the §1.5 matrix) instead of hard-coded in components.

Everything else in the spec is either **already covered** by an existing table
(shifts, visitor lifecycle, watchlist, pass resolution, exam eligibility) or
**needs your call** on the ledger question (§1, `gate_events`).

## 4. Recommended strategy (for your approval)

- **Phase A (build now):** `ref_categories` + `gate_field_blueprints` + their
  seeds (the 2 NEW control-plane tables), the `getBlueprint` resolver (adapted
  to `query(text, params)`), and the `/api/gate/events` GET (blueprint) +
  `/api/ref/categories` routes. No schema duplication, no data writes yet.
- **Phase B (after you pick a ledger strategy):** either (A) add the missing
  event-type columns/tables on top of the existing per-type tables, or (B) the
  full `gate_events` ledger — plus the `recordGateEvent` automation engine and
  the operator `GateEventForm` + tests.

**Your decision needed on §1:** reuse the existing per-type event tables
(movement_logs / visitor_logs / gate_passes / shifts / exam_access_exceptions)
or build one unified `gate_events` ledger?
