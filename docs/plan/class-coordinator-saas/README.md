# Plan: Class-Communication SaaS — Replace the CR Bottleneck

**Date:** 2026-11-21 · **Author:** Hermes (plan) · **Owner:** Gate Monitor team
**Status:** DRAFT — awaiting approval before any migration is written

---

## 1. What we are actually building

GPT framed this as "replace the CR with software." The correct frame is:

> Replace the *communication function* the CR used to perform with a direct,
> auditable system — and keep a human **Class Coordinator** only where
> *collective* representation genuinely adds value.

The architecture becomes:

```
        INDIVIDUAL lane                          COLLECTIVE lane
  student → class request → route → faculty          student ×N → same topic
        (direct, SLA-tracked)                ←        → HOD "class-level issue"
                                                    (auto-detected aggregation)

  class notice:  faculty/admin → direct → class       faculty → relay → CR/ICR → release
                                                          (bounded window, receipts)
```

Two lanes, one coordinator slot (optional, per class). No CR bottleneck.

---

## 2. What already exists (do NOT rebuild)

| Piece | Where | Reuse |
|---|---|---|
| Complaint routing engine | `src/lib/complaint-routing.ts` + `complaint-taxonomy.ts` | category → owner role → SLA chain, `autoEscalateOnBreach` |
| Complaints table + categories | `complaints`, `complaint_categories` (migration 20261022000000) | the individual lane's backbone |
| Cron agents | `/api/cron/complaint-triage` (*/30, classify+route), `/api/cron/complaint-sla-sweep` | escalation already runs autonomously |
| `student_representatives` | same migration §17 | the *coordinator* slot — today it only gates complaint-proxy (student-rep.ts). We extend it, don't fork it |
| `class_messages` + `class_message_receipts` | migration 20270118000001 §5 | relay/direct modes, urgency, `auto_release_at`, receipt `delivered/read/acked` — the collective-notice table |
| Release agent | `/api/cron/class-message-release` (*/5) | fan-out + auto-release; currently **cron-only, no release API yet** |
| Campus feed | `/api/campus/feed` (official = admin/sysadmin) | "class notice" is already distinct from "official announcement" |
| Action kernel | `action-envelope.ts` / `dispatch-action.ts` / `useAction.ts` + `POST /api/actions` | every new mutation goes through this one boundary |
| Student shell surfaces | `(student)/student/complaints`, `request-tracking`, `campus`, `attendance`, `calendar` | the student-portal side already exists |

**The real gap is small.** Most of the "SaaS" is already shipped. What's
missing is (a) the *request* lane as a first-class citizen, (b) the
*coordinator* role with its appointment model, (c) *aggregation* detection,
(d) the release API + surfaces that use `class_messages`.

---

## 3. What is NOT in scope (deliberate)

- **No new top-level role.** A coordinator is a `student` + an active rep row
  + a capability check. The 29-role model does not grow.
- **No election model in v1.** `student_representatives` keeps
  `appointed_by`/`appointed_role`; add `appointment_type`
  (`'appointed' | 'elected' | 'approved'`) so the schema *can* express
  election later without another migration. Ballot table (`class_rep_votes`)
  is deferred until a department actually votes.
- **CR/coordinator cannot alter attendance, marks, or grades.**
  Those stay binding-keyed to faculty (the teaching-capability rule).
  The coordinator's powers are *communication*: relay, concern, collect.

---

## 4. Change inventory (the count you asked for)

### A. Database — 1 new migration `20270129000001_class_comms_saas.sql`

1. `class_requests` — the individual lane:
   `id, student_id, class_id, category_code, title, body, priority, status
   (open|in_progress|escalated|resolved|closed), assigned_role,
   routed_at, resolved_at, resolution_note, parent_class_issue_id,
   dedupe_key, created_at`
   + partial index `(class_id, category_code, status) WHERE status IN
   ('open','in_progress','escalated')` for the aggregation query.
   RLS: `CREATE POLICY` via `DO … IF NOT EXISTS` block (same idiom as
   `20270128000001`).
