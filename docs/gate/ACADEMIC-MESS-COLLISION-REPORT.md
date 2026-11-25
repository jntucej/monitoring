# Academic / Hostel / Mess spec vs. Live Schema — Collision Report

Date: 2026-11-25. Grounded against the live `gate_monitor` DB (269+
migrations). The pasted spec (timetable, confirmations, notification bus,
hostel hierarchy, ops_rules, mess tokens, mess menu) was written **without
inspecting this system** — it names tables and endpoints that already exist in
different (often *richer*) shapes. Build-after-verify, same as the gate-records
pass.

## 0. Convention deltas (spec assumed the wrong primitives)

| Spec assumption | Live reality |
| :--- | :--- |
| `postgres.js` `sql` tagged-template | **node-postgres** `query(text, params[])` (same as last pass). |
| New `notifications` / `notification_events` | A `notifications` table **already exists** (`recipient_type`, `channels[]`, `priority`, `delivered_at`, `read_at`) plus `notification_sms_queue`, `notification_push_queue`, `notification_email_queue`, `notification_preferences`. The spec's `notification_events`+`notification_receipts` would **duplicate** this. |
| New `confirmations` multi-stage chain table | `permissions` **already is** a multi-stage chain (`current_stage`, `stage_history jsonb`, `routed_to_role`, `forwarded_from_role`, `parent_notified_at`, `sla_deadline`, `stepup_verified_by`). `pending_approvals` is the maker-checker single-stage variant. `leave_requests` already has `warden_approved_by`/`parent_acknowledged_by`/`gate_issued_at`. Building `confirmations` = a **third** chain store. |
| New `announcements` (content store) | `announcements` **already exists** (title, message, priority, audience, scheduled_at, is_published). Spec even says keep it. |
| New `mess_tokens` | `mess_tokens` **already exists** but is **HMAC-free** (`qr_payload_hash`, single `token_code`, `used_at`, `used_by`, `revoked_at`; **no nonce, no device binding**). The spec's HMAC+nonce+single-use is the *genuine* value-add → extend, don't recreate. |
| New `mess_menus` / interest polls | No weekly-menu tables. `mess_menu_items` is a **catalog** (code/label/is_primary/sort_order), not a weekly menu. `mess_days`/`mess_day_items`/`mess_meal_served` model the daily menu. Interest polls genuinely missing. |
| New `timetable_versions`/`timetable_slots` | `class_periods` (class_id, period_no, day_of_week, start/end, hall, faculty_id) **already** is the timetable; `class_session_markers` is the per-day materialization. Spec would duplicate both. |

## 1. What genuinely exists (reuse) vs. what's missing

| Spec piece | Live equivalent | Verdict |
| :--- | :--- | :--- |
| `timetable_versions` | `class_periods` (the active timetable) | **EXTEND** (add version/status) or leave; no new table |
| `timetable_slots` | `class_periods` itself | **REUSE** (a period *is* a slot) |
| `class_sessions` materialization | `class_session_markers` | **REUSE/EXTEND** |
| `confirmations` chain table | `permissions` (multi-stage) + `pending_approvals` (maker-checker) | **DO NOT build** — use `permissions.stage_history` |
| `notification_events` + `receipts` + `scope_members` | `notifications` + 3 channel queues + `notification_preferences` | **DO NOT build** — reuse `notifications` |
| `announcements` | `announcements` | **REUSE** |
| `ops_rules` | **nothing** (closest: `ref_categories` for taxonomy, `automation_controls` for kill-switches, `workflow_definitions`+`authority_policies` for state machines) | **NEW** — genuinely missing. This is the value-add (thresholds as data). |
| `mess_meal_sessions` | `mess_days` (meal_date + meal_type window) | **REUSE/EXTEND** |
| `mess_tokens` | `mess_tokens` (HMAC-free) | **EXTEND** — add nonce + HMAC + device binding + atomic single-use |
| `mess_scan_log` | `mess_meal_served` (+ `mess_event_tokens`) | **REUSE/EXTEND** |
| `mess_menus` (weekly) | none | **NEW** (small) |
| `mess_item_interest_polls` / `_votes` | none | **NEW** (genuinely missing) |
| `leave_requests` chain | `leave_requests` (warden/parent/gate fields present) | **REUSE** |
| `permissions` chain | `permissions` | **REUSE** (it's the hostel pass chain already) |

## 2. Recommendation (for approval)

The spec's *intent* (single confirmation UI, single notification bus, rules-as-
data, anti-tamper mess tokens, weekly mess menu + interest polls) is sound, but
**most of its tables already exist under different names**. Building them as
written would fork the audit/chain/notification trail into parallel stores.

Proposed strategy (**reuse + extend + add-only-missing**):

