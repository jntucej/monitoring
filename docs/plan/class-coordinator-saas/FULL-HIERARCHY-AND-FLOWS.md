# JNTUH CEJ Gate Monitor — Complete Hierarchy, Feature & Flow Reference

**This is the single "how everything works" document.** It covers, with real
code locations:
- the layer model and the 4 rules that hold it together
- every role and capability slot (who can act where)
- the full API surface by domain (what each capability actually exposes)
- every operational flow, end to end (how a request travels to an outcome)
- the escalation ladders and the autonomous agent layer (what runs without a human)
- the deploy / runtime topology
- the **shipped** class-communication SaaS layer — live endpoints, request/response
  contracts, and exactly how each dashboard opens and works

**Verified against:** `src/lib/roles.ts`, `src/app/api/*` (85 domains),
`src/app/api/cron/*` (23 agents), `src/lib/escalation-ladder.ts`,
`src/lib/class-requests.ts`, `src/lib/class-coordinator.ts`,
`database/migrations/20270129000001_class_comms_saas.sql`, and the three
class-comm surfaces. The class-communication layer is **SHIPPED on main
(commit 2e038c90)** — not planned. Companion docs are linked in Part 10.

---

## Part 1 — Three-layer model

```
┌────────────────────────────────────────────────────────────────┐
│ LAYER 0 · KERNEL  (never forks)                                 │
│  permission-model.ts → canAct()                                │
│  escalation-ladder.ts → LADDER, nextActor()                    │
│  conduct.ts → FlagLevel, deriveFlag(), COC_POLICIES             │
│  pass-types.ts → PassTypeConfig + seed                          │
│  commands/parse.ts → parseCommand()                             │
│  complaint-routing.ts → routeComplaint()                        │
│  action-envelope.ts / dispatch-action.ts / useAction.ts         │
│  (all under src/lib/)                                           │
├────────────────────────────────────────────────────────────────┤
│ LAYER 1 · ROLE + CAPABILITY  (who can act where)                │
│  29 role keys (roles.ts)                                         │
│  capability bindings: faculty_assignments (teaching),           │
│     student_representatives (coordinator, planned), delegations │
│  entity_scopes: dept / block / gate / mess / lib / exam desks   │
├────────────────────────────────────────────────────────────────┤
│ LAYER 2 · SURFACES  (forked, bespoke JSX)                       │
│  9 route-groups: (admin) (approver) (home) (mess) (operator)    │
│     (person) (student) (supervisor) (sysadmin)                  │
│  each shell CALLS the kernel — none re-implements policy        │
└────────────────────────────────────────────────────────────────┘
```

### The 4 standing rules
1. **Shell is yours, the logic isn't.** A role console may restyle freely
   but must call `canAct`, `nextActor`, `routeComplaint`, and dispatch every
   mutation through `POST /api/actions`. A shell that inlines a `fetch` for a
   policy decision is a fork and is rejected in review (see `CONTRACT.md`).
2. **Binding beats role.** Authorization keys on an active binding row, not the
   role column. A Principal without a CS-301 teaching binding → 403 on
   CS-301 grading. A plain student with a coordinator slot → relay power.
3. **One mutation boundary.** Every write goes through
   `/api/actions` → auth → idempotency dedupe (60 s, in-process) →
   permission check → execute → `audit_logs`. No shell issues raw mutation
   fetches.
4. **Escalation is a table, not a judgment call.** `nextActor(role, domain,
   blocked)` walks the domain ladder (`escalation-ladder.ts`). Two ladders
   would bounce a ticket forever, so it lives in exactly one file.

---

## Part 2 — Roles and capabilities (complete, from `src/lib/roles.ts`)

29 active role keys + 1 legacy. `warden` was **removed 2026-11** — its
hostel-management duties consolidated into `principal` (DB rows reassigned
by migration `20261125000001`); `deputy_warden` / `hostel_manager` kept.
`hostel` remains recognized as legacy for approver-surface compatibility.

