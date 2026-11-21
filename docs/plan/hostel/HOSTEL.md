# HOSTEL — Complete Feature & Role Reference

**Scope:** the hostel system — blocks, residents, occupancy, the leave/gate
chain, housekeeping/maintenance, complaints, incidents, and mess
adjacency. Who does what, how it routes, and how the UI pieces interact.

**Verified against:** `src/app/(approver)/hostel-manager/*`,
`src/app/warden/page.tsx`, `src/app/api/hostel/*`,
`src/app/api/hostel-manager/*`, `src/app/api/deputy-warden/*`,
`src/app/api/caretaker/*`, `docs/hostel-hierarchy.md`.

---

## 1. What the hostel system does

JNTUH CEJ has **4 hostel blocks** (2 boys + 2 girls), each with a
Deputy Warden. The system tracks:
- **who's where** — occupancy per block/room, returns timeline
- **the leave chain** — a hosteller going out is a 4-link approval
  (student pass → deputy_warden → parent ack → operator scan)
- **the chain of command** — a four-level hostel-approval hierarchy
- **maintenance & housekeeping** — tickets routed by block
- **incidents** — with a two-person sign-off (chief warden / principal)
- **mess adjacency** — meal tokens / consumption (separate doc, shares the
  block entity)

---

## 2. The hostel hierarchy (from `docs/hostel-hierarchy.md`)

A four-level approval chain, referenced L1–L4:

| Level | Role code | Direct-generate | Can forward | Step-up password |
|---|---|---|---|---|
| L1 | `caretaker` | No | To L2 only | (per rules) |
| L2 | `deputy_warden` | Yes | To L3 or L4 | (per rules) |
| L3 | `hostel_manager` | Yes | To L4 only | Always (any forward) |
| L4 | `principal` | Yes | Not allowed | (per rules) |

At each stage a reviewer may **approve** (advance), **reject**,
**request more info**, **forward with a comment**, or (from L2 up)
**direct-generate** a pass that skips the chain. A rejected ticket can be
escalated one level instead of restarting. Sensitive moves need a
**step-up approval password** with lockout.

> Note: `warden` was removed 2026-11 — its duties consolidated into
> `principal` (L4). The chain still lists "warden_or_principal" as a stage
> name; it resolves to `principal`.

---

## 3. Roles & how they route through the hostel

| Role | Console | Power | Route / API |
|---|---|---|---|
| **deputy_warden** | `(approver)/hostel` | Approve a hosteller's leave link (L2); block-scoped | `/api/deputy-warden/*` |
| **hostel_manager** | `(approver)/hostel-manager` | Residents, complaints, housekeeping, maintenance, home summary | `/api/hostel-manager/*` |
| **caretaker** | `(caretaker)` | Maintenance/housekeeping queue closure, asset verify vs inventory | `/api/caretaker/*` |
| **principal** (L4, was warden) | `(approver)/principal/operations/hostel` | Final authority; direct-generate; incident sign-off | `/api/principal/*` |
| **vice_principal** | `(approver)/vice-principal/hostel-security-summaries` | Security summaries | `/api/vp/*` |
| **chief_warden** | — | Incident sign-off under `role_context` | via principal |
| **operator** | gate kiosk | The last link of the leave chain (scan-out) | `/api/gate/verify-leave-chain` |
| **student** | `(student)` | Raises the leave pass; views own curfew | `/api/passes` |
| **parent** | `(parent)` | **Required ack** in the leave chain | `/api/parent/leave/acknowledge` |

**Routing rule:** the hostel escalation ladder is
`caretaker → warden → deputy_warden → hostel_manager → principal`.
A stuck link escalates up that chain; a PENDING link is overridden only by
the next actor + an audit reason.

**Scope lock:** hostel roles are **block-scoped** — a warden of block B
never sees block G's residents (block entity scope in `withAuthorization`).

---

## 4. How the hostel leave/gate chain works (end to end)

