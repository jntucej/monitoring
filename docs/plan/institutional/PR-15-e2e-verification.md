# PR-15 — End-to-End Verification (the three complete chains)

> "Finally verify complete chains." The three complete institutional
> chains the plan calls for, each running the real engines
> (case → workflow → authority → escalation → decision → impact →
> audit) against a scratch DB and asserting the durable artifacts at
> every step.

## The three chains

### 1. Hostel leave (the 4-link reference chain)

```
Student → Hostel Manager → Deputy Warden → Principal
→ Decision → Impact → Gate permission → Notification → Audit
```

**What the test asserts:**
1. The case opens in `CREATED` → `OPEN` (the workflow instance starts
   at `submitted`).
2. `route_manager` moves `submitted` → `manager_review` (routing ops
   are open to whoever holds the current state's role; the terminal
   op's authority question is where the bound is actually tested).
3. The manager's 3-day bound refuses a 10-day leave →
   `AUTHORITY_INSUFFICIENT` escalation (PR-05) + a CRITICAL attention
   item (PR-09). The case stays put.
4. `route_deputy` moves `manager_review` → `deputy_review`.
5. `route_principal` moves `deputy_review` → `principal_review` (the
   deputy's 7-day bound also refuses 10 days, so they route up).
6. The principal approves (no duration bound) → a durable decision
   (PR-06) is recorded; the case moves to `approved`.
7. The impact preview (PR-08) is computed + stored: the hostel + gate
   systems the leave affects.
8. The audit trail is the durable record: a `decisions` row + the
   authority that allowed it.
9. The escalation from step 3 landed on the attention queue.

### 2. Debarment (the academic-status chain)

```
HOD → Academic-status case → SoD check → Principal
→ Decision → Impact preview → Confirm → Exam restriction
→ Gate restriction → Audit
```

**What the test asserts:**
1. An `academic_status` case is opened + moved to `OPEN`.
2. The HOD has no debar authority (principal-only) → `authorize`
   refuses for the HOD.
3. The principal's SoD check passes (they did not originate the
   request, they have the authority).
4. The principal's authority check passes.
5. The durable decision record is produced: `DEC-YYYY-NNNN`, role
   context `chief_warden`, authority source `role`.
6. The impact preview (exam eligibility + gate permissions + hostel +
   passes) is computed + stored + confirmed before execution — no
   blind execution.

### 3. Emergency (the security-incident chain)

```
Security incident → Risk engine → Emergency state
→ Principal command → Gate restrictions → Notifications
→ Audit → Post-incident review
```

**What the test asserts:**
1. A `security_incident` case is opened + moved to `assessed` (the
   risk engine's state).
2. The emergency command is issued by the principal under the
   `emergency_command` context (the single emergency-commander).
3. The institution's current emergency state is now `LOCKDOWN`.
4. The command landed on the attention queue as `CRITICAL` (the
   principal + operators see it).
5. The incident case is linked to the emergency command (the risk
   engine's output is the command; the case tracks the incident).
6. The audit row is the durable record: `emergency.command_issued`
   with who → what → why → scope.
7. The mandatory post-incident review closes the command
   (`review_status`: `PENDING` → `COMPLETE`).

## What landed

**`tests/unit/institutional-e2e.test.ts`** — the three chains, each
running the real engines against a scratch DB (skipped cleanly when
`DATABASE_URL` is unset). 3 tests, all pass against
`postgres://postgres:postgres@127.0.0.1:5435/gm_scratch`.

**`database/migrations/20270130000006_institutional_reference_domains.sql`**
+ `.down.sql` — the `academic_status` + `security_incident` workflow
definitions + their authority policies (the two reference domains the
chains need). Idempotent.

**`src/lib/institutional/workflow.ts`** — three engine fixes the
chains surfaced:
- `evaluateBounds`: now checks both camelCase (`durationDays`) and
  snake_case (`duration_days`) request fields against `max_*` bounds.
  A 10-day request now correctly exceeds the 3-day manager bound.
- `resolveWorkflowTarget`: now maps the reference domain actions
  (`debar` → `debarred`, `restore` → `restored`, `assess` → `assessed`,
  `contain` → `contained`, `escalate_emergency` → `emergency`,
  `close` → `closed`).
- Routing ops (`route_manager` / `route_deputy` / `route_principal`):
  now bypass the authority gate (they're workflow transitions, not
  authority-gated decisions). The terminal op (`approve`) is where the
  authority question is actually asked.

**`src/lib/institutional/decisions.ts`** — `InstitutionalTransition`
now carries `resultingState` (the workflow state the case moved to;
`null` when escalated). The routing-op bypass is mirrored here.

**`src/lib/institutional/emergency.ts`** — the `emergency_commands`
INSERT now casts all params explicitly (`$3::uuid`, `$9::int`, etc.)
so an untyped `null` for `lockdown_id` or `duration_hours` doesn't
break the query. The `reviewEmergencyCommand` UPDATE uses `$2` in the
SET clause so all 5 params are typed.

**`src/lib/institutional/contracts.ts`** — `StandardOperation` +
`DecisionType` now include the three routing ops (`route_manager`,
`route_deputy`, `route_principal`).

**`tests/unit/institutional-contracts.test.ts`** — the standard-ops
assertion updated to include the routing ops.

## Manifest

**Depends on:** PR-02 through PR-14 (the full institutional loop).

**Migration required:** `20270130000006_institutional_reference_domains.sql`
(new: the two reference domain definitions + their authority policies).

**Database changes:** two new `workflow_definitions` rows
(`academic_status`, `security_incident`) + six new
`authority_policies` rows (the reference domain actions). No table
schema changes.

**API changes:** none (the E2E tests call the engine functions
directly, not the HTTP routes).

**Security impact:** the routing-op bypass is the correct behavior:
routing a case forward is a workflow transition, not an authority
decision. The authority question ("can I approve this?") is asked at
the terminal op. A student can route a leave to the manager (they
submitted it); the manager's 3-day bound is what actually gates the
approval.

**Tests:** 154 unit tests pass (24 files), including the 3 E2E chains
against a scratch DB. All 154 pass without `DATABASE_URL` set (the
DB-backed tests skip cleanly).

**Rollback:** delete the E2E test file + the migration. The engine
fixes (routing bypass, bounds field lookup, workflow target mapping)
are safe to keep — they make the existing engine correct, not just
for the E2E tests.
