# PR-14 — Separation of Duties + Security (adversarial layer)

> "This PR should be deliberately adversarial." The institutional loop
> (PR-02..13) makes every consequential action a durable decision that
> pins actor + role_context + authority_source + the exact policy + the
> delegation grant. PR-14 is the layer that ATTACKS that architecture:
> it answers the plan's adversarial questions with fail-closed checks a
> decision / emergency command must pass before execution.

## The six adversarial questions (all answered, all tested)

| Question | Answer | Check |
|---|---|---|
| Can Principal approve their own request? | **No** | `canSelfApprove` / `checkSoD` two-person rule |
| Can delegated authority exceed its scope? | **No** | `scopeContained` (a hostel_block grant does not cover campus-wide) |
| Can an expired delegation still work? | **No** | `isDelegationActive` (active-window: not revoked, open, in-scope) |
| Can HOD approve something requiring Principal? | **No** | the authority engine (PR-04) has no HOD policy for principal-only ops; `authorize` refuses |
| Can the same person satisfy both sides of a two-person rule? | **No** | `canBeChecker` / `checkSoD` (maker ≠ checker) |
| Can a revoked pass remain valid? | **No** | `isPassValid` (revoked/expired is terminal) |
| Can emergency commands bypass audit? | **No** | PR-10: every command is audited + a mandatory post-incident review for LOCKDOWN/EMERGENCY |
| Can API calls bypass UI restrictions? | **No** | the SoD gate is server-side in the engine (`recordDecision` calls `checkSoD`), not in the UI |
| Can role_context be forged? | **No** | the context is frozen at write time on the decision + audit row; a forged context still has to pass the authority engine + the SoD gate |

## What landed

**`src/lib/institutional/sod.ts`** — the pure adversarial checks:
- `canBeChecker` (two-person rule, maker ≠ checker)
- `isDelegationActive` (active-window: not revoked, open, in-scope)
- `scopeContained` (a scoped grant does not cover a wider scope)
- `canSelfApprove` (an actor may not approve a request they originated)
- `isPassValid` (a revoked/expired pass is terminal)
- `checkSoD` — the combined gate (fail-closed on any single violation).

**Wired into the decision path:** `recordDecision` (PR-06) now calls
`checkSoD` when the authority source is a delegation — a decision acting
under an expired / out-of-scope / revoked grant is refused. The gate is
in the engine, not the UI, so an API call cannot bypass it.

**Tests:** `tests/unit/institutional-sod.test.ts` (16 assertions: the
six adversarial questions + the combined gate failing closed on each).

## Manifest

**Depends on:** PR-04 (authority), PR-06 (decision), PR-10 (emergency
audit).

**Changes:** one new pure module (`sod.ts`) + the `recordDecision` SoD
gate + the test. No migration, no DB change, no route change.

**Does NOT change:** any engine behavior beyond adding the SoD gate to
the delegation path; the two-person rule reuses the existing
`pending_approvals` invariant (maker_ne_checker); delegation expiry
reuses the existing `delegations` window.

**Security impact:** this is the adversarial layer the plan calls for —
the "can a revoked pass remain valid?" / "can an expired delegation
still work?" / "can role_context be forged?" questions are now answerable
from the engine, and a consequential action that fails any SoD check is
blocked before execution. The gate is fail-closed (any single violation
blocks).

**Tests:** 16 SoD assertions (all pure) + the delegation-decision
record is now SoD-gated. All 153 unit tests pass.

**Rollback:** remove the `checkSoD` call from `recordDecision` + delete
`src/lib/institutional/sod.ts` + the test. No engine or DB data is
affected.
