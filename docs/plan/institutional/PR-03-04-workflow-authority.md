# PR-03 (Workflow Engine) + PR-04 (Authority Engine)

> PR-03 and PR-04 of the institutional architecture program. They are
> deployed together (one migration) because they are inseparable: a
> workflow transition is *the place* where authority is checked. The
> case moves only when the authority engine says it may move.

## PR-03 — Workflow Engine

**Goal:** make cases move through states without hard-coded route logic.

**Changes:**
- `workflow_definitions` — configurable state machines. `states` +
  `transitions` (from_state → [action, ...]) + `transition_roles`.
  Seeded with the two reference workflows (`gate_pass`, `hostel_leave`)
  matching the universal state names from PR-01/PR-02.
- `workflow_instances` — a case's place in one definition (current_state
  + authority_source, frozen per transition).
- `workflow_transitions` — the immutable step log (from, to, action,
  actor, role_context, the authority_ids that allowed it, conditions_met).
- `transitionWorkflow(caseId, action, actor, definition, bounds)` —
  loads the instance, validates the allowed transition, calls
  `authorize()`, and only then records the step. The step is appended to
  the immutable log; a refusal is also recorded (for PR-05 to escalate).

**Does NOT change:** existing `permission-workflow.ts` / `WORKFLOW_STAGES`
(the ticket-domain stage machine). The workflow engine is the institutional
case layer; `WORKFLOW_STAGES` is the approver-surface stage machine. Both
are pure and coexist.

**Exit condition (met):** a case moves through a *configurable* workflow
without hard-coded route logic — the `gate_pass` and `hostel_leave`
definitions in the DB drive the moves; the engine reads them, it does not
re-implement them.

## PR-04 — Authority Engine

**Goal:** separate WHO YOU ARE (role) from WHAT YOU MAY DO (bounded
authority). A role existing is *never* enough to transition a case — the
authority engine decides.

**Changes:**
- `role_contexts` — the registry of institutional hats (the PR-01
  `RoleContext` set, now queryable + self-describing). `chief_warden` and
  `chief_superintendent` are contexts, not roles.
- `authority_policies` — the WHAT-YOU-MAY-DO rules: role + context +
  operation + case_type + bounded scope + `bounds` (jsonb) + version.
  Seeded with the reference policies (hostel_manager ≤3 days,
  deputy_warden ≤7 days, principal all durations) for both `gate_pass`
  and `hostel_leave`.
- `authorize(req: AuthorityRequest): AuthorityDecision` — answers "may
  this actor do this operation on this case type within these bounds?"
  It consults the active policies AND the delegation table (an active
  delegation satisfies a policy that requires a role the delegatee does
  not directly hold). The decision cites the exact policy code (+
  delegationId when satisfied via a delegation), so PR-06's decision
  record and PR-11's audit ledger can pin the authority source.
- `hasActiveDelegation` + delegation-aware policy matching in one query
  (no N+1): a row matches if the actor's role is the policy's role, OR
  the actor holds an active, unrevoked, in-window delegation to that
  role within scope.

**Exit condition (met):** "You cannot transition a case merely because
your role exists. The authority engine decides." — a `hostel_manager`
with a 15-day request is *refused* (bound is 3 days), the instance stays
put, and the refusal is recorded for escalation; the same case approved
by the `principal` (no duration bound) moves to `approved`.

## Shared manifest (both PRs)

**Depends on:** PR-01, PR-02.

**Migration required:** `20270130000002_institutional_workflows_authority.sql`
(+ `.down.sql`). Two independent subsystems in one file; each is
idempotent; the down file drops in reverse dependency order. No domain
data is moved.

**Database changes:** five new tables (`workflow_definitions`,
`workflow_instances`, `workflow_transitions`, `role_contexts`,
`authority_policies`). `workflow_instances.case_id` → `cases.id`
(PR-02). `authority_policies.scope_code` mirrors `entity_scopes.entity_code`.
No RLS on the universal tables in this PR (admin manages, gate_app
reads) — same pattern as PR-02.

**API changes:** none yet (the workflow/authority surface is the engine
API in `src/lib/institutional/workflow.ts`; the HTTP routes land with
PR-06's decision engine, which is the natural caller).

**Security impact:** this is the PR that makes authority *decided*, not
assumed. The engine refuses on bounds-exceeded (→ escalation, PR-05)
and cites the exact policy + delegation that allowed a decision (→
audit, PR-11). Delegation-awareness means a delegatee can act within an
active grant, but only within the grant's scope + window — nothing is
permanent.

**Tests:** `tests/unit/institutional-workflow.test.ts` (9 assertions;
3 DB-backed: the gate_pass walk with a refused-then-approved sequence,
plus a direct `authorize()` call that cites the policy code).

**Rollback:** `.down.sql` drops the five tables; delete the engine file.
No domain data is affected.

## Next

PR-05 (Escalation + SLA) is generated by policy, not frontend code:
`escalations` + `sla_instances` rows, where the "authority exceeded"
refusal recorded by this PR becomes an `escalation` row that the
Executive Attention Engine (PR-09) surfaces to the principal with an
explicit reason.
