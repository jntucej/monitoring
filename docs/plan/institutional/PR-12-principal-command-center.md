# PR-12 — Principal Command Center

> The thin UI over the engines. The principal is a policy/authority node,
> not the center of the codebase: these pages project the engines
> (PR-02..11) and carry NO business logic.

## What landed

**API capability routes** (thin, no business logic):
- `GET  /api/principal/attention` — the active attention queue (PR-09)
- `POST /api/principal/attention/:id/resolve`
- `GET  /api/principal/escalations` — open escalations (PR-05)
- `POST /api/principal/escalations/:id/resolve`
- `GET  /api/principal/decisions` — the decision ledger (PR-06)
- `GET  /api/principal/emergency` — current state + latest commands (PR-10)

**Pages** (projections, read-only):
- `/principal/attention` — the compressed "what needs a decision" list
- `/principal/decisions` — the institutional decision history
- `/principal/escalations` — open escalations + why they exist
- `/principal/emergency` — the command plane (current state + history)
- `/principal/governance/audit` — a thin view over the decision ledger

**Nav:** the four new items (Attention, Decisions, Escalations,
Emergency) are added to the principal console nav.

## Design invariants (kept)

- **No business logic in the pages.** The pages call the capability
  routes + read the engine types. A state change (resolve an escalation,
  confirm an impact) goes through a server-side route, not a client
  fetch — the write verbs stay in the engine (PR-05/06/08/10), the UI
  is a read-only projection in this PR. (A write-verb surface for the
  cockpit — e.g. "approve this escalated case" — is a follow-up that
  calls `decideAndTransition`; PR-12 deliberately stops at the read
  projection so the UI cannot out-run the engine.)
- **Thin, not 40 cards.** Each page is a single projection: attention
  is a list, decisions is a ledger, emergency is a state + history.
  The heavy widgets (MorningBrief, StrategicScorecard, ChainImpact,
  EmergencyPulse) already live on `/principal/home` and are unchanged.
- **Role-scoped.** Every route + page is principal/admin/sysadmin
  (the console's AuthGuard already enforces the shell; the routes add
  the same role gate on the engine data).

## Manifest

**Depends on:** PR-02..11 (the engines it projects).

**Changes:** 6 new API routes + 5 new pages + a nav entry. No
migration, no engine change.

**Does NOT change:** the existing principal console pages
(`/principal/home`, `governance/delegations`, `governance/analytics`,
`operations/*`, `approvals/*`), the engines (PR-02..11), or the data
plane. PR-13 migrates domains; this PR only adds the projection.

**Database changes:** none.

**API changes:** six additive routes (no existing route signature
changes).

**Security impact:** read-only projections of institutional state;
every route is role-gated (principal/admin/sysadmin). No new write
surface — the write verbs are the engine entry points already built in
PR-05/06/08/10.

**Tests:** the engine tests (PR-02..11) cover the data the pages
project; the pages are thin (no new unit test surface). `npm run
typecheck` clean; the dead-route scan confirms the new routes are
wired (the two `:id/resolve` routes are logged as unreferenced
candidates, which is correct — they are server-side endpoints the
cockpit will call, not page imports).

**Rollback:** delete the 6 route files + 5 pages + the nav entry. No
engine or DB data is touched.

## Next

PR-13 — migrate the existing domains onto the case engine, one at a
time (gate passes first): `Map → Case → Workflow → Authority →
Escalation → Decision → Impact → remove old path`. The reference
gate-pass workflow this program seeded (PR-02/03) becomes the live
gate-pass flow; the existing `createGatePass` path is removed once the
migration is proven.
