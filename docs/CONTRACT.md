# Fork the Shell, Share the Kernel

The four-tier model that keeps role consoles customizable without forking policy.

```
Tier 0  Kernel        lib/…            pure functions, types, config     ← NEVER forks
Tier 1  Hooks         hooks/…          state + data + kernel wrappers    ← NEVER forks
Tier 2  Headless UI   (future)         no styling, only logic/state      ← can fork, rarely
Tier 3  Role Shells   student/, approver/, admin/ …   full JSX          ← 100% forks
```

**The rule in one line: the shell is yours, the logic isn't.** Every role file
stays individual forever. It stops *containing* the logic and instead *calls* it.

## What NEVER forks (the line)

Lives in exactly one file, imported by every shell:

| File | Why it can't fork |
|---|---|
| `lib/permission-model.ts` → `canAct()` | If Warden allows an action Principal blocks, you've shipped a security bug |
| `lib/escalation-ladder.ts` → `LADDER`, `nextActor()` | Two ladders = a ticket bounces forever between disagreeing consoles |
| `lib/conduct.ts` → `FlagLevel`, `deriveFlag()`, `COC_POLICIES` | A user flagged on one screen must be flagged on all |
| `lib/pass-types.ts` → `PassTypeConfig` + seed | The *data* is shared; each shell decides *how* to render it |
| `lib/commands/parse.ts` → `parseCommand(input, defs, custom?)` | The command grammar. Each bar supplies its own `CommandDef[]` + optional custom parser; the parser is shared |
| `lib/types.ts` → `FlagLevel` on `Person`/`User` | Core type |

If a role needs to *diverge on a policy*, it adds a `COC` row or a `CommandDef`
— it does not copy the function.

## What DOES fork (everything else)

All status bars, command bars, pass forms, profile modules, chart cards — keep
every file. Rename, restyle, add fields, change layout, add role-specific
buttons. That's the point. The only change is what's *inside* them:

- A shell **loses** its `fetch(`, its `useEffect(setInterval)`, its
  `setState(loading)`, its `function parseCommand`, its pass-type union.
- A shell **gains** calls to `useRoleCounts`, `useConductFlags`,
  `usePassTypes`, `parseCommand`, `canAct`.

A fix (e.g. "spinner stays after load") lands in one hook, not 14 bars.

## The three guardrails

Forking without guardrails rots. Three files stop that:

1. **A registry per family** — `approver/command-bars.manifest.ts` (and the
   status-bar / pass-form equivalents). 10 lines each. Adding a 16th bar means
   adding a manifest row. Grep-able, doc-able, test-able.

2. **A conformance test** — `tests/kernel-conformance.test.ts` (~30 lines).
   Imports every shell in the manifest and asserts it does **not** contain its
   own `parseCommand`, `fetch(`, `useEffect(setInterval)`, or pass-type union.
   If a new shell copy-pastes logic, CI fails. This is the only thing that
   protects the line when you have 40+ shell files.

3. **This contract doc** — every shell must call `usePassTypes`,
   `validatePass`, `canAct`, `parseCommand`. Must NOT: fetch directly, hardcode
   approval chains, define its own pass-type union.

## Rollout status

| Phase | Work | Status |
|---|---|---|
| 1. Kernel | `canAct`, `nextActor`, `deriveFlag`, `PassTypeConfig`, `usePersona`, `usePassTypes`, `useRoleCounts`, `useConductFlags`, `parseCommand` | done |
| 2. Reference role | Hollow **HostelManager (warden family)** end-to-end: `HostelManagerCommandBar` now imports the kernel `parseCommand` + `HOSTEL_MANAGER_COMMANDS` and keeps a role-specific `hmParse` for the `allocate <roll> to <room>-<bed>` verb. Status bar hollows via `useRoleCounts`. | in progress |
| 3. Conformance harness | `command-bars.manifest.ts` + `tests/kernel-conformance.test.ts` | done |
| 4. Roll to remaining roles | Hollow out the other 14 command bars + 14 status bars, one role per PR | todo |
| 5. Add divergence | Warden gets probation count, Mess gets wastage count, Principal gets decision-history — each ~2 lines because the hook exists | ongoing |