```
hosteller wants to go out
   1. student files a hostel pass            /api/passes (hostel pass type)
   2. deputy_warden approves the leave       /api/deputy-warden  (L2 link)
   3. parent acknowledges                    /api/parent/leave/acknowledge
   4. student walks to the gate, operator scans QR
        → /api/gate/verify-pass (valid)
        → /api/gate/verify-leave-chain
             returns the missing link if any:
             [student pass ✓] [deputy ✓] [parent ✓] [operator scan]
        → if all present: operator taps OUT (exit reason: home visit)
   autonomous: /api/cron/leave-chain (*/30)
        TTL reminders, 6h/12h escalation, auto-expiry, gate-token issuance
```

**If a link is PENDING** (e.g. parent hasn't acked): the chain returns
exactly which link; the supervisor or the next actor in the ladder can
override **with an audit reason** — a caretaker can't override their own block.

**Exit-type drives legal exits:** entering as a hosteller makes
home-visit / full-day / emergency / special-leave the legal exits; a day
scholar has only the fast "day" exit. (See the gate doc, §3.)

---

## 5. The hostel UI — how the elements interact

### 5.1 Hostel-manager home (`(approver)/hostel-manager/home`)
```
┌──────────────────────────────────────────────┐
│  summary card  ← GET /api/hostel-manager/summary
│   • Pending tickets (warn tone)               │
│   • …block KPIs…                              │
├──────────────────────────────────────────────┤
│  tabs / sections:                             │
│   residents        /residents                │
│   complaints       /complaints  (+/[id])     │
│   housekeeping     /housekeeping-tasks       │
│   maintenance      /maintenance              │
└──────────────────────────────────────────────┘
```
Each section is a list + a detail view (`complaints/[id]`). The home page is
a **summary source** (`/api/hostel-manager/summary`) that drives the
"pending tickets" call-out and links into the four section pages.

### 5.2 The principal hostel operations view
`(approver)/principal/operations/hostel` — the L4 view: cross-block
occupancy, incidents, direct-generate pass, and the two-person incident
sign-off.

### 5.3 The warden page (`/warden`)
The (now-principal-consolidated) warden surface: block selector +
occupancy + curfew state. Since the role merge, this routes through the
principal scope with `role_context='warden'`.

### 5.4 Student + parent side
- **Student:** `/student/passes` (file the hostel pass), curfew-acknowledge,
  mess-bill (adjacent).
- **Parent:** the **required ack** is a distinct step — the leave chain
  shows PENDING at the parent link until the parent's console (or bot
  `/child`) acknowledges.

---

## 6. The API surface (hostel)

### `src/app/api/hostel/*`
`blocks` (occupancy per block), `returns-timeline`.

### `src/app/api/hostel-manager/*`
`summary` (drives the home KPIs), plus residents / complaints /
housekeeping / maintenance sub-routes.

### `src/app/api/deputy-warden/*` — the leave-approval link
### `src/app/api/caretaker/*` — maintenance / housekeeping
### `src/app/api/parent/leave/acknowledge` — the parent ack
### `src/app/api/gate/verify-leave-chain` — the chain verifier

---

## 7. The autonomous layer

| Agent | Cadence | Bounded to | Does |
|---|---|---|---|
| `leave-chain` | */30 | hostel | leave-chain TTL reminders, 6h/12h escalation, auto-expiry, gate-token issuance |
| `alerts-eval` | periodic | hostel | evaluate hostel alert rules (curfew, overstay, incident) |

The leave-chain agent **never approves** a leave — it reminds, escalates,
auto-expires stale links, and issues gate tokens. Human approval stays with
the deputy_warden / parent / operator.

---

## 8. Mess adjacency (shares the block entity)

Mess is a **separate** capability but scoped to the same hostel blocks:
meal tokens, menu, consumption, bills, preference, opt-out, operational
requests, and the hash-chained **reconcile** ledger. Mess incharge edits
the cost threshold; the **Mess Committee (Principal)** approves. Agents:
`mess-reconcile` (05:00, hash-chained), `mess-finalize`, `mess-no-show-check`,
`mess-review-digest`, `mess-review-retention`, `mess-token-cleanup`,
`mess-event-tokens`, `mess-reminder`.

---

## 9. Security invariants

1. **Block scope** — hostel roles are locked to their block entity.
2. **Four-level chain** — a hostel pass advances L1→L4; a reviewer at L2+
   can direct-generate, but the chain is still the default path.
