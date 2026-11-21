# Stage 2 — Coordinator Model (the optional human slot)

## Model

A **Class Coordinator** is a *student* with an active
`student_representatives` row:

```
scope_type = 'class', scope_id = <classes.id>, status = 'active',
valid_to >= today, appointment_type = 'appointed'  (v1 default)
```

That is the whole model. No new role column, no new users table entry.
The coordinator gets a **capability**, not a role — exactly the
teaching-capability rule: the binding beats the role.

## Schema delta (in the stage-1 migration)

```sql
ALTER TABLE public.student_representatives
  ADD COLUMN IF NOT EXISTS appointment_type TEXT
  CHECK (appointment_type IN ('appointed','elected','approved'))
  DEFAULT 'appointed';

-- one active class-CR per class (v1)
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_class_cr
  ON public.student_representatives (scope_id)
  WHERE scope_type = 'class' AND status = 'active';
```

`appointment_type` is forward-compatible: when a department later elects,
the row is written with `'elected'` + `appointed_by` = the HOD who ran the
vote. No further migration needed for election-in-later.

## Powers (capability checks, kernel: `src/lib/class-coordinator.ts`)

```ts
getActiveCoordinators(classId)      // active rep rows for the class
canRelay(userId, classId)           // rep row + appointment_type check
canCollect(userId, classId)         // same; raises class_requests with raised_by_rep=TRUE
```

| Power | What it may do | What it may NOT do |
|---|---|---|
| Relay | release / supersede a `class_message` in relay mode (tap-release + auto-release backstop) | author a new message, change attendance/marks |
| Collect | raise a `class_request` with `raised_by_rep=TRUE` (a *signed* collective concern, routed to faculty/HOD) | decide on behalf of the class, close/resolve requests |
| Read | see all open requests in their class (read-only dashboard) | reassign, escalate |

**The read-all-requests permission (D3):** granted by the rep row,
bounded to the class scope, and recorded in audit with
`actor_type='user'`, `actor_role='student'`, plus `rep_scope=<class_id>`
so the audit chain proves the scope.

## Appointment / revocation (actions via `/api/actions`)

| action | tier | confirm | authority |
|---|---|---|---|
| `coordinator.appoint` | 2 | dialog | class_teacher of that class, OR HOD of the class's department, OR admin/sysadmin. Writes `appointed_by`, `appointed_role`, `appointment_type='appointed'`, `valid_to` (default: end of semester, overridable) |
| `coordinator.revoke` | 1 | none (reason required) | same authority |
| `coordinator.extend` | 1 | none | coordinator self-requests → class_teacher decides (maker-checker via `pending_approvals`, same pattern as academic status) |

## Surfaces

- **HOD/teacher class page:** "Coordinator" slot in the class card —
  appoint (dialog: pick student, valid_to), replace, view powers.
- **Coordinator page** (`(student)/student/coordinator/`): duties card,
  relay inbox, collect form, "my class's open requests" (read-only).
- **Student page:** "Your class coordinator" card (name, how to reach,
  active notices they relayed).

## Decision log items

- D1: seed `appointment_type='appointed'`.
- D6: one coordinator per class (the unique index enforces it).
- Deferred: `class_rep_votes` ballot table + `coordinator.election.run`
  agent. Ship only when a department requests it.
