# ACADEMICS — Complete Feature & Role Reference

**Scope:** the full academic subsystem — teaching capability, marks,
assignments, attendance, exams, academic status, and class-communication —
who does what, how it routes, and how the UI pieces interact.

**Verified against:** `src/lib/class-requests.ts`, `src/lib/teaching-binding.ts`,
`src/app/api/faculty/*`, `src/app/api/exam/*`, `src/app/api/oie/*`,
`src/app/api/academic-status`, `src/app/api/class-requests`, and the
faculty / exam-branch / student surfaces.

---

## 1. The core model: capability, not role

The teaching subsystem follows the **binding-beats-role** rule. A person's
access to academic work is keyed to an active **teaching binding**
(`faculty_assignments`: `subject_code` + `class_id`, `faculty_id = user.id`),
not to their role column.

```
personId: <uuid>
roles:     ['principal']            ← governance authority
teachings: [                        ← teaching capability (separate!)
  { subjectCode: 'CS-301', classId: 'CSE-3A' },
  { subjectCode: 'CS-302', classId: 'CSE-3B' },
]
```

**Rule:** a Principal without a CS-301 binding **cannot** grade CS-301
submissions, even though they hold the top institutional role. A faculty with
a binding walks into `/faculty/*` scoped to exactly their subjects. This is
enforced by `TeachingBindingGate` in the faculty layout
(`src/app/(approver)/faculty/layout.tsx`).

**Scope model** (`src/contracts/classes.ts`):
- `hod` → `caller.department_id = target.department_id`
- `teacher` → `classes.class_teacher_id = caller.id`
- `assigned` → `EXISTS faculty_assignments(faculty_id=caller.id, class_id=…)`
- `admin` → role IN (`admin`,`sysadmin`)

---

## 2. Roles & how they route through academics