3. **Two-person incident sign-off** — chief_warden / principal (not the
   block warden alone).
4. **Parent ack is mandatory** for hostel leave — the chain is PENDING
   until the parent's link is present.
5. **Step-up password** for sensitive forwards (from L3, always; L2/L4 per
   the rules), with lockout.
6. **Override = audit** — any PENDING-link override by a higher actor
   writes the reason to `audit_events`.

---

## 10. "Everything we know" — open items & gotchas

- **`warden` removed 2026-11** → principal. The L4 "warden_or_principal"
  stage name is kept for the approver surface but resolves to `principal`.
- **Hostel leave = 4 links, not 3** — the parent ack is the one people
  forget; the chain verifier exists precisely to name the missing link.
- **Occupancy vs leave** are different data: occupancy is who's physically
  in; the leave chain is who's *authorized* to be out. Both must agree at
  the gate.
- **Two-person DEBARRED/SUSPENDED** (academic status) *also* blocks hostel
  leave for a flagged student — the conduct flag feeds the gate.

---

## 11. Improving this — where to hook in (and what new architecture each pulls)

Open this when you want to change a hostel feature. Each improvement lists the
**exact hook point**, the **files you touch**, and any **new architecture**
that comes with it. Follow the standing rules: migration replay on a fresh
Postgres, `tsc --noEmit`, the 4-place permission chain, and block scope.

### 11.1 Add a link to the leave chain
- **Hook point:** the 4-link chain in `src/app/api/gate/verify-leave-chain`
  + the `leave-chain` cron agent.
- **Files:** a new link type in the chain + a new approval API + a new agent
  reminder step. The chain verifier already returns "which link is missing,"
  so adding a link is additive.
- **New architecture:** a **maker-checker `pending_approvals` row** for the
  new link (same as the two-person status flow).

### 11.2 Add a hostel block
- **Hook point:** the block entity in `entity_scopes` (the 4 blocks seed) +
  `hostel/blocks`.
- **Files:** a new `entity_scopes` row (block type) + the block's
  `deputy_warden` binding. Every hostel role is block-scoped, so a new block
  is a new scope + its officers.

### 11.3 Two-person incident sign-off (already the model)
- **Hook point:** the chief_warden / principal sign-off in
  `hostel_incidents`.
- **Files:** a `pending_approvals` row + a sign-off API. If you want a
  *third* sign-off level, extend the chain — same maker-checker
  architecture.

### 11.4 New maintenance / housekeeping ticket type
- **Hook point:** the `hostel-manager` maintenance + housekeeping sections
  (`/api/hostel-manager/*`).
- **Files:** a ticket-type seed + a categorizer in the complaint-triage
  agent (which routes by keyword to the block). No new subsystem.

### 11.5 Mess–hostel coupling change
- **Hook point:** the shared block entity between mess tokens and hostel
  occupancy.
- **Files:** the mess reconcile agent + the block KPI query. The two share
  the `entity_scopes` block row — a coupling change touches both sides.

---

## 12. File map (jump straight to the code)

| Concern | File(s) |
|---|---|
| Hostel-manager console | `src/app/(approver)/hostel-manager/*` (home, residents, complaints, housekeeping-tasks, maintenance) |
| Principal hostel ops | `src/app/(approver)/principal/operations/hostel` |
| Warden surface | `src/app/warden/page.tsx` (now principal-scoped, `role_context`) |
| Hostel APIs | `src/app/api/hostel/{blocks,returns-timeline}` |
| Hostel-manager APIs | `src/app/api/hostel-manager/*` (summary, residents, complaints, housekeeping, maintenance) |
| Leave link | `src/app/api/deputy-warden/*`, `src/app/api/parent/leave/acknowledge`, `src/app/api/gate/verify-leave-chain` |
| Caretaker | `src/app/api/caretaker/*` |
| Leave-chain agent | `src/app/api/cron/leave-chain` |
| Hierarchy spec | `docs/hostel-hierarchy.md` (L1–L4) |
| Block scope | `entity_scopes` seed + `withAuthorization` block entity |
| Escalation chain | `src/lib/escalation-ladder.ts` (`hostel` domain) |