The reference role (Phase 2) is the most important commit: if the Warden
shells hollow cleanly, every other role is mechanical.

## Teaching Capability Addendum (2026-11-21)

The teaching/academic capability extends the kernel with an **action
envelope** contract so role surfaces dispatch mutations through one
boundary instead of ad-hoc `fetch` calls:

- `lib/action-envelope.ts` — `ActionEnvelope` (`type`, `targetId`,
  `actorId`, `actorRole`, `payload`, `reason`, `idempotencyKey`) +
  `ActionDef` table with `ActionTier` 0–4 (tier ≥ 3 requires `reason`).
- `lib/dispatch-action.ts` — POSTs envelopes to `POST /api/actions`,
  the single mutation boundary: auth → idempotency dedupe (60 s TTL,
  in-process) → permission check → execute + audit log.
- `lib/useAction.ts` — per-surface state machine
  (`idle → confirming → submitting → done | denied | expired | conflict`).
- Binding rule: `assignment.*` / `submission.*` actions re-verify the
  actor has an active `faculty_assignments` row keyed on
  `faculty_id = user.id` — the same "binding beats role" rule that
  gates `/faculty/*` via `TeachingBindingGate`
  (`lib/teaching-binding.ts` → `/api/teaching-bindings`).

Full design: `docs/teaching-capability-architecture.md`.

## Class-Comm Capability Addendum (2026-11-21)

The class-communication layer is the **student-side twin** of the teaching
capability: same kernel, same "binding beats role" rule, no new top-level
role. A Class Coordinator is a *student* + an active
`student_representatives` row (a capability, not a role).

| Kernel file | Owns |
|---|---|
| `lib/class-requests.ts` | `raiseClassRequest` (route by category), `resolveClassRequest`, `escalate`, `close`, `findAggregatableIssues`, `createClassLevelIssue`, `resolveClassLevelIssue` |
| `lib/class-coordinator.ts` | `getActiveCoordinators`, `canRelay`, `canCollect`, `canReadClassRequests`, `appointCoordinator`, `revokeCoordinator`, `requestCoordinatorExtension` |
| `lib/class-message-release.ts` | `releaseClassMessage` — one fan-out path for both human tap-release and cron auto-release (`released_by` distinguishes) |

**Action tiers (dispatched via `POST /api/actions`, authority = capability
check, NOT role):**

| Action | Tier | Confirm | Authority |
|---|---|---|---|
| `class_request.raise` / `.close` | 0 | — | student, own class |
| `class_request.resolve` | 1 | — | routed owner (faculty/HOD/OIE) |
| `class_request.escalate` | 2 | dialog | owner / SLA breach |
| `class_issue.raise` / `.resolve` | 2 | dialog | HOD / VP / admin |
| `coordinator.appoint` | 2 | dialog | class_teacher / HOD / admin |
| `coordinator.revoke` / `.extend` | 1 | — | same authority |
| `class_message.publish` | 2 | dialog | faculty (direct or via named CR) |
| `class_message.release` | 1 | — | named coordinator, author, or cron |
| `class_message.supersede` | 3 | dialog + reason | author / admin |

**Two lanes, one coordinator slot:**
- *Individual lane* — `class_requests`, routed by category (complaint
  taxonomy re-skinned); urgent items page the HOD at raise-time.
- *Collective lane* — `class_level_issues`, auto-promoted when N≥3 students
  raise the same (class, category) within 72h (`/api/cron/class-issue-aggregation`,
  */15; threshold + window are config in `config_class_comm`, tunable without a deploy).

Schema: migration `20270129000001_class_comms_saas.sql` (2 tables + 2 ALTERs,
all idempotent). Plan + flow map: `docs/plan/class-coordinator-saas/`.
