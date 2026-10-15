# Post-Consolidation DB Verification (PHASE 6 — Agent C / DB workstream)

Scope: integrity + data integrity of the warden→principal consolidation for the
fresh-DB path and the existing-DB path. Verified by code/migration inspection —
**NOT** by running against a live DB (no credentials available; the CI replay
harness `scripts/check-migrations.sh` + `scripts/check-schema-drift.sh` replay
`database/schema.sql` baseline + all migrations in sorted order, which is the
executable check).

## 1. Migration up/down summary + idempotency verdict

**Up** (`20261125000001_warden_principal_consolidation.sql`, runs in a
single `BEGIN/COMMIT` transaction):

1. `UPDATE config_roles_registry SET is_active=FALSE WHERE code='warden'` —
   the live role gate via `trg_validate_user_role`. Idempotent (second run is
   a no-op). Row kept for audit.
2. Reassigns `users.role='warden'` → `'hostel_manager'` via a 1:1 self-join on
   `id`; `assigned_hostel` is carried over
   (`COALESCE(target.assigned_hostel, src.assigned_hostel)`), so hostel-block
   scoping survives. After step 1 no NEW warden row can be created (trigger),
   so the reassignment target set is stable. Idempotent: on re-run the
   `src.role='warden'` predicate matches zero rows.
3. `UPDATE config_exit_reasons SET approval_by='principal'
   WHERE approval_by='warden'` — reconciles the data/code disagreement (TS
   default is already `'principal'`). Idempotent (predicate fails on re-run).
4. `CREATE OR REPLACE is_warden()` deprecation shim: returns true for
   `role IN ('principal','warden')` — `SECURITY DEFINER`, `search_path TO
   'public'`, exception-safe (returns FALSE on error). `get_warden_hostel()`
   deliberately unchanged (still returns `users.assigned_hostel`, which
   remains the correct scoping source now that principal owns the hostel).
5. `DROP CONSTRAINT users_role_check` + `ADD` with the full array minus
   `'warden'`, including `principal`. The hard-coded array matches exactly the
   constraint produced by the migration chain immediately prior (lab access
   + mess system spliced onto the 20261014000006-era list), so no role is
   silently dropped; all surviving user roles are retained. Idempotent
   (drop+add of the same definition).
6. Self-record into `schema_migrations` (adaptive to 3 column shapes),
   `ON CONFLICT (version) DO NOTHING` — idempotent.

**Verdict: the up-migration is idempotent-safe and non-destructive to
history.** It touches no audit/stage-history/delegation rows;
`student_details.warden_id`, `users.assigned_hostel`,
`deputy_warden`/`hostel_manager`/`caretaker` and the
`warden_or_principal` stage string are all preserved.

**Down** (`20261125000001_warden_principal_consolidation.down.sql`):
re-activates the registry row, restores the is_warden body, restores the
CHECK with 'warden', reverses `approval_by` for `home_out`/`day_pass`, and
reverts the reassignment. Rollback is test-only; known limitation (also in
the plan doc): approval rows created after the up-migration are not covered.

## 2. `validate_user_role` trigger verdict

`20261010000000_role_registry.sql` creates
`validate_user_role()` + trigger `trg_validate_user_role`
(`BEFORE INSERT OR UPDATE OF role ON users`): it raises
`'Invalid or inactive role: %'` unless the new role has an **active**
`config_roles_registry` row.

After the up-migration:

- `role='warden'` on NEW/UPDATE → registry row is `is_active=FALSE` →
  **blocked** (as intended).
- `role='principal'` → registry row active → **allowed**.
- The up-migration's own warden→hostel_manager reassignment runs BEFORE the
  registry deactivation order matters only for warden itself;
  `hostel_manager` has an active registry row, so the reassign never trips
  the trigger, and it never sets `role='warden'`, so it cannot fail on a
  re-run.

**Verdict: correct — the trigger blocks 'warden' and allows 'principal'.**
No defect.

## 3. RLS / function audit (every `is_warden()` / `role='warden'` caller)

All RLS policies reference `is_warden(...)`; none compare
`role = 'warden'` directly in policy bodies (checked schema.sql +
migrations). After the shim, `is_warden` returns true for principals, so
every policy that previously granted warden access now grants the same access
to principal — shim-correct.

| Caller | Location | Verdict |
|---|---|---|
| `sdetails_select_warden` (student_details; `is_warden AND hostel_block = get_warden_hostel`) | schema.sql:831 | shim-correct (principal now scoped to own assigned hostel) |
| `mlog_select_staff`, `mlog_insert_staff` | schema.sql:845-849 | shim-correct |
| `dstats_select_staff` | schema.sql:854 + recreated by 20261022000001:12-16 | shim-correct |
| `occ_select_staff` | schema.sql:862 | shim-correct |
| `passes_select_staff`, `passes_update_approvers` | schema.sql:876-882 | shim-correct |
| `operator_read_gate_passes` (`OR is_warden(auth.uid())`) | 20260916000000 §6, line 232 | shim-correct |
| `is_warden` original body | schema.sql:497, 20260101000001:12 | baseline only — overridden by the consolidation migration (verified chain order: 20260101000001 < 20261125000001) |
| `users` inline `CHECK (role IN (... 'warden' ...))` | schema.sql:43 | **not the live constraint** — Postgres names it `users_role_check`, which 20261009000000 drops/re-adds and which the consolidation migration re-adds without 'warden'. schema.sql remains the pre-migration baseline as designed. OK. |
| `process_gate_scan` caller gate `NOT IN ('operator','admin','sysadmin','warden')` | 20261013000100:27 | **DEAD reference (defect, fixed)** — after consolidation no user can carry role='warden', so a principal invoking the scan function hit FORBIDDEN. The TS side already moved the override list to `['admin','sysadmin','principal']` (src/server/services/scan/record.ts:55), proving principal is the intended grant. |

