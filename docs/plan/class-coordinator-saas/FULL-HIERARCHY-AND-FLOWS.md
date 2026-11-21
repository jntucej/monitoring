# JNTUH CEJ Gate Monitor — Full Hierarchy & Feature Flow Map

**Scope:** Every role tier, every capability layer, every operational
flow, and the (planned) class-communication SaaS layer. This is the single
"how everything works" reference: who can do what, what runs on its own,
and how a request travels from a student to an outcome.

**Companion docs:** `JNTUH_CEJ_ROLE_HIERARCHY.md` (entity-aligned role
model + implementation status), `CONTRACT.md` (fork-shell/share-kernel rule
+ capability addenda), `teaching-capability-architecture.md`, and
`plan/class-coordinator-saas/` (the class-communication build plan).

**Convention used throughout:**
- **Role** = a `users.role` value (29 in `src/lib/roles.ts`).
- **Capability** = a binding, not a role (e.g. teaching binding, coordinator slot).
  Capabilities follow the *binding-beats-role* rule: authorization keys on a
  person's active row, not on which role they happen to hold.
- **Kernel** = the never-fork logic (`canAct`, `nextActor`, `deriveFlag`,
  routing). Shells are the role-specific JSX that *call* the kernel.

---

## Part 1 — The three-layer model

```
┌──────────────────────────────────────────────────────────────┐
│ LAYER 0 · KERNEL (never forks)                                │
│  permission-model.canAct() · escalation-ladder.nextActor()    │
│  conduct.deriveFlag() · complaint-routing.routeComplaint()    │
│  action-envelope / dispatch-action / useAction                 │
├──────────────────────────────────────────────────────────────┤
│ LAYER 1 · ROLE + CAPABILITY (who can act where)               │
│  29 roles  ·  teaching binding  ·  coordinator slot           │
│  entity_scopes (dept / block / gate)  ·  delegations (TTL)    │
├──────────────────────────────────────────────────────────────┤
│ LAYER 2 · SURFACES (forked, bespoke)                          │
│  student / faculty / hod / operator / warden / admin shells   │
│  each calls the kernel — none re-implements policy            │
└──────────────────────────────────────────────────────────────┘
```

Rules that hold across every layer:
1. **The shell is yours, the logic isn't.** A role console may restyle
   freely but must call `canAct`, `nextActor`, `routeComplaint`, and
   dispatch mutations through `POST /api/actions`.
2. **Binding beats role.** A Principal without a CS-301 teaching binding
   gets 403 on CS-301 grading; a student with a coordinator slot gets
   relay power they don't have as a plain student.
3. **One mutation boundary.** Every write funnels through
   `/api/actions` → auth → idempotency dedupe → permission check →
   execute + `audit_logs`. No shell issues raw fetch mutations.
4. **Escalation is a table, not a judgment call.** `nextActor(role,
   domain, blocked)` walks the domain ladder. Two ladders would bounce a
   ticket forever, so it lives in exactly one file.

---

## Part 2 — Role hierarchy (tiers)

| Tier | Roles (role keys) | Authority | Scope lock |
|---|---|---|---|
| **T0 Governance** | `principal`, `vice_principal`, `admin`, `sysadmin` | Approve everything; override + audit reason; lockdown; constitute mess committee | campus-wide; sysadmin is the technical root, principal the institutional root |
| **T1 Institution** | `dean`, `chief_warden`, `oie`, `controller_examinations`, `addl_controller_*` | Two-person DEBARRED/SUSPENDED approver; hostel incidents; exam desks | exam branch is split into 4 desks (SoD); chief_warden acts with `role_context` |
| **T2 Department** | `hod` | Roster, class mgmt, academic flags (parked for two-person) | `auth.departmentId` locked — EEE HOD never sees CSE |
| **T3 Hostels/Mess/Gate** | `warden`(principal ctx), `deputy_warden`, `hostel_manager`, `caretaker`, `mess_incharge`, `operator`, `supervisor` | Block-scoped hostel; gate scans; mess reconcile; maintenance | block or gate entity scope |
| **T4 Teaching capability** | `faculty`, `class_teacher` *(capability, not always a separate role value)* | Marks DRAFT→LOCK, assignments, grading, materials, mentees, internal-exam proposals | teaching binding (subject+class); not result-processing |
| **T5 Exam desks** | `exam_superintendent`, `exam_branch`, 4 controllers | Marks entry → result processing → sign-off (separated) | desk entity scope |
| **T6 People** | `student`, `parent`, `guardian`, `visitor`, `staff`, `worker` | Self-service + gated actions | own-record; parent acts on child |

