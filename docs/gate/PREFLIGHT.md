# Gate Records — Pre-Flight Verification

Date: 2026-11-25. All checks run against the **live** `gate_monitor` DB
(`gate_postgres`, 269 applied migrations). This is step #0 of the build:
verify before migrating. Every claim in the spec's collision analysis is
confirmed or corrected below.

## Table shapes (spec vs. live)

| Table | Spec claim | Live reality | Verdict |
| :--- | :--- | :--- | :--- |
| `movement_logs` | has `category`, `user_id`, `direction`, `gate_id`, `operator_id`, `timestamp`, `is_manual` | confirmed, all present | REUSE + extend (8 nullable cols) |
| `visitor_logs` | has `check_in_at`, `check_out_at`, `host_user_id`, `status`, `purpose` | confirmed — it IS a lifecycle pair, not a single timestamp | REUSE + extend |
| `gate_passes` | has `qr_code`, `final_status`, `from_datetime`, `to_datetime`, `guardian_status`/`admin_status` | confirmed | read-only verify target |
| `shifts` | has `gate_id`, `shift_date`, `start_time`, `end_time`, `operator_id` | confirmed | REUSE |
| `shift_handovers` | has `by_user_id`, `to_role`, `items jsonb`, `notes` | confirmed — `items` is `jsonb`, so shift-counter rule #9 is unchanged | REUSE |
| `visitor_watchlist` | has `user_id`, `reason`, `added_by`, `added_at`, `active` | confirmed; **no RLS enabled** (RLS off) | REUSE + extend; add RLS policy |
| `exam_access_exceptions` | `day`, `severity`, `candidate`, `roll`, `hall`, `description`, `resolved` | confirmed | REUSE (exceptions stay here) |
| `hall_tickets` | `student_id`, `status` (valid/…) | confirmed | eligibility source |
| `config_exam_eligibility_rules` | `min_attendance_pct`, `require_fees_paid`, `require_academic_active` | confirmed | eligibility source |

## RLS (pre-flight #9)

`RLS = on (forced)` on: `movement_logs`, `visitor_logs`, `gate_passes`,
`shifts`, `shift_handovers`, `emergency_alerts`. The new nullable columns I add
to `movement_logs` / `visitor_logs` / `gate_passes` **inherit** the existing
`*_gate_app_select` / `*_gate_app_write` policy families — no new RLS needed
for them.

`RLS = off` on: `visitor_watchlist`, `emergency_commands`. The new satellite
tables I create (`gate_exceptions`, `gate_devices`, `gate_device_events`,
`vehicles`, `vehicle_entries`, `curfew_returns`, `exam_access_log`) start RLS-off;
operator-scoping for those is enforced in the API layer (role + gate_id
filters), and an RLS pass can be layered on later. **`visitor_watchlist`
should get a RLS policy in a follow-up** — noted, not blocking.

## Lockdown / security-event state (pre-flight #8) — DECISION

Existing tables that already model this:
- `emergency_commands` (`state`, `lockdown_id`, `authority_source`,
  `actor_role`, `review_status`) — the lockdown **state machine**.
- `emergency_alerts` (`alert_type`, `location`, `message`, `acknowledged_by`,
  `resolved_at`) — the **alert** log.
- `lockdown_broadcasts` — broadcast payloads.

**Decision: `security` events FOLD into `emergency_alerts` (no new
`security_events` table).** A security event recorded by a supervisor is an
alert row; the lockdown state machine already lives in `emergency_commands`.
This matches the revised plan's "VERIFY → fold" instruction.

## SSE publish surface (pre-flight #10)

`/api/gate/stream` already exists and is the live kiosk feed. It polls the DB
every 3 s and records status changes into the shared `gate-stream` ring buffer
(`src/lib/sse-ring-buffer.ts` → `recordSseEvent(key, data, event)`).
`src/lib/gate/sse.ts` calls that same `recordSseEvent("gate-stream", …)` so a
`gate_event` is replayed to connected clients / reconnecting clients on the
next cycle. **No new SSE route.**

## What was built (per Option B)

Migrations (`database/migrations/`):
- `20270131000003_gate_records_control_plane.sql` (+ `.down`) — `ref_categories`,
  `gate_field_blueprints` (with `record_target`), 7 new satellite tables
  (`gate_exceptions`, `gate_devices`, `gate_device_events`, `vehicles`,
  `vehicle_entries`, `curfew_returns`, `exam_access_log`), + nullable extension
  columns on `movement_logs` / `visitor_logs` / `gate_passes` /
  `visitor_watchlist` / `shifts`.
- `20270131000004_gate_records_seeds.sql` — 102 `ref_categories` rows, 90
  `gate_field_blueprints` rows (each with `record_target`).

Code:
- `src/lib/gate/blueprints.ts` — resolver + `getRefCategories`, exposes
  `recordTarget`.
- `src/lib/gate/events.ts` — `recordGateEvent` dispatcher (10 event types) +
  10 automation rules.
- `src/lib/gate/sse.ts` — thin wrapper over the existing ring buffer.
- `src/app/api/gate/events/route.ts` — GET blueprint + POST record.
- `src/app/api/ref/categories/route.ts` — taxonomy for dropdowns.
- `src/components/gate/GateEventForm.tsx` — blueprint-driven form.
- `src/app/(operator)/operator/gate-records/page.tsx` — operator console.
- `tests/gate/lib/gate-records.test.ts` — 7 acceptance tests.

Deviations from the pasted spec:
- Security events fold into `emergency_alerts` (spec left it conditional;
  pre-flight #8 resolved it to "fold").
- `movement_logs` is the universal person-scan log for `movement`,
  `hostel_gate`, **and** the pass-verification write (spec's map put pass on
  `gate_passes` read + `movement_logs` write — consistent).
- `visitor_watchlist` RLS is still off; needs a follow-up policy (flagged,
  not blocking the core subsystem).
