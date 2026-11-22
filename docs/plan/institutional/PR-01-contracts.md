# Institutional Architecture — PR-01 (Foundation / Domain Contracts)

> Part of the 15-PR program that turns the app from "Principal's pages" into
> an institutional decision architecture where the Principal is a policy/
> authority node consuming and issuing decisions, not the center of the
> codebase. Each PR leaves the system working; none of them deploy
> automatically — deployment is a separate human step.

## PR-01 — what landed

**Depends on:** nothing (foundation).
**Changes:**
- `src/lib/institutional/contracts.ts` — the shared vocabulary every later
  engine imports: `CaseType`, `CaseState`, `WorkflowState`,
  `AuthorityScope`, `StandardOperation`, `RoleContext`, `RiskLevel`
  (ordered), `EscalationReason`, `DecisionRecord`, `AuditEvent`,
  `EmergencyState` (ordered), `AttentionItem`, `Actor`.
- `tests/unit/institutional-contracts.test.ts` — locks the contract shapes
  (lifecycle sets closed, risk ordering, role-vs-context separation,
  decision provenance fields).

**Does NOT change:** workflow execution, authority evaluation, escalation
logic, delegation logic, Principal UI, existing domain workflows,
existing `permission-model.ts` / `escalation-ladder.ts` /
`academic-workflow-engine.ts` (PR-02+ will build on top of these; this PR
composes, it does not fork).

**Migration required:** none. No tables, no enums, no RLS changes — this is
a pure TS type + constant module.

**Database changes:** none.

**API changes:** none.

**Security impact:** none directly. Establishes the convention that every
consequential record pins `actor + role + role_context + authority_source`,
which PR-04 (authority) and PR-11 (audit hardening) enforce.

**Tests:** `npx vitest run tests/unit/institutional-contracts.test.ts`
(15 assertions). `npm run typecheck` clean.

**Rollback:** delete the two files; nothing else references them yet.

**Acceptance criteria (met):** every later PR can `import from
"@/lib/institutional/contracts"` instead of inventing its own structures.

## The full program (15 PRs, dependency-ordered)

PR-01 contracts → PR-02 case engine → PR-03 workflow engine → PR-04
authority engine → PR-05 escalation + SLA → PR-06 decision engine →
PR-07 delegation engine → PR-08 ChainImpact → PR-09 executive attention →
PR-10 emergency command → PR-11 audit hardening → PR-12 Principal Command
Center UI → PR-13 domain migration → PR-14 SoD + security → PR-15 E2E
verification.

## Mapping onto existing machinery (compose, don't fork)

| PR-01 contract | already exists as |
|---|---|
| `Domain` set | `LADDER` in `escalation-ladder.ts` |
| Tier × Domain × Flag `canAct` | `permission-model.ts` |
| Policy rules + autonomy L0–L6 | `academic-workflow-engine.ts` + `policy_rules` table |
| `delegations` (TTL, scoped) | `entity_foundation.sql` + `src/app/api/delegations/graph` |
| `audit_events` (role_context, delegation_id) | `entity_foundation.sql` |
| Maker-checker two-person rule | `pending_approvals` |
| Leave chain state machine | `leave_requests` (DRAFT→WARDEN_APPROVED→…) |