**Separation-of-duties invariants (enforced, not convention):**
- Marks entry (faculty DRAFT) ≠ result processing (`addl_controller_results`)
  ≠ sign-off (`controller_examinations`). No single role enters *and* publishes.
- DEBARRED/SUSPENDED = HOD parks in `status_pending_approver` →
  dean/principal approves. DB trigger blocks any direct write by a non-approver.
- Hostel leave gate chain = student pass → deputy_warden → parent ack →
  operator scan. Missing link = PENDING; override = supervisor + audit reason.
- Mess cost-threshold change = mess_incharge edits, Mess Committee approves.

**Capability slots (bindings):**
- **Teaching** — active `faculty_assignments` row keyed `faculty_id = user.id`
  unlocks `/faculty/*` via `TeachingBindingGate`.
- **Coordinator** (planned) — active `student_representatives` row
  `scope_type='class'` unlocks relay/collect for that class. One per class.
- **Delegation** — `delegations` row (TTL + can_mutate + no-self); a senior
  role can temporarily act for a subordinate role; expires automatically.

---

## Part 3 — How the flows actually work

### 3.1 A student raises a problem (individual lane)

```
student shell ──► POST /api/actions {type:'class_request.raise'}
   └─► /api/actions kernel:
        auth → idempotency dedupe → permission (student, own class)
        └─► INSERT class_requests {category, priority, status='open'}
        └─► addAudit()
   └─► routeComplaint(category)  [reuses complaint-routing]
        → owner role + SLA chain
   └─► if priority='urgent' → page HOD now (bypass queue)

AUTONOMOUS (no human):
   /api/cron/complaint-triage (*/30)  — classify any un-categorized, dedupe, escalate
   /api/cron/complaint-sla-sweep      — auto-escalate on SLA breach
   /api/cron/class-issue-aggregation (*/15, planned) — 3 same-topic in 72h
        → 1 class_level_issue, notify HOD + class_teacher
```

**Flow:** the student never chases anyone. The request is routed to the
right desk automatically; if it's ignored past SLA the sweep promotes it
up the escalation ladder; if it's *shared* by the class, the aggregation
agent turns N rows into one class-level ticket the HOD must answer.

### 3.2 Faculty publishes a class notice (collective lane)

```
faculty shell ──► POST /api/actions {type:'class_message.publish'}
   mode = 'direct'  → fan out to all class students (receipts created)
   mode = 'relay'   → held for the named coordinator (relay_role='cr'/'icr')
        coordinator taps Release  → POST /api/class-messages/[id]/release
                                    (released_by = coordinator)
   OR auto_release_at passes → /api/cron/class-message-release (*/5)
        (released_by = 'system', auto_released = true)
```

**Anti-bottleneck property:** relay is a *fast path*, not a gate. If the
coordinator never taps release, the cron still ships it (4h normal / 1h
urgent default). The coordinator accelerates delivery; they can't block it.

### 3.3 Class Coordinator appointment (the human slot)

```
HOD / class_teacher shell ──► POST /api/actions {type:'coordinator.appoint'}
   tier 2, dialog confirm
   → INSERT student_representatives
      {student_id, scope_type='class', scope_id=class_id,
       appointment_type='appointed', valid_to, appointed_by, appointed_role}
   → partial-unique index guarantees 1 active CR per class

Revoke:  coordinator.revoke (tier 1, reason)   — same authority
Extend:  coordinator.extend (self-request) → class_teacher decides
        (maker-checker via pending_approvals, same as academic status)
```

**What the coordinator can / cannot:**
| Can | Cannot |
|---|---|
| release/supersede a relay notice | author a new notice, alter attendance |
| raise a *signed* collective concern (`raised_by_rep=TRUE`) | resolve/escalate someone else's request |
| read all open requests in their class | reassign, grade, or change any record |

### 3.4 Teaching / academic work (faculty capability)

```
faculty (CS-301 binding) ──► assignment.create (tier 1)
   → scoped to bound classes only
student ──► submission.create (tier 2)
faculty (CS-301 binding) ──► submission.grade (tier 2)
   RLS: student sees own submissions; only the posting faculty grades
HOD ──► academic-status flag SUSPENDED/DEBARRED (two-person)
   → parks PENDING → dean/principal approves
```

