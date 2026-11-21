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