| Group | Role keys |
|---|---|
| Governance | `admin`, `sysadmin`, `principal`, `vice_principal` |
| Institution / entity | `dean`, `chief_warden`, `oie`, `controller_examinations`, `addl_controller_academic`, `addl_controller_results`, `addl_controller_automation`, `exam_superintendent`, `exam_branch` |
| Department | `hod` |
| Hostels | `deputy_warden`, `hostel_manager`, `caretaker`, `chief_warden` |
| Mess | `mess_incharge`, `emo` |
| Gate | `operator`, `supervisor` |
| Teaching (capability) | `faculty`, `staff`, `worker` |
| People | `student`, `parent`, `guardian`, `visitor` |
| Legacy | `hostel` |

### Tiers (authority, high → low)

| Tier | Roles | What they govern | Scope lock |
|---|---|---|---|
| **T0** | `principal`, `vice_principal`, `admin`, `sysadmin` | Approve all approver workflows; lockdown; constitute mess committee; delegation | campus-wide. principal = institutional root, sysadmin = technical root (two separate powers) |
| **T1** | `dean`, `chief_warden`, `oie`, 4 exam controllers, `exam_superintendent` | Two-person DEBARRED/SUSPENDED approver; hostel incident sign-off; exam-desk separation | exam branch split into 4 desks (SoD); `chief_warden` acts under `role_context` |
| **T2** | `hod` | Roster, class management, academic flags, exam-review | `auth.departmentId` lock — EEE HOD never sees CSE |
| **T3** | `deputy_warden`, `hostel_manager`, `caretaker`, `mess_incharge`, `operator`, `supervisor`, `emo` | Block-scoped hostel; gate scans + handover; mess reconcile; maintenance | block / gate / mess entity scope |
| **T4** | `faculty`, `staff`, `worker` | Teaching capability: marks DRAFT→LOCK, assignments, grading, materials, mentees, internal-exam proposals | teaching binding (subject+class) |
| **T5** | `student`, `parent`, `guardian`, `visitor` | Self-service; parent acts on child; guardian re-verify; visitor pass lifecycle | own record |

### Separation-of-duties invariants (enforced by DB trigger / rule, not convention)
- **Exam SoD:** faculty enters marks (DRAFT) → `addl_controller_results`
  processes → `controller_examinations` signs off. No role both enters and
  publishes a result.
- **Academic status two-person:** HOD parks SUSPENDED/DEBARRED in
  `status_pending_approver` → dean/principal approves. A DB trigger blocks a
  direct write by a non-approver.
- **Hostel leave chain:** student pass → deputy_warden → parent ack →
  operator scan. Missing link = PENDING; override = supervisor + audit reason.
- **Mess cost threshold:** mess_incharge edits, Mess Committee (Principal) approves.

### Capability slots (bindings, not roles)
| Slot | Backed by | Unlocks | Scope |
|---|---|---|---|
| Teaching | `faculty_assignments` (subject_code + class_id, `faculty_id=user.id`, active) | `/faculty/*` via `TeachingBindingGate` | bound subjects/classes only |
| Coordinator *(planned)* | `student_representatives` (`scope_type='class'`) | notice relay + concern collection for that class | one per class |
| Delegation | `delegations` (TTL, `can_mutate`, no-self) | senior role temporarily acts for a subordinate role | expires automatically |

---

## Part 3 — The API surface, by domain