### 3.5 Gate scan + hostel leave (operator + chain)

```
student QR at gate ──► operator scan
   → pass/leave status check
   → if hostel leave: verify-leave-chain
        student pass → deputy_warden → parent ack → operator scan
        (returns exactly which link is missing)
   /api/cron/leave-chain (agent) — TTL reminders, 6h/12h escalation,
        auto-expiry, gate-token issuance
```

### 3.6 The autonomous layer (runs with no human at the keyboard)

| Agent | Cadence | Bounded to | Does |
|---|---|---|---|
| gate-reconcile | */5 | operator | reconcile scan state, flag orphans |
| mess-reconcile | 05:00 | mess | hash-chained ledger |
| complaint-triage | */30 | supervisor | classify/route/escalate |
| exam-eligibility-manifest | 22:00 | exam | Ed25519-signed manifest |
| leave-chain | */30 | hostel | leave-chain TTL + tokens |
| class-message-release | */5 | operator | auto-release relay notices |
| class-issue-aggregation | */15 (planned) | operator | detect collective issues |

All write `actor_type='agent'` audit events; none can close a complaint
or resolve a request — they only route, flag, escalate, and release.

---

## Part 4 — Escalation ladders (who acts next, per domain)

From `src/lib/escalation-ladder.ts` (lowest → highest):

| Domain | Chain |
|---|---|
| academics | faculty → hod → vice_principal → principal |
| hostel | caretaker → warden → deputy_warden → hostel_manager → principal |
| mess | mess_incharge → warden → deputy_warden → principal |
| exam | exam_branch → exam_superintendent → vice_principal → principal |
| gate | operator → supervisor → warden → principal |
| gate_pass | operator → supervisor → warden → deputy_warden → principal |
| medical | medical_officer → warden → principal |
| finance | finance_officer → deputy_warden → principal |
| infrastructure | caretaker → admin → sysadmin |
| governance / all | admin → principal → sysadmin |

`nextActor(currentRole, domain, blockedReason)` returns the next role that
can act, with a human-readable reason for the audit log. Blocked reasons:
`tier_too_low`, `domain_mismatch`, `flag_blocked`, `step_up_required`,
`actor_suspended/banned`.

---

## Part 5 — Class-communication SaaS (the planned layer, from the plan folder)

The GPT "replace the CR with software" idea resolves to **two lanes + one
optional human slot**:

```
INDIVIDUAL lane            student ──► class_request ──► route ──► desk
                                         │ urgent → page HOD now
                                         └ autonomous triage + SLA sweep

COLLECTIVE lane            N students same topic ──► aggregation agent
                                         └──► 1 class_level_issue → HOD

HUMAN SLOT                 coordinator (optional, per class)
                                         relay notices · collect concerns
                                         (never the bottleneck — auto-release backstop)
```

**What already exists (do not rebuild):** complaint routing engine,
`class_messages`+receipts+release cron, `student_representatives`,
campus feed (official vs class-notice), the action kernel, and the
student/faculty shells. **The gap is small:** the request lane as a
first-class table, the coordinator appointment model, aggregation
detection, and the publish/release APIs + surfaces.

**Build order (6 PRs, each green before the next):**
1. `class-requests` schema + kernel + routes
2. `coordinator` model (ALTERs + capability + actions)
3. `class-message` publish + release
4. `class-issue-aggregation` cron agent
5. class-communication surfaces (student / coordinator / faculty / HOD)
6. docs (CONTRACT addendum + cross-links)

Full detail: `plan/class-coordinator-saas/` (README + 4 stage files).

---

## Part 6 — Decision log & open items (carried from the plan)

| # | Decision | Default |
|---|---|---|
| D1 | Coordinator `appointment_type` seed | `appointed` (teacher/HOD) |
| D2 | Aggregation threshold | N=3 same (class,category) in 72h (config, tunable) |
| D3 | Coordinator sees all class open requests | read-only yes |
| D4 | Relay auto-release window | 4h normal / 1h urgent |
| D5 | Urgent request pages HOD immediately | yes (bypasses agent) |
| D6 | One coordinator per class | yes (partial unique index) |
| D7 | Anonymous class requests | no in v1 (complaints stay the anonymous lane) |