2. `class_level_issues` — the aggregate lane:
   `id, class_id, topic, status, open_request_ids (uuid[]),
   raised_by (HOD/teacher), resolved_by, created/resolved_at`.
   Auto-created by the aggregation agent when N≥3 students raise the same
   (class, category) within 72h.
3. `student_representatives`: add `appointment_type TEXT
   CHECK IN ('appointed','elected','approved') DEFAULT 'appointed'` +
   partial unique index "one active class-CR":
   `UNIQUE (scope_id) WHERE scope_type='class' AND status='active'`.
4. `class_messages`: add `relay_role TEXT CHECK IN ('cr','icr') NULL` —
   who is the human relay for this message (nullable = direct mode).

**Total: 1 migration, 2 new tables, 2 ALTERs.** All additive,
`IF NOT EXISTS` / `DO`-guarded (idempotent-replay rule).

### B. Kernel — 2 new lib files

5. `src/lib/class-requests.ts` — `raiseClassRequest()`,
   `routeRequest()` (delegates to `complaint-routing` taxonomy, falls back
   to a class-request category table), `aggregateClassIssues()`
   (the N≥3/72h detection).
6. `src/lib/class-coordinator.ts` — `getActiveCoordinators(classId)`,
   `canRelay(userId, classId)` (rep row + `appointment_type` check),
   `canCollect(userId, classId)` (same, for concern-gathering).

Reuses `student-rep.ts` TTL logic; no new permission model, no `canAct` fork.

### C. Actions (via `/api/actions`, tier table)

| Action | Tier | Confirm | Authority (capability check, NOT role) |
|---|---|---|---|
| `class_request.raise` | 0 | none | student, own class |
| `class_request.resolve` | 1 | none | routed owner role (faculty/HOD) |
| `class_request.escalate` | 2 | dialog | auto (SLA breach) OR owner |
| `class_issue.raise` | 2 | dialog | HOD / class_teacher of that dept |
| `coordinator.appoint` | 2 | dialog | HOD (dept) / class_teacher (class) / admin |
| `coordinator.revoke` | 1 | none | same authority, reason required |
| `class_message.publish` | 2 | dialog | faculty (direct or relay) |
| `class_message.release` | 1 | none | CR/ICR named in `relay_role`, or auto (cron) |
| `class_message.supersede` | 3 | dialog+reason | original author or admin |

9 actions, all through the existing kernel — no new fetch boundaries in
shells.

### D. Routes — 5 new route files

7. `POST /api/class-requests` (raise) · `GET /api/class-requests`
   (student: own; owner role: their queue; HOD: class-scoped)
8. `POST /api/class-requests/[id]/resolve`
9. `GET /api/class-level-issues?classId=` + `POST …/[id]/resolve`
   (faculty portal queue)
10. `POST /api/class-messages` (publish, direct or relay) ·
    `POST /api/class-messages/[id]/release` (CR tap-release; the cron agent
    stays as the auto-release path — **two release paths, one table,
    `released_by` distinguishes human vs system**)
11. `GET /api/class-coordinators?classId=` (roster + status)

### E. Cron — 1 new agent

12. `/api/cron/class-issue-aggregation` (*/15): scan
    `class_requests` open+escalated, group by
    `(class_id, category_code)`, N≥3 within 72h → create
    `class_level_issue`, notify HOD + class_teacher, link `parent_id`s.
    Bounded to operator scope; writes `actor_type='agent'` audit events.
    **It never closes requests** (same bound as complaint-triage).

### F. Surfaces — 3 role shells (forked JSX, kernel-only calls)

13. **Student portal** (`(student)/student/class-requests/`):
    "Raise a request" picker — 📚 academic / 🕐 attendance / 📝 exam /
    📅 timetable / 🏫 room-lab / 👨‍🏫 faculty concern / 💡 suggestion /
    🚨 urgent → one field each, routes automatically. "My requests" list
    with status + who's acting. "Class coordinator" card (who is it, how
    to reach, their active notices).
14. **Coordinator surface** (`(student)/student/coordinator/`):
    duties card, relay inbox (`class_messages` where `relay_role` names
    them, release buttons), collect-concern form (creates a
    `class_request` with `raised_by_rep=true`), class-notice composer.