`src/app/api/` = **85 top-level domains**. Grouped here by capability.
*(Not every leaf route is listed — the domain names are the source of truth;
open a domain's `route.ts` for the exact endpoints.)*

### People & auth
- `auth` — login, session, refresh, logout-all, reset, webauthn
- `persons` / `users` / `students` / `visitors` / `parent(s)` / `guardian`
- `profile` / `me` / `records` / `traits` / `preferences`
- `onboarding` / `bootstrap` (first-boot setup)

### Gate & campus movement
- `gate` — `scan`, `verify-pass`, `verify-face`, `verify-thumbprint`, `verify-leave-chain`, `device-push`, `devices`, `logs`, `stream`
- `gates` — gate config
- `passes` / `occupancy` / `attendance_records`
- `emergency` / `lockdown` / `attention` / `alerts`

### Complaints & conduct
- `complaints` — POST/GET, `[id]`, `analytics`, `audit`, `categories`, `config`, `export`, `metrics`, `monthly-review`, `notices`, `search`, `tags`, `watchlist`
- `conduct` / `anti-ragging` / `disputes`

### Teaching & academics *(capability layer, live)*
- `faculty` — `assignments`, `attendance`, `internal-exam`, `marks`, `materials`, `mentees`, `my-class`, `my-classes`
- `faculty-assignments` (+`[id]`) — the binding table's API
- `teaching-bindings` — active bindings for a user
- `academic-status` (+`pending`) — HOD academic flags, two-person rule
- `exam` — `access`, `access-exceptions`, `candidate-attendance`, `eligibility-rules`, `hall-tickets`, `results`, `superintendent`
- `oie` — `queue`
- `departments` / `classes` / `hod` (dashboard, exam-review, faculty, flexible-class, pulse, retention, schedule)

### Hostels & mess
- `hostel` — `blocks`, `returns-timeline` · `hostel-manager`
- `mess` — `analytics`, `arrivals`, `attendance`, `bills`, `consumption`, `days`, `events`, `history`, `inventory`, `issues`, `meal-counts`, `meal-tokens`, `menu`, `menu-items`, `my-token`, `operational-requests`, `preference`, `reconcile`
- `deputy-warden` / `caretaker`

### Campus life & engagement
- `campus` — `feed`, `assistant` · `campus-extra` — `calendar`, `task-drafts`
- `announcements` — `[id]`, `active`, `[id]/follow`, `[id]/dismiss`
- `engagement` / `feedback` · `docs` (knowledge base)
- `bot` — Telegram bot commands / personas (`/now`, `/settings`, `/review`, …)

### Governance & operations
- `admin` — ~60 sub-domains (access, alerts, audit, automation, backup,
  compliance, consent, deployments, governance, lockdown, people, security,
  ueba, worker-shifts, workflow-configuration, …)
- `sysadmin` — `actions`, `application-health`, `approvals`, `autonomous-monitoring`, `backup-status`, `database-health`, `deployments`, `drills`, `forecasts`, `redis-worker`, `rls`, `security-posture`, `services`, `worker-jobs`
- `principal` — `audit`, `catch-up`, `dashboard`, `delegations`, `digest`, `inbox`, `retention`, `sla-heatmap`, `week-digest`
- `vp` — `academics`, `dashboard`, `history`, `retention`
- `operator` — `claim-gate`, `entry-type`, `gate`, `kiosk-session`, `lookup`, `manual-entry`, `mode`, `passes`, `recent-scans`, `register-thumbprint`, `scans`, `stats`, `transactions`
- `supervisor` / `roles-graph` / `delegations` / `approver`

### Platform & telemetry
- `analytics` / `metrics` / `deployment` / `integrations` / `health`
- `notifications` / `attachments` / `audit` / `features` / `config`
- `ws` (websocket) / `voice` / `mobile` / `telegram` / `webhooks`
- `student` — self-service: `attendance`, `curfew-acknowledge`, `dashboard`, `emergency-alert`, `fees`, `guardian`, `library`, `marks`, `meal-opt-out`, `mess-bill`, `next-exam`, `scholarships`
- `actions` — **the single mutation boundary** (see Layer 0)

### The mutation contract
```
any shell button  →  useAction(type, targetId)
       →  dispatchAction(envelope)  →  POST /api/actions
              auth → idempotency dedupe (60s) → permission check
                   → execute → INSERT audit_logs → ActionResult
```
`ActionEnvelope`: `{ type, targetId?, actorId, actorRole, payload?, reason?,
idempotencyKey }`. `ActionTier` 0–4; tier ≥ 3 requires `reason`.
`useAction` phase machine: `idle → confirming → submitting →
done | denied | expired | conflict`.

---

## Part 4 — Operational flows, end to end

### 4.1 Student raises a problem (individual lane)
```
student shell → POST /api/actions {type:'class_request.raise'}
   /api/actions:  auth → idempotency dedupe → permission (student, own class)
     → INSERT class_requests {category, priority, status='open'}
     → addAudit()
   routeComplaint(category)   [complaint-routing kernel]
     → owner role + SLA chain
   if priority='urgent' → page HOD immediately (bypass queue)

AUTONOMOUS:
   /api/cron/complaint-triage (*/30)   classify un-categorized, dedupe, escalate
   /api/cron/complaint-sla-sweep       auto-escalate on SLA breach
   /api/cron/sla-breach                breach notifications
   /api/cron/class-issue-aggregation (*/15, planned)
     3 same-(class,category) in 72h → 1 class_level_issue → notify HOD
```
**The point:** the student never chases anyone. It routes itself; the sweep
promotes it up the ladder if ignored; if shared by the class, the
aggregation agent collapses N rows into one class-level ticket.

### 4.2 Faculty publishes a class notice (collective lane)
```
faculty shell → POST /api/actions {type:'class_message.publish'}
   mode='direct'  → fan out to all class students (receipt rows created)
   mode='relay'   → held for the named coordinator (relay_role='cr'/'icr')
        coordinator taps release → POST /api/class-messages/[id]/release
                                   (released_by = coordinator)
   OR auto_release_at passes → /api/cron/class-message-release (*/5)
        (released_by='system', auto_released=TRUE)
```
**Anti-bottleneck:** relay is a fast path, not a gate. If the coordinator
never taps, cron still ships it (4h normal / 1h urgent default).

### 4.3 Coordinator appointment (the human slot, planned)
```
HOD / class_teacher shell → POST /api/actions {type:'coordinator.appoint'}
   tier 2, dialog confirm
   → INSERT student_representatives {student_id, scope_type='class',
        scope_id=class_id, appointment_type='appointed', valid_to,
        appointed_by, appointed_role}
   → partial-unique index: 1 active class-CR per class

coordinator.revoke  (tier 1, reason)  — same authority
coordinator.extend   (self-request) → class_teacher decides
   (maker-checker via pending_approvals, same pattern as academic status)
```

**Coordinator powers**
| May | May not |
|---|---|
| release / supersede a relay notice | author a new notice; alter attendance |
| raise a *signed* collective concern (`raised_by_rep=TRUE`) | resolve / escalate another's request |
| read all open requests in their class | reassign, grade, or change any record |

### 4.4 Teaching / academic work (faculty capability)
```
faculty (CS-301 binding) → assignment.create (tier 1)   scoped to bound classes
student → submission.create (tier 2)
faculty (CS-301 binding) → submission.grade (tier 2)
   RLS: student sees own submissions; only the posting faculty grades
HOD → academic-status flag SUSPENDED/DEBARRED (two-person)
   → parks PENDING → dean/principal approves
```
Schema: migration `20270128000001_academic_subsystem.sql`
(`assignments`, `submissions`, `extension_requests`, keyed on `faculty_id`),
idempotent `DO`-block RLS on `submissions` (877feffc).

### 4.5 Gate scan + hostel leave (operator + chain)
```
student QR at gate → operator scan
   → pass/leave status check
   → if hostel leave: /api/gate/verify-leave-chain
        student pass → deputy_warden → parent ack → operator scan
        (returns exactly which link is missing)
/api/cron/leave-chain (agent) — TTL reminders, 6h/12h escalation,
     auto-expiry, gate-token issuance
```

### 4.6 Mess operations
```
meal tokens:  /api/mess/meal-tokens · /my-token
consumption + reconcile (hash-chained):  /api/mess/reconcile
   /api/cron/mess-reconcile (05:00) · mess-no-show-check · mess-finalize
   mess-review-digest · mess-review-retention · mess-token-cleanup
mess cost threshold: mess_incharge edits → Mess Committee (Principal) approves
```

### 4.7 Exam lifecycle (SoD)
```
faculty enters marks (DRAFT) → exam branch deadline locks it
   → addl_controller_results processes
   → controller_examinations signs off
eligibility:  /api/cron/exam-eligibility-manifest (22:00, Ed25519-signed)
hall tickets / candidate access:  /api/exam/hall-tickets · /access
```

### 4.8 Lockdown & emergency
```
principal → /api/lockdown (issue/resolve) → campus-wide alert
   /api/emergency · /api/cron/alerts-eval (agent)
visitor overstay:  gate scan-out past threshold → auto-flag → supervisor
```

---

## Part 5 — Escalation ladders (from `src/lib/escalation-ladder.ts`)

Lowest → highest authority per domain:

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

`nextActor(currentRole, domain, blockedReason)` → next role that can act +
a human-readable reason for the audit log. **Blocked reasons:**
`tier_too_low`, `domain_mismatch`, `flag_blocked`, `step_up_required`,
`actor_suspended`, `actor_banned`. (Note: the ladders still reference
`warden`; post the 2026-11 warden→principal consolidation these resolve to
`principal` at the top of the chain.)

---

## Part 6 — Autonomous agent layer (23 cron agents)

All behind `requireCronAuth` (`/api/cron/*` POST + `x-cron-secret`). All
write `actor_type='agent'` audit events. **Bounds:** agents route/flag/
escalate/release — they never close a complaint or resolve a request.

**Core (the 7 that drive the operational loops):**

| Agent | Cadence | Bounded to | Does |
|---|---|---|---|
| `gate-reconcile` | */5 | operator | reconcile scan state, flag orphans |
| `class-message-release` | */5 | operator | auto-release due relay notices |
| `complaint-triage` | */30 | supervisor | classify / route / dedupe / escalate |
| `leave-chain` | */30 | hostel | leave-chain TTL + gate tokens |
| `exam-eligibility-manifest` | 22:00 | exam | Ed25519-signed manifest |
| `mess-reconcile` | 05:00 | mess | hash-chained ledger |
| `class-issue-aggregation` *(planned)* | */15 | operator | detect collective class issues |

**The other 16:** `alerts-eval`, `audit-chain`, `audit-rotate`,
`birthday-check`, `complaint-sla-sweep`, `dispatch-notifications`,
`expire-passes`, `faculty-review`, `mess-event-tokens`, `mess-finalize`,
`mess-no-show-check`, `mess-reminder`, `mess-review-digest`,
`mess-review-retention`, `mess-token-cleanup`, `register-open`, `reports`,
`sla-breach`.

Audit integrity: `audit-chain` computes a nightly SHA256 checkpoint over
`audit_chain` / `audit_chain_checkpoints`; `audit-rotate` prunes with
retention policy; the immutability guarantee on `audit_logs` is
trigger-based (`trg_audit_logs_immutable` blocks UPDATE/DELETE).

---

## Part 7 — Runtime & deploy topology

`docker-compose.yml` (self-hosted appliance, Debian 13; CloudFlared
optional tunnel, `TUNNEL.md`):

```
INTERNET / CAMPUS (80/443)
      │
   gate_caddy  (caddy:2-alpine — TLS, reverse proxy, SSE buffering off)
      │  (internal gate-net bridge — only Caddy exposes 80/443)
   ┌──┴───────────────┐
   │                  │
 monitoring-web      monitoring-worker   (Next.js 16 standalone, node-cron)
   │                  │
 ┌─┴───────────────┐
 │                 │
 gate_postgres   gate_redis    (redis:7-alpine — cache + token-bucket rate limit)
 (supabase/postgres:17.6.1.136)
   + prometheus / cadvisor (metrics)
```

- **DB:** PostgreSQL 17 via the `supabase/postgres` image (plain Postgres +
  Supabase extension stack — pgcrypto etc.); RLS + `pg_policies` drift check
  at `/api/sysadmin/rls/drift`.
- **Migrations:** `database/migrations/` replayed on a fresh Postgres in CI
  ("Verify Migration Replay"). Always validate SQL with a fresh scratch
  Postgres before pushing; `tsc --noEmit` is the type gate.
- **Worker:** `worker/` (node-cron) runs the 23 agents; a separate
  `gate_worker` container.
- **Auth:** JWT access + refresh (`jose` + `bcryptjs`), WebAuthn
  (`@simplewebauthn`); session/refresh-hash in Postgres, not Supabase.

---

## Part 8 — Class-communication SaaS layer (SHIPPED, commit 2e038c90)

GPT's "replace the CR with software" resolved to **two lanes + one optional
human slot**, and it is now live on main. Migration
`20270129000001_class_comms_saas.sql` adds `class_requests`,
`class_level_issues`, `config_class_comm`, `student_representatives.
appointment_type`, and `class_messages.relay_role`. Kernels:
`src/lib/class-requests.ts` (raise/route/aggregate) and
`src/lib/class-coordinator.ts` (capability checks + appoint/revoke/extend).

```
INDIVIDUAL lane    student → POST /api/class-requests → routed to desk
                       └ urgent → pages HOD now
                       └ autonomous triage + SLA sweep
COLLECTIVE lane    N students same topic → /api/cron/class-issue-aggregation
                       → 1 class_level_issue → HOD
HUMAN SLOT         coordinator (per class)  → relay notices · collect concerns
                       (never the bottleneck — auto-release backstop)
```

### 8.1 Live endpoints (request → response contracts)

**`POST /api/class-requests`** — raise a request. Student (or a coordinator
on their class's behalf).
- **Body:** `{ classId, category, title, body?, priority?: "normal"|"urgent",
  raisedByRep?, actorId? }`
- **`category`** must be one of: `ACADEMIC`, `ATTENDANCE`, `EXAM`,
  `TIMETABLE`, `ROOM`, `FACULTY`, `SUGGESTION`, `URGENT`
  (`REQUEST_CATEGORIES` in `class-requests.ts`).
- **Routing table** (`CATEGORY_ROUTE`) — what each category routes to:
  | category | owner role |
  |---|---|
  | ACADEMIC, ATTENDANCE, ROOM, SUGGESTION | `class_teacher` of that class |
  | EXAM | `oie` |
  | TIMETABLE, FACULTY, URGENT | `hod` (FACULTY never goes to the named faculty; URGENT pages HOD now) |
- **Response:** `{ success, id, assignedRole, ... }`. `urgent` priority also
  fires an immediate HOD notification.

**`GET /api/class-requests`** — three views, chosen by role:
- student → their own open/active requests (with status)
- routed owner role (e.g. `class_teacher`) → their queue
- HOD / VP / admin → class-scoped queue (`?classId=&status=`)

**`POST /api/class-requests/[id]/resolve`** — owner resolves.
- **Body:** `{ note }` → status → `resolved`, stamps `resolved_at` +
  `resolution_note`, audit event.

**`GET /api/class-level-issues`** — HOD/VP/admin/faculty only
(`?classId=&status=open`). Returns open issues with `request_ids[]`,
`topic`, `class_name`.

**`POST /api/class-level-issues`** — HOD/VP/admin raise a class-level issue
by hand (`{ classId, topic }`). Returns 409 if one is already open for the
same class+topic (the partial-unique index enforces it).

**`POST /api/class-level-issues/[id]/resolve`** — `{ resolution }` → closes
the issue **and** flips every linked `class_request` to `resolved` with the
same note (one HOD action clears the whole cluster).

**`GET /api/class-messages`** · **`POST /api/class-messages`** — publish a
class notice. `mode='direct'` fans out now; `mode='relay'` holds it for the
named coordinator (`relay_role='cr'/'icr'`) with an `auto_release_at`.

**`POST /api/class-messages/[id]/release`** — tap-release. Authorizes the
author, admin/sysadmin, or an **active coordinator of a target class**
(`getActiveCoordinators`). Sets `released_by`, shares the same
`releaseClassMessage` kernel as the cron auto-release path (two paths, one
table — `released_by` distinguishes human vs `system`). Already released → 409.

**`GET /api/class-coordinators?classId=`** — the active coordinator roster
for a class.

**`GET /api/student/me/class`** — the calling student's class identity:
`{ classId, department, classLabel }`. Because this dataset ships with an
**empty `classes` table**, `classId` falls back to the department code; that
is the `class_id` TEXT token the request/coordinator tables key on.

**`POST /api/cron/class-issue-aggregation`** (*/15, `requireCronAuth`) —
scans open `class_requests` by `(class_id, category_code)`; N≥3 in 72h
(`config_class_comm`) → creates one `class_level_issue`, links
`parent_issue_id`, notifies HOD + class teacher. Bounded to operator scope;
never resolves anything.

### 8.2 The three surfaces — how each opens and works

| Surface | Route | Who opens it | What it shows / does |
|---|---|---|---|
| **Student · Class requests** | `(student)/student/class-requests/page.tsx` | student | On mount: fetches `/api/students/me/class` (their class identity) + `/api/class-requests` (their own). Top: "Raise a request" — a **category picker of 8 icon-tiles** (📚 Academic, 🕐 Attendance, 📝 Examination, 📅 Timetable, 🏫 Room/Lab, 👨‍🏫 Faculty concern, 💡 Suggestion, 🚨 Urgent) + title/body + submit → `POST /api/class-requests`. Bottom: "My requests" list with live status badges. |
| **Coordinator** | `(student)/student/coordinator/page.tsx` | student who holds a class-coordinator slot | Only active for a student with an active `student_representatives` class row. Shows: relay inbox (held `class_messages` where they are `relay_role`, each with a **Release** button → `POST /api/class-messages/[id]/release`), a collect-concern form (raises `class_request` with `raised_by_rep=TRUE`), and a read-only "my class's open requests" view. |
| **Faculty · Class requests** | `(approver)/faculty/class-requests/page.tsx` | faculty / class-teacher | The routed **queue** for their class: open requests assigned to them, resolve-with-note button → `POST /api/class-requests/[id]/resolve`. HOD variant surfaces class-level issues + resolution. |

### 8.3 Coordinator lifecycle (planned → shipped)

```
HOD / class_teacher → appointCoordinator(studentId, classId, validTo)
   → INSERT student_representatives {appointment_type:'appointed', …}
   → partial-unique index: 1 active class-CR per class
revokeCoordinator(repId, reason)   — same authority, tier 1
requestCoordinatorExtension()       — self-request → class_teacher decides
   (maker-checker via pending_approvals, same as academic status)
```
`class-coordinator.ts` exposes the capability checks: `canRelay`, `canCollect`,
`canReadClassRequests` — each verifies the active rep row for that class.

### 8.4 What already existed (reused, not rebuilt)
Complaint routing engine, `class_messages` + receipts + release cron,
`student_representatives`, the campus feed (official vs class-notice), the
action kernel, and the student/faculty shells. This layer adds the request
table, the coordinator appointment model, aggregation detection, and the
publish/release APIs + the three surfaces above.

---

## Part 9 — Decision log & open items

| # | Decision | Default |
|---|---|---|
| D1 | Coordinator `appointment_type` seed | `appointed` (teacher/HOD) |
| D2 | Aggregation threshold | N=3 same (class, category) in 72h (config-tunable) |
| D3 | Coordinator sees all class open requests | read-only, yes |
| D4 | Relay auto-release window | 4h normal / 1h urgent |
| D5 | Urgent request pages HOD immediately | yes (bypasses agent) |
| D6 | One coordinator per class | yes (partial unique index) |
| D7 | Anonymous class requests | no in v1 (complaints stay the anonymous lane) |

---

## Part 10 — Cross-references

| Topic | Document |
|---|---|
| Entity-aligned role model + implementation status | `docs/JNTUH_CEJ_ROLE_HIERARCHY.md` |
| Fork-shell/share-kernel rule + capability addenda | `docs/CONTRACT.md` |
| Teaching capability design (model, tiers, phases) | `docs/teaching-capability-architecture.md` |
| Container topology detail | `docs/SERVER_ARCHITECTURE.md` |
| Self-hosted DB layer + migration playbook | `docs/TECH_STACK.md`, `docs/MIGRATION.md` |
| Autonomous operations playbook | `docs/AUTONOMOUS_OPERATIONS.md`, `docs/IMPLEMENTATION_BLUEPRINT.md` |
| Per-role flows (mermaid) | `docs/flow/*.mermaid` |
| Class-communication build plan | `docs/plan/class-coordinator-saas/` |
| Backlog / technical debt | `docs/BACKLOG.md` |
