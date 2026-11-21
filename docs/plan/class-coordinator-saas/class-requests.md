# Stage 1 — Class Requests (individual lane)

## Table: `class_requests`

```sql
CREATE TABLE IF NOT EXISTS public.class_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  class_id      UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  category_code TEXT NOT NULL,               -- ACADEMIC|ATTENDANCE|EXAM|TIMETABLE|ROOM|FACULTY|SUGGESTION|URGENT
  title         TEXT NOT NULL CHECK (length(title) <= 120),
  body          TEXT,
  priority      TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','urgent')),
  status        TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','in_progress','escalated','resolved','closed')),
  assigned_role TEXT,                        -- set by routing: 'faculty'|'hod'|'oie'|…
  assigned_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  raised_by_rep BOOLEAN NOT NULL DEFAULT FALSE,  -- coordinator-raised concern (collective, signed)
  parent_issue_id UUID REFERENCES public.class_level_issues(id) ON DELETE SET NULL,
  dedupe_key    TEXT,                       -- class_id||category||title-norm, for agent dedupe
  routed_at     TIMESTAMPTZ,
  resolved_at   TIMESTAMPTZ,
  resolution_note TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_class_requests_student ON public.class_requests (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_class_requests_queue ON public.class_requests (assigned_role, status, created_at)
  WHERE status IN ('open','in_progress','escalated');
CREATE INDEX IF NOT EXISTS idx_class_requests_agg ON public.class_requests (class_id, category_code, created_at)
  WHERE status IN ('open','in_progress','escalated');
```

**RLS (idempotent `DO` block, same shape as the academic migration):**
- students: SELECT/UPDATE (own status fields only, e.g. close) where
  `student_id = current_setting('app.current_user_id')`;
- routed owner roles: UPDATE (`status`, `assigned_*`, `resolution_note`)
  where `assigned_user_id = current_user` OR role matches `assigned_role`;
- HOD: SELECT for their department's classes; admin/sysadmin: all.
- No INSERT policy — inserts go through the service path (the app role
  writes via the kernel; RLS is the backstop for direct table access).

## Routing (kernel: `src/lib/class-requests.ts`)

```
raiseClassRequest({ studentId, classId, category, title, body, priority })
  1. verify student belongs to class (classes ↔ users join)
  2. category → owner role:
       ACADEMIC, ROOM, SUGGESTION   → class_teacher (of that class), fallback HOD
       ATTENDANCE                   → class_teacher
       EXAM                         → oie / hod
       TIMETABLE                    → hod
       FACULTY                      → hod (never the named faculty)
       URGENT                       → hod immediately + priority flag
  3. priority='urgent' → create notification to HOD + page (skip queue wait)
  4. INSERT, routed_at=NOW(), audit event
```

**Fallback rule:** if a class has no active `class_teacher`, route to HOD
of the class's department. The request is never orphaned.

## Aggregation input contract

The agent (stage 4) reads only the partial index `idx_class_requests_agg`:
same `(class_id, category_code)` with ≥ `AGG_N` (default 3) open rows in
`AGG_WINDOW` (default 72h) → create ONE `class_level_issues` row and link
`parent_issue_id` back onto each contributing request.

## Surfaces (stage 5, listed here for reference)

- student: "Raise a request" picker + "My requests"
- faculty/HOD: queue view, resolve with note

## Actions (via `/api/actions`)

| action | tier | confirm |
|---|---|---|
| `class_request.raise` | 0 | none |
| `class_request.close` (student self-close) | 0 | none |
| `class_request.resolve` (owner) | 1 | none |
| `class_request.escalate` | 2 | dialog |