| Role | Academic power | Route / API | SoD role |
|---|---|---|---|
| **faculty** | Marks entry (DRAFT→LOCK), assignments create/grade, materials, mentees, attendance, internal-exam proposals, class-requests queue | `/api/faculty/*` | enters marks, **never** publishes results |
| **hod** | Roster, class mgmt, exam-review (dept-scoped), academic flags (parks, doesn't finalize) | `/api/hod/*`, `/api/academic-status` | parks two-person status |
| **oie** | Examinations office: hall tickets, candidate attendance, eligibility, access exceptions | `/api/oie/queue` | exam-desk |
| **exam_superintendent** | Desk-wide oversight | `/api/exam/superintendent` | exam-desk |
| **controller_examinations** | **Signs off** results (only role that can) | `/api/exam/results` | final authority |
| **addl_controller_academic** | Academic corrections + exam proposals | `/api/exam/access-exceptions` | exam-desk |
| **addl_controller_results** | **Processes** results (enters → publishes) | `/api/exam/results` | exam-desk |
| **addl_controller_automation** | Automates eligibility manifests | `/api/exam/eligibility-rules` | exam-desk |
| **student** | Self-service: attendance, marks/grade-card, next-exam, fees, library, scholarships | `/api/student/*` | none |
| **class coordinator** | Collects academic concerns for the class (`raised_by_rep`) | `/api/class-requests` | none |

**Separation-of-duties (the exam branch is split into 4 desks on purpose):**
faculty enters → results controller processes → examinations controller
signs off. No single role both enters and publishes a result.

---

## 3. How each academic flow works

### 3.1 Marks (DRAFT → LOCK)
```
faculty (CS-301 binding) → /api/faculty/marks  (DRAFT, per subject+class)
   → exam-branch deadline LOCKS the column
   late correction → addl_controller_academic + audit reason
   → addl_controller_results processes
   → controller_examinations signs off
```
UI: the faculty **Marks** page (per bound class) has a grid entry surface;
after the deadline the grid disables and routes corrections to the
controller with a reason.

### 3.2 Assignments & submissions
```
faculty (binding) → assignment.create (tier 1)  → scoped to bound classes
   → assignment_submissions fan-out: student submits (files + note)
   → faculty grades (tier 2)  — RLS: student sees own, only posting faculty grades
   → extension_requests: student requests, faculty/HOD decides (state machine)
```
Schema: migration `20270128000001_academic_subsystem.sql`
(`assignments`, `submissions`, `extension_requests`, keyed `faculty_id`),
idempotent `DO`-block RLS on `submissions` (877feffc).

UI: faculty **Assignments** page (list + review inbox sorted by
`posted_by`+status); student **Assignments** in the campus group shows
"my pending" by class + due date.

### 3.3 Attendance
```
faculty marks per class (attendance for bound classes)
   → /api/faculty/attendance  +  class_periods (today strip)
   student views  /student/attendance  +  /student/attendance-calendar
   student disputes  /api/attendance_records  → routed to faculty/HOD (ladder)
```
UI: student attendance page shows present/absent history, % , and a
dispute button that opens a ticket routed up the academics ladder.

### 3.4 Exams
```
faculty proposes internal exam  → HOD / exam branch approves
   oie queue: hall tickets, candidate attendance, eligibility
   /api/cron/exam-eligibility-manifest (22:00) → Ed25519-signed manifest
```
UI: exam-branch console (`/exam-branch/*`) has oie-approval-requests,
oie-handoff, discrepancies, verification, records, reports, calendar.

### 3.5 Academic status (two-person)
```
HOD → /api/academic-status  flag SUSPENDED / DEBARRED / LATERAL_JOIN
   → parks in status_pending_approver  (HOD sees only their dept)
   → dean / principal approves (POST /api/academic-status/pending)
   → only then effective status takes effect; a DB trigger blocks a direct
     write by a non-approver
```

### 3.6 Class-communication (individual + collective)
```
student → POST /api/class-requests  {classId, category, title, priority}
   → CATEGORY_ROUTE:
        ACADEMIC / ATTENDANCE / ROOM / SUGGESTION → class_teacher
        EXAM → oie      ·      TIMETABLE / FACULTY / URGENT → hod
   → urgent pages HOD immediately
   autonomous: 3 same-(class,category) in 72h → class_level_issue → HOD
```
UI: student **Class requests** page (8 icon-tile category picker +
"My requests" with status badges); faculty **class-requests** queue
(resolve-with-note).

---

## 4. The academic UI — how the elements interact

### 4.1 Faculty console (`(approver)/faculty`)
Gated by `TeachingBindingGate`. Nav (from `_shell/nav.ts`):

```
My Day            /faculty                    (today strip from class_periods)
My class   ▸      /faculty/my-classes
                  /faculty/attendance
                  /faculty/student-directory
Requests   ▸      /faculty/permissions
                  /faculty/correction-requests
                  /faculty/request-history
More       ▸      /faculty/reports
                  /faculty/notifications
Class comm  /faculty/class-requests           (the routed queue)
```

Interaction: a faculty user lands on **My Day** (today's periods for their
bound classes). Tapping **Attendance** opens the per-class mark sheet;
**Corrections** is the post-lock queue; **class-requests** is the routed
individual-lane queue with a resolve button per request.

### 4.2 Exam-branch console (`/exam-branch`)
`oie-approval-requests` → `oie-handoff` → `discrepancies` →
`verification` → `records` / `reports` / `calendar`. The **superintendent**
surface (`/exam/superintendent`) is the desk-wide view.

### 4.3 Student academic surfaces
- `/student/attendance` + `attendance-calendar` — history, %, dispute button
- `next-exam`, `marks`, `scholarships`, `fees`, `library` under the account group
- campus group: `attendance`, `calendar`, `campus`, `class-requests`
- dashboard ordering is **role-aware**: a hosteller sees curfew/pass
  widgets first; a day scholar sees attendance/class widgets first;
  a year-1 student sees onboarding.

---

## 5. The API surface (academics)

### `src/app/api/faculty/*`
`assignments`, `attendance`, `internal-exam`, `marks`, `materials`,
`mentees`, `my-class`, `my-classes`.

### `src/app/api/exam/*`
`access`, `access-exceptions`, `candidate-attendance`, `eligibility-rules`,
`hall-tickets`, `results`, `superintendent`.

### `src/app/api/oie` — `queue`
### `src/app/api/academic-status` — GET/POST + `pending`
### `src/app/api/class-requests` — GET/POST + `[id]/resolve`
### `src/app/api/faculty-assignments` — the binding table (+`[id]`)
### `src/app/api/teaching-bindings` — active bindings for a user

---

## 6. The autonomous layer

| Agent | Cadence | Does |
|---|---|---|
| `exam-eligibility-manifest` | 22:00 | Ed25519-signed eligibility manifest |
| `faculty-review` | periodic | nudge faculty on pending one-tap reviews |
| `class-issue-aggregation` | */15 | detect collective academic class issues |

All write `actor_type='agent'` audit events; none can publish a result
(that's the controller's signature).

---

## 7. Security invariants

1. **Binding-keyed grading** — a faculty can't grade outside their binding.
2. **Exam SoD** — enter (faculty) ≠ process (results controller) ≠
   sign-off (examinations controller).
3. **Two-person status** — HOD parks, dean/principal approves, DB trigger
   blocks direct writes.
4. **RLS on submissions** — manual `CREATE POLICY`: students see their own;
   only the posting faculty (or admin) can grade.
5. **Dept lock** — an HOD of EEE never sees CSE academic data
   (`auth.departmentId`).

---

## 8. "Everything we know" — open items & gotchas

- **classes table is empty in this dataset** — so class-communication
  `class_id` is `TEXT` (department-code fallback via
  `/api/student/me/class`). A populated `classes` table would switch it to
  UUID; the join fix (20270129000002) handles both.
- **Late marks** route to the addl controller, not faculty, after the
  branch deadline.
- **warden→principal** consolidation (2026-11) doesn't touch academics,
  but the academic escalation ladder's top is now `principal`.
- Eligibility manifests are **signed but not yet KMS-held** (H3 in the
  backlog) — the private key is in Postgres today.

---

## 9. Improving this — where to hook in (and what new architecture each pulls)

Open this when you want to change an academic feature. Each improvement lists
the **exact hook point**, the **files you touch**, and any **new architecture**
that comes with it. Follow the standing rules: migration replay on a fresh
Postgres, `tsc --noEmit`, the 4-place permission chain, and **never fork the
kernel** — a new academic policy is a new `COC` row / `CommandDef` / binding,
not a copied function.

### 9.1 Add a new academic status / flag
- **Hook point:** the `academic_status` CHECK on `student_details`
  (migration `20270114000001`) + the two-person flow in
  `src/app/api/academic-status`.
- **Files:** add the value to the CHECK, add an HOD "park" + a
  dean/principal "approve" case, and a `pending_approvals` row type.
  Reuses the existing two-person architecture — no new subsystem.

### 9.2 Add a new exam-desk responsibility
- **Hook point:** the 4-desk SoD model in `config_roles_registry`
  (`controller_examinations`, `addl_controller_academic`,
  `addl_controller_results`, `addl_controller_automation`).
- **New architecture:** a 5th desk only if SoD *requires* it; otherwise
  extend an existing desk's permission set. A new desk = a new role key +
  registry row + a shell + its `/api/exam/*` slice.
- **Files:** `roles.ts`, `config_roles_registry` seed, a new exam-branch
  sub-page, the matching route.

### 9.3 Change the aggregation threshold (class issues)
- **Hook point:** `config_class_comm` (`agg_n`, `agg_hours`) + the
  aggregation agent `/api/cron/class-issue-aggregation`.
- **Files:** a `config_class_comm` UPDATE (or an HOD settings UI that writes
  it). The agent reads the config at run time — no deploy to tune it.

### 9.4 Marks → results pipeline change
- **Hook point:** the SoD chain faculty-DRAFT → results-PROCESS →
  controller-SIGN. Each stage is a distinct API slice.
- **New architecture:** if you add a **peer-review** stage, that's a new
  `pending_approvals` maker-checker row between process and sign — the
  same architecture as the two-person status flow.
- **Files:** a new exam-branch page + a route + an approval row.

### 9.5 New subject / department
- **Hook point:** `subjects` (per-department catalogue) +
  `academics-department-data.ts`.
- **Files:** a `subjects` seed row + the department constant. Everything
  else (class binding, marks scoping) is keyed off these.

### 9.6 KMS-hold the exam manifest key (H3)
- **Hook point:** the Ed25519 keypair in `exam_eligibility_keys` + the
  `exam-eligibility-manifest` agent.
- **New architecture:** move the private side to a KMS host; the agent
  calls KMS to sign instead of reading the key from Postgres.
- **Files:** the agent + a `kms-sign` helper + a config flag.

---

## 10. File map (jump straight to the code)

| Concern | File(s) |
|---|---|
| Teaching gate | `src/app/(approver)/faculty/layout.tsx` (`TeachingBindingGate`) |
| Binding check | `src/lib/teaching-binding.ts` → `/api/teaching-bindings` |
| Faculty APIs | `src/app/api/faculty/*` (assignments, marks, attendance, materials, mentees, internal-exam, my-class) |
| Binding table API | `src/app/api/faculty-assignments` (+`[id]`) |
| Exam SoD APIs | `src/app/api/exam/*` (access, results, superintendent, …) + `src/app/api/oie/queue` |
| Exam-branch console | `src/app/exam-branch/*` + `src/app/exam/superintendent` |
| Academic status (two-person) | `src/app/api/academic-status` (+`pending`) |
| Class-communication | `src/app/api/class-requests`, `src/app/api/class-level-issues`, kernels `src/lib/class-requests.ts` |
| Student surfaces | `src/app/(student)/student/{attendance,attendance-calendar,marks,next-exam,scholarships,fees,library,class-requests}` |
| Faculty surfaces | `src/app/(approver)/faculty/{page,my-classes,attendance,class,class-requests,correction-requests,reports}` |
| Aggregation agent | `src/app/api/cron/class-issue-aggregation` |
| Escalation chain | `src/lib/escalation-ladder.ts` (`academics` domain) |
| Academic schema | migration `20270128000001_academic_subsystem.sql` |
