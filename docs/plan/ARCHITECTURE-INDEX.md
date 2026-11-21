# Gate Monitor — Architecture Index

**Open this first.** It routes you to the right doc for a domain, and tells
you which shared kernel every doc assumes. Each domain doc is self-sufficient:
roles that touch it, how it works, how the UI pieces interact, **and** an
"Improving this" section with the exact hook points + any new architecture an
improvement pulls in + a file map.

## The three architecture docs (this set)

| Doc | Covers | Open it when… |
|---|---|---|
| `gate-monitoring/GATE-MONITORING.md` | gate scan, entry-type, recommendation engine, leave chain, devices, supervisor, offline/edge | you touch the gate, a scan, a pass, or the kiosk |
| `academics/ACADEMICS.md` | teaching capability, marks/assignments/attendance/exams SoD, two-person status, class-communication | you touch faculty, HOD, the exam branch, or a student academic surface |
| `hostel/HOSTEL.md` | blocks, occupancy, the 4-link leave chain, L1–L4 hierarchy, housekeeping/maintenance, mess adjacency | you touch a hostel role, a leave, an incident, or a block |

**Each doc has the same 12-ish sections:**
1. What it does · 2. Roles & routing · 3. How the core flow works (end to end)
· 4. The UI & how elements interact · 5. The API surface · 6. The autonomous
layer · 7. Security invariants · 8–9. Everything-we-know (open items) ·
**10/11. Improving this (hook points + new architecture + files)** ·
**11/12. File map**.

## Cross-domain: the shared kernel (all three assume)

None of the domain docs fork this — it's the never-fork line:

| Kernel | File | Used by |
|---|---|---|
| `canAct(role, domain, action)` | `src/lib/permission-model.ts` | every route |
| `nextActor(role, domain, blocked)` + `LADDER` | `src/lib/escalation-ladder.ts` | gate, hostel, academics, mess, exam |
| `deriveFlag()`, `COC_POLICIES` | `src/lib/conduct.ts` | conduct feeds gate + hostel + academics |
| `routeComplaint(category)` | `src/lib/complaint-routing.ts` | complaints → any domain |
| `ActionEnvelope` / `dispatchAction` / `useAction` | `src/lib/action-envelope.ts`, `dispatch-action.ts`, `useAction.ts` | the single mutation boundary (`POST /api/actions`) |
| Entity scope (`departmentId`, block, gate) | `src/middleware/authorization.ts` | all three |
| Teaching binding | `src/lib/teaching-binding.ts` | academics |
| Coordinator slot | `src/lib/class-coordinator.ts` | academics (class-comm) |

**The escalation ladders** (`escalation-ladder.ts`) are the one place that
knows "who acts next" per domain — gate, gate_pass, hostel, mess, exam,
academics, medical, finance, infrastructure, governance. If a domain doc's
routing looks off, this is where it's defined.

## How a role routes across the three domains

A person usually holds **one role** but can appear in several domain docs via
*capability slots* and *delegation*:

- **faculty** → academics (binding) + can raise/resolve class requests.
- **hostel_manager / deputy_warden / caretaker** → hostel (block-scoped) + the
  last links of the gate leave chain.
- **principal** → the top of *all* three ladders (gate, hostel, mess, exam)
  + lockdown + delegation. This is why the warden→principal consolidation
  matters: one person now tops four ladders.
- **class coordinator** → a *capability* (not a role) that only shows up in
  the academics / class-communication doc.

## Standing rules (enforced on every change in these domains)

1. Migration replay on a **fresh Postgres** before push; validate SQL locally.
2. `tsc --noEmit` is the type gate.
3. The **4-place permission chain** must agree: route `requiredRole` →
   `canAct` → entity scope → RLS policy.
4. **Never fork the kernel** — new policy = a new `COC` row / `CommandDef` /
   binding / config seed, not a copied function.
5. Every mutation goes through `POST /api/actions` → audit; agents write
   `actor_type='agent'` and never close/resolve — they route, flag, escalate.

## Where to find the rest

- `class-coordinator-saas/FULL-HIERARCHY-AND-FLOWS.md` — the **whole-system**
  reference (all 29 roles, all 85 API domains, all 23 agents, topology).
- `docs/JNTUH_CEJ_ROLE_HIERARCHY.md` — the entity-aligned role model.
- `docs/CONTRACT.md` — fork-shell/share-kernel + capability addenda.
- `docs/BACKLOG.md` — open items (H1–H7) referenced by the "everything we
  know" sections.