No SECURITY DEFINER function breaks: `is_warden` (shim) and
`get_warden_hostel` (unchanged) keep their signatures, volatility and
privileges; only the boolean result set for 'principal' changed, which is the
intended behavior.

## 4. Fresh-DB path

`scripts/check-migrations.sh` / `check-schema-drift.sh` replay
`database/schema.sql` then every migration in sorted-filename order with
`ON_ERROR_STOP=1`. The chain reaches the consolidation migration as the last
role-related change (20261125000000 kiosk session hardening precedes it).

- No migration fails out-of-order *for the consolidation*: it is a leaf
  migration (later migrations only reference it implicitly via
  schema_migrations self-record conventions; nothing after it depends on
  'warden'). The `users_role_check` hard-coded array was verified against the
  definition produced by 20261112000001 + 20261110000000 + 20261014000006,
  so the DROP+ADD cannot reject any existing row on a replay with data.
- After the full chain: no user can hold `role='warden'` (CHECK dropped it;
  trigger blocks it; registry row inactive), and principal owns hostel
  management (is_warden shim + get_warden_hostel scoping +
  `warden_or_principal`/`principal` stages in TS:
  src/app/api/permissions/route.ts:145-173, src/app/api/attention/queue/route.ts:135-137).
- `20261112000001` step 4 (`grant mess_incharge to role='warden'`) is a
  **no-op on the fresh path** (runs before consolidation, no warden rows
  exist in a seeded fresh DB; idempotent ON CONFLICT DO NOTHING). It is the
  only residual 'warden' predicate in an old migration — harmless, left in
  place (rewriting historical migrations for a no-op is not warranted).

**Verdict: fresh-DB path is sound** (modulo the two fixes below, neither of
which changes replay ordering).

## 5. Existing-DB path

- The migration is idempotent-safe (all UPDATEs are predicate-guarded; see §1).
- Historical audit/stage/delegation logs are untouched. The reassignment is
  safe: the single warden user is updated by a 1:1 id-join and
  `assigned_hostel` is explicitly copied (not lost); the user lands in
  `hostel_manager`, the closest surviving hostel role — a deliberate choice
  (a verified principal account exists separately; no auto-promotion).
- The **down** migration had two real defects (fixed, below): its reassign
  reversal targeted `role='hostel_manager' AND assigned_hostel IS NOT NULL`,
  which would demote legitimate hostel_manager accounts created after the
  up-migration (e.g. the mess-system seed) back to 'warden', and it used an
  audit action name that does not exist in this codebase.

## 6. `config_exit_reasons` reconciliation verdict

- **DB (post-migration):** `home_out`/`day_pass` seed rows carry
  `approval_by='warden'` (20261008000000:44-45); the consolidation UPDATE
  flips them to `'principal'`. Final state: only `'none'` and `'principal'`
  are valid `approval_by` values.
- **TS:** `src/app/api/config/exit-reasons/route.ts` `DEFAULT_EXIT_REASONS`
  (lines 35, 45) use `approvalBy: "principal"`, and the manager UI
  (`src/components/admin/ExitReasonsManager.tsx`) dropped 'warden' from
  `APPROVAL_TARGETS` (audit doc row 6). POST/PATCH pass `approvalBy` through
  to `approval_by` with no 'warden' literal.
- **DB + TS agree: reconciled.**

## 7. Fixes made (2 real defects)

1. `database/migrations/20261013000100_harden_scan_and_user_functions.sql:27`
   — `process_gate_scan` caller-role gate still allowed only
   `'warden'` instead of `'principal'`. After consolidation, principals
   invoking the scan RPC were rejected with FORBIDDEN, while the TS side
   already lists principal in `OVERRIDING_ROLES` — a data/code disagreement
   of the same kind the consolidation was meant to remove. Fixed the
   historical migration in place (genuine bug, not a rewrite):
   `'warden'` → `'principal'`. (`process_gate_scan` is not recreated by any
   later migration, so this file owns the live definition.)
2. `database/migrations/20261125000001_warden_principal_consolidation.down.sql`
   — reassign reversal: replaced the unsafe
   `role='hostel_manager' AND assigned_hostel IS NOT NULL` predicate with an
   audit-trail-anchored UPDATE
   (`audit_logs.action='ROLE_CHANGED'`, `details.old_role='warden'`,
   `details.new_role='hostel_manager'` — the action written by
   `create_audit_log_on_user_change`, 20260101000003:76), and corrected the
   stale `a.created_at` column reference (audit_logs' timestamp column is
   `timestamp`). The reversal now targets only accounts whose role change is
   provably the consolidation's, is idempotent, and is a no-op on a fresh DB.

No new migration files were added (both fixes fit in the appropriate
existing files; no `20261125xxxxxx` was needed).

## 8. Explicit note

Verified by **code/migration inspection only** — not executed against a live
DB (no credentials available). To execute the fresh-DB path, run
`scripts/check-migrations.sh` (docker scratch Postgres replay); to validate an
existing DB, apply the up-migration on a restore and check §3 of
`docs/quality/warden-principal-migration-plan.md`. `npx tsc --noEmit` passes
(no TS changes were required).
