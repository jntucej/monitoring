# PR-02 — Case Engine

> PR-02 of the institutional architecture program. PR-01 landed the
> shared vocabulary; PR-02 builds the universal Case system on top of it.
> The reference workflow this PR wires is a **gate-pass case**: a gate
> event opens a `GATE_PASS` case and it walks CREATED → OPEN → RESOLVED →
> CLOSED. No principal-specific code is touched.

## PR-02 manifest

**Depends on:** PR-01 (contracts).

**Changes:**
- `database/migrations/20270130000001_institutional_cases.sql` + `.down.sql`
  — three universal tables (`cases`, `case_events`, `case_evidence`) +
  `updated_at` trigger. All idempotent; the down file drops them.
- `src/lib/institutional/cases.ts` — `createCase`, `transitionCase`,
  `getCase`, `listCases`, `addCaseEvidence`, `addCaseEvent`, `LIFECYCLE`.
- `src/app/api/cases/route.ts` — `POST /api/cases`,
  `GET /api/cases?type=&state=&scope=&subject=`.
- `src/app/api/cases/[id]/route.ts` — `GET /api/cases/:id`,
  `GET /api/cases/:id/events`, `POST /api/cases/:id/events`.
- `tests/unit/institutional-cases.test.ts` — pure lifecycle assertions +
  DB-backed CRUD chain (skips cleanly without `DATABASE_URL`).

**Does NOT change:** existing domain workflows, `permission-model.ts`,
`escalation-ladder.ts`, `academic-workflow-engine.ts`, Principal UI,
domain tables. The case layer sits ABOVE the domains (PR-13 migrates one
domain at a time), not inside them.

**Migration required:** yes — `20270130000001_institutional_cases.sql`
forward + `.down.sql` rollback. No domain data is moved or copied;
`case_evidence` only links to existing record ids.

**Database changes:** three new tables + one trigger. `cases.entity_scope`
mirrors `entity_scopes.entity_code`. `case_events.role_context` is frozen
at write time (self-describing stream). No RLS on the universal tables in
this PR — `gate_app` writes, `admin` manages, following the
`entity_foundation.sql` pattern; domain RLS stays untouched.

**API changes:** four new routes (all additive; no existing route
signature changes).

**Security impact:** minimal, deliberately additive. Case reads are open
to any authenticated role; event-stream writes require a case-writer
role. The authority question ("may this actor act on this case *type*?")
is intentionally NOT answered by this route — it belongs to PR-04's
authority engine. This keeps the route domain-agnostic.

**Tests:** `npx vitest run tests/unit/institutional-cases.test.ts`
(9 assertions; 4 DB-backed ones run when `DATABASE_URL` is set, which CI
provides via `postgres:17-alpine`). Migration replayed clean on a
scratch `supabase/postgres:17` container (`0` errors on forward + down).

**Rollback:** `psql -f database/migrations/20270130000001_institutional_cases.down.sql`
then delete the four new source files. No domain data is affected.

**Acceptance criteria (met):** you can create and track a case without
touching Principal-specific code — proven by the gate-pass reference
workflow in the test (`CREATED → open → resolve → close → CLOSED`).

## Next

PR-03 (Workflow Engine) makes cases move through states: it stores
`workflow_definitions` + `workflow_instances` + `workflow_transitions`
and calls `transition(case, action)`, validating current_state,
allowed_transition, actor, authority, and conditions.