15. **Faculty + HOD dashboards**:
    - faculty: "My class requests" queue, "Publish class notice"
      (direct or "relay via CR" toggle), class-level issues raised in their class.
    - HOD: "Issues by class", "Response time" (median SLA per category),
      "Unresolved" list, escalation log.

**Total surface area: 3 new pages + 2 dashboard sections.** All call
kernel actions only; none copies routing logic.

### G. Docs

16. This plan folder (5 files, done once merged).
17. `docs/CONTRACT.md` — new section "Class-Comm Capability Addendum"
    (action tiers + authority matrix above).
18. `docs/teaching-capability-architecture.md` — cross-link
    ("the class-communication capability is the student-side twin of the
    teaching capability; same kernel, same binding rule").
19. `docs/BACKLOG.md` — completed entry when shipped.

---

## 5. Grand total

| Artifact class | Count |
|---|---|
| Migrations | **1** (2 tables + 2 ALTERs, all idempotent) |
| Kernel lib files | **2** |
| Actions (via existing `/api/actions`) | **9** |
| New route files | **5** |
| New cron agents | **1** |
| New surfaces (pages/sections) | **3 + 2** |
| Doc updates | **3** |
| **Code artifacts** | **~22** |
| **Estimated build order** | A → B → C+D → E → F (each stage independently testable) |

The "SaaS product" framing resolves to: **the individual lane is the
complaints engine re-skinned as class requests; the collective lane is
`class_messages` + a coordinator slot + one aggregation agent.** The
escalation ladder (`escalation-ladder.ts`) is unchanged — it already owns
"who acts next".

---

## 6. Build order (one PR each, CI green before next)

| Stage | PR | Contents | Gate |
|---|---|---|---|
| 1 | `feat/class-requests-schema` | migration A + RLS + `class-requests.ts` kernel + routes 7-9 | migration replay CI (fresh Postgres) |
| 2 | `feat/coordinator-model` | rep ALTERs + `class-coordinator.ts` + `coordinator.*` actions + route 11 | tsc + conformance test |
| 3 | `feat/class-message-publish` | `class_messages` ALTER + routes 10 + `class_message.*` actions | replay + e2e relay |
| 4 | `feat/class-issue-aggregation` | cron agent + `class_level_issues` routes | agent dry-run (0 creates) |
| 5 | `feat/class-comm-surfaces` | student + coordinator + faculty/HOD shells | visual + first-load perf gate |
| 6 | `docs/class-comm` | CONTRACT addendum + cross-links | — |

Stages 1-4 are backend-complete and shippable **without** any surface;
stage 5 is the UI. This matches the repo's standing rule: no Docker
locally, validate SQL with a fresh scratch Postgres replay before pushing,
`tsc --noEmit` is the type gate.

---

## 7. Decision log (open items)

| # | Decision | Default (if no input) |
|---|---|---|
| D1 | `appointment_type` seeded value | `'appointed'` (teacher/HOD appoints; JNTUH practice) |
| D2 | Aggregation threshold N / window | **3 students / 72h / same (class, category)** |
| D3 | Does a coordinator get a dashboard of *all* their class's open requests? | Yes (read-only; they can't resolve — that's the routed owner's job) |
| D4 | `class_messages` relay release window | 4h default `auto_release_at`; urgent = 1h |
| D5 | Urgent 🚨 requests skip the queue and page HOD directly | Yes — `priority='urgent'` → immediate HOD notification, bypasses triage agent |
| D6 | One coordinator per class (enforced by partial unique index) | Yes for v1 |
| D7 | Anonymous class requests | No in v1 (complaints stay anonymous-capable; class requests are signed) |

---

## 8. Files in this folder

- `README.md` — this plan
- `class-requests.md` — schema + routing detail (stage 1)
- `coordinator-model.md` — appointment model + powers (stage 2)
- `class-message-relay.md` — relay/direct modes + release paths (stage 3)
- `aggregation-agent.md` — detection algorithm + bounds (stage 4)