1. **`ops_rules`** (NEW, the one genuinely-missing control plane) — operational
   thresholds as versioned data: `curfew_window`, `leave_threshold`,
   `mess_meal_cutoff`, `attendance_min_pct`, `confirmation_chain`,
   `notification_scope`. Everything else reads this; no hard-coded numbers.
2. **Notification** — extend the existing `notifications` table (add a
   `scope` + `event_type` discriminator if absent; it already has
   `recipient_type`/`channels[]`/`priority`). Do **not** create
   `notification_events`/`receipts`. Add a small `scope_members` materialized
   view only if `notifications.recipient_type` can't already express
   dept/hostel/class fan-out.
3. **Confirmations** — do **not** create a `confirmations` table. The role-
   agnostic "Confirmations" panel reads from `permissions` (multi-stage) +
   `pending_approvals` (maker-checker) + `leave_requests` behind one UI.
   `ops_rules(domain='confirmation_chain')` seeds the stage lists; the
   hostel-vs-academic segregation guard lives in a shared validator.
4. **Timetable** — extend `class_periods`/`class_session_markers` with
   versioning + a substitution log. No new `timetable_*` tables.
5. **Mess tokens** — extend existing `mess_tokens` (add `nonce`,
   `token_hash` HMAC, `redeem_device_id`, atomic single-use) instead of the
   spec's table. Keep `qr_payload_hash` for back-compat.
6. **Mess menu + interest polls** — the only truly-new tables:
   `mess_menus`, `mess_menu_items` is already a catalog so add
   `mess_weekly_items`, `mess_item_interest_polls`, `mess_item_interest_votes`.
7. **Hostel leave chain** — reuse `permissions` (it already routes
   guardian→warden→gate); `ops_rules` seeds the threshold→chain mapping.

## 3. Open decisions (need your call before building)

- **(a)** Confirm "reuse + extend + add-only-missing" (my recommendation) vs.
  "build the spec's tables literally" (accepts a parallel universe).
- **(b)** This is **6 subsystems** — same session build, or split? I'd build in
  the spec's own order (ops_rules → notification extend → confirmations panel →
  hostel chain → timetable → mess) and ship in increments, all in this session
  if you want, **no deploy until you say go** (per your standing policy).
- **(c)** The existing `notifications` table is legacy-shaped (id is `text`,
  `recipient_type` not `scope`). Do you want a thin new `notification_events`
  *alongside* it (cleaner for the bus) or extend the existing one? This is the
  one place "reuse" gets genuinely awkward. → **Resolved (a): extend the
  existing table** (see §4).

## 4. Shipped (20270131000005–08 + commits 55aa3016, 8e042605)

The "reuse + extend + add-only-missing" strategy was executed in this pass:

- **ops_rules** (new table + 22 seed rows) — versioned operational
  thresholds: curfew windows, leave thresholds, meal cutoffs, attendance
  minimums, confirmation chains, notification-scope grants. `lib/rules/
  service.ts` reads/writes it; `POST /api/rules` + `GET /api/rules`.
- **notifications extend** (+`event_type`, `scope`, `actor_role`) — the bus
  discriminator. `lib/notifications/bus.ts` resolves a scope (global/dept/
  hostel/class/mess/user) and fans out over the EXISTING
  `notification-service.sendNotification` (no parallel store).
- **mess_tokens extend** (+`nonce`, `token_hash` HMAC, `redeem_device_id`,
  `single_use`) — anti-tamper. `lib/mess/token.ts`: HMAC-SHA256
  issue/verify + atomic single-use redeem. `POST /api/mess/tokens/redeem`.
- **class_periods extend** (+`version_id`, `slot_status`,
  `substitute_faculty_id`, `substitution_reason`) — timetable versioning.
- **Genuinely-new mess tables** — `mess_menus`, `mess_weekly_items`,
  `mess_item_interest_polls`, `mess_item_interest_votes`, `mess_scan_log`.
  Menu/poll routes + `MenuEditor` / `InterestPollCard` UI wired into
  `/mess/menu-management`.
- **Unified confirmations** — `GET /api/confirmations/me` +
  `POST /api/confirmations/[id]/decide` (forwards to the existing
  `/api/permissions/[ticket]`), `lib/confirmations/chains.ts` hostel-vs-
  academic guard. `ApprovalInbox` extended with the new stage labels.
- **Workers** — `confirmation-sla`, `mess-poll-close`,
  `mess-anomaly-daily` registered in `worker/index.mjs`.
- **Tests** — `tests/unit/mess-token-security`, `tests/unit/
  confirmation-chain-guard`, `tests/gate/service/mess-token-redeem`
  (HMAC mutation, chain segregation, atomic-redeem race).

Verified: tsc 0 errors · unslop-ui 100/100 (0 findings) · vitest unit
344/344 · jest gate:node 161/161 · migrations applied to live DB, down
migrations validated in rollback. **No deploy** (build gate + your go-ahead
still pending, per the no-deploy policy).

