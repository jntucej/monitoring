# PR-02 — Principal Experience: Shared Interaction Contracts (ADR)

Status: implemented (contracts module) — `src/lib/principal/contracts.ts`.

## Decision: one thin contracts layer, no new domain models, no new framework

The Principal Experience programme needs a shared language across the
inspection, relationship, timeline, action, execution, and workspace layers.
The decision is to add **one small module** (`src/lib/principal/contracts.ts`)
of *presentation + client-state* types, and **reuse the inspection model that
already exists** rather than duplicate it.

## What is reused vs. new

| Concern | Reuse (existing) | New (this PR) |
|---|---|---|
| Inspection shape | `EntityInspection`, `InspectionSection` (@/components/shared/EntityInspector) | `PrincipalEntityRef`, `PrincipalEntityContext`, `EntityInspectionBuilder` |
| Domain records | the domain models in `inspectionModels.tsx` (Gate, Scan, Visitor, Ticket, Complaint…) — **unchanged** | — |
| Relationships | verified API relationships per domain | `PrincipalRelationship` (with `available`/`unavailableReason` — never invented edges) |
| Timeline | `Timeline` + `/api/attention/timeline` (entity events); institutional stream is a separate source | `PrincipalTimelineEvent` (+ `scope: entity\|institutional`), honest audit refs |
| Actions | existing approval/decision route handlers | `PrincipalActionDefinition` (presentation only; **server stays authoritative**) |
| Execution | — | `PrincipalExecutionState`, `PrincipalActionResult` (IDLE→…→COMPLETED/FAILED/PARTIAL/UNKNOWN→revalidate) |
| Workspace | Next.js routing + URL params; `useEntityInspector` local state | `PrincipalWorkspaceContext` (what belongs in the URL vs. local) |

## Where authority lives
- **Permission + action outcome: the server.** Client types carry
  `available` / `unavailableReason` as best-known presentation; the request
  always goes to the authoritative route (withAuthorization / withMutationGuard
  / RLS). Never infer a grant from a visible button.
- **Entity identity: real records.** `PrincipalEntityRef.id` is a real record
  identifier. Unknown `PrincipalEntityType` values fail safe in the inspector
  (unknown kinds are not in the closed set → the inspector renders a
  "cannot inspect" state), not by string-parsing.
- **Relationships/timelines: verified data.** `available: false` is a valid
  value; missing/inaccessible is shown honestly; no edges or events are
  fabricated.

## What state goes where (PR-03 contract)
- **URL (shareable / refresh-safe):** active workspace, a filter that should
  be shareable, the inspected entity, and `returnTo`. Modeled by
  `PrincipalWorkspaceContext`.
- **Local (transient):** inspector open/collapsed, current step/tab,
  in-flight execution state, scroll position.
- **Server-owned:** everything authoritative (permission state, entity
  status, relationships, timeline events, execution outcome). The client
  never owns these; it revalidates after an action.
No second global store; `useEntityInspector` + a small URL-sync hook are
enough.

## Why these abstractions exist
They let every domain inspector, the relationship section, the timeline, and
the execution layer speak one language, so PR-04 (unified inspector),
PR-06/07 (timeline/relationships), and PR-09–11 (decision/execution) compose
instead of re-inventing. Each abstraction has ≥2 real use cases
(entity + relationship + timeline; execution + feedback; workspace + deep-link).

## Non-goals / rejected alternatives
- **A graph engine for relationships** — rejected until the audit shows a
  concrete data-volume need; a clear related-record list is the default.
- **A new state library / framework** — rejected; Next routing + a URL-sync
  hook + existing hooks are sufficient.
- **Client-side authorization** — rejected; server stays authoritative.
- **Opaque AI priority score as the decision authority** — rejected (doc
  §PR-12); metrics show real sources + definitions + drill-downs.

## Type-level validation
The module is compiled by `tsc --noEmit`. The closed
`PrincipalEntityType` set + `PrincipalExecutionState` union are exhaustive
where consumed. Adding a new entity kind is a deliberate, reviewed change to
the union (the "registry" rule).

## Rollback
Delete `src/lib/principal/contracts.ts` + the ADR. Nothing depends on it yet
(PR-01 is docs-only; Stage B1 uses existing shared components, not these
types). Later PRs import from here.
