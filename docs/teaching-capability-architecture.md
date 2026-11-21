# Teaching Capability & Academic Work Architecture

> **Twin layer:** the class-communication capability (`lib/class-requests.ts`,
> `lib/class-coordinator.ts`, `lib/class-message-release.ts`) is the
> student-side twin of this teaching capability — same kernel, same
> "binding beats role" rule, same action-envelope dispatch. See
> `docs/CONTRACT.md` → "Class-Comm Capability Addendum" and the plan at
> `docs/plan/class-coordinator-saas/`.

## Decision: One Tree, Capability-Keyed Permissions, Bespoke Surfaces, Shared Kernel

### Pre-flight Check Results (2026-11-21)

| Check | Result | Implication |
|-------|--------|-------------|
| AuthGuard | Props-driven (`allowedRoles` array) | Swap = one layout file, not 13 route files |
| Timetable | `class_periods` table exists | Today strip is free (already used by attendance API) |
| Faculty binding | `faculty_assignments.faculty_id` (user id, uuid) | Person-keyed, not role-keyed. No migration needed |
| Upload path | `attachment-storage.ts`, `s3-storage.ts`, `signed-url.ts` exist | Student uploads are infra-ready |

### Model

```
personId: <uuid>
roles:        ['principal']           ← governance authority
teachings:    [                       ← teaching capability
  { subjectId: 'CS-301', classId: 'CSE-3A' },
  { subjectId: 'CS-302', classId: 'CSE-3B' },
]
```

**Rule:** Teaching actions are authorized by the binding, not the role.
A Principal without a CS-302 binding cannot grade CS-302 submissions,
even though they hold the top institutional role.

### Guard Swap

`/faculty/*` layout changes:
```
allowedRoles: ['faculty', 'class_teacher', 'admin', 'sysadmin']
```
to:
```
allowedRoles: ['faculty', 'class_teacher']  // + teaching-binding check
```

The binding check: any user with ≥1 active row in `faculty_assignments`
where `faculty_id = user.id` gets access. Pure faculty unchanged.
Admins/syadmins without a binding lose access (correct — they don't teach).

### Sidebar Section

`RoleSidebar` appends a "Teaching" section (labeled via `useRoleVocabulary`)
iff the user has `teachingBindings.length > 0`. Pure faculty see "Faculty";
Principal/HOD see "Teaching".

### Academic Work Data Model (5 entities)

```
Assignment {
  id, subjectCode, facultyId (user id — NOT posted_by; migrated 8201cd1f),
  title, description,
  dueAt, maxMarks?, attachments[],
  status: 'open' | 'closed',
  createdAt
}

Submission {
  id, assignmentId, studentId,
  files[], note?, submittedAt,
  status: 'submitted' | 'graded',
  grade?, feedback?, gradedBy?, gradedAt?
}

ExtensionRequest {
  id, assignmentId, studentId,
  reason, requestedUntil,
  status, decidedBy?, decidedAt?
}
```

> **Note (877feffc):** the migration is idempotent — `DROP INDEX IF EXISTS`
> guards on all indexes, and RLS policies are created inside a
> `DO … BEGIN IF NOT EXISTS (pg_policies …)` block so replay on a fresh or
> already-migrated database is safe. `idx_assignments_poster` now keys on
> `faculty_id`, matching the 8201cd1f fix.

### Action Tiers

| Action | Tier | Confirm |
|--------|------|---------|
| faculty.assignment.create | 1 | inline |
| faculty.assignment.close | 2 | dialog |
| student.submission.create | 2 | dialog |
| student.extension.request | 1 | inline (reuses request lifecycle) |
| faculty.submission.grade | 2 | dialog |

### Build Phases

| Phase | Work | Status |
|-------|------|--------|
| 0 | Pre-flight checks + this doc | ✅ done |
| 1 | Action kernel (3 files) — `src/lib/action-envelope.ts`, `src/lib/dispatch-action.ts`, `src/lib/useAction.ts` + `POST /api/actions` | ✅ done (f140923c) |
| 2 | Notification panel fix (done: d1403db8) | ✅ |
| 3 | Teaching guard swap — `TeachingBindingGate` in `src/app/(approver)/faculty/layout.tsx` via `hasTeachingBinding()` + `/api/teaching-bindings` | ✅ done |
| 4 | Academic subsystem — `20270128000001_academic_subsystem.sql` (assignments/submissions/extensions), `/api/faculty/assignments`, RLS via `DO`-block idempotent `CREATE POLICY` on `submissions` (8201cd1f + 877feffc) | ✅ done |
| 5 | Student surface fixes (history sheet, campus RSVP) | pending |
| 6 | Sakuga theme (on consolidated tree) | pending |
