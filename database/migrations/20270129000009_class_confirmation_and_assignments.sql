-- 20270129000009_class_confirmation_and_assignments.sql
--
-- Flow A — pre-class confirmation: one record per (session, faculty). Records
-- intent to teach, with a 30-min NO_SHOW fallback + substitution link.
--   CONFIRMED is intent; attendance is the evidence. A CONFIRMED session that
--   ends without attendance is the real NO_SHOW (handled by the cron, not a
--   separate state).
--
-- Flow B — assignments: two tables, one row per (assignment, student), created
-- eagerly when the assignment is created (same pattern as attendance records).
--   Submissions reuse the attachment-storage shape (jsonb attachment field).

-- ── Flow A: class confirmations ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.class_confirmations (
  session_id          TEXT NOT NULL,
  faculty_id          UUID NOT NULL,
  -- Denormalized session context (the session id is a sha256 hash — unparseable;
  -- store the class/period/date so the UI + cron can resolve them directly).
  class_id            UUID,
  period_no           INTEGER,
  session_date        DATE,
  status              TEXT NOT NULL DEFAULT 'PENDING',
  -- PENDING | CONFIRMED | NO_SHOW | SUBSTITUTED
  confirmed_at        TIMESTAMPTZ,
  confirmed_by        UUID,           -- who confirmed (faculty or an HOD on-behalf)
  substitute_faculty_id UUID,
  substitute_requested_at TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (session_id, faculty_id)
);
CREATE INDEX IF NOT EXISTS idx_class_confirmations_faculty ON public.class_confirmations (faculty_id);
CREATE INDEX IF NOT EXISTS idx_class_confirmations_status ON public.class_confirmations (status);
CREATE INDEX IF NOT EXISTS idx_class_confirmations_date ON public.class_confirmations (session_date);

-- ── Flow A: confirmation prompt dedupe marker ───────────────────────────────
-- One row per (faculty, session) so the confirmation cron prompts a faculty
-- at most once per session.
CREATE TABLE IF NOT EXISTS public.class_confirmation_markers (
  user_id    UUID NOT NULL,
  session_id TEXT NOT NULL,
  class_id   UUID NOT NULL,
  period     INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, session_id)
);
CREATE INDEX IF NOT EXISTS idx_class_confirmation_markers_session
  ON public.class_confirmation_markers (session_id);

-- ── Flow B: assignments ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.assignments (
  id              UUID NOT NULL DEFAULT gen_random_uuid(),
  class_id        UUID NOT NULL,
  subject_code    TEXT NOT NULL,
  faculty_id      UUID NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  due_at          TIMESTAMPTZ NOT NULL,
  max_marks       INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_assignments_class ON public.assignments (class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_faculty ON public.assignments (faculty_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due ON public.assignments (due_at);

CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id            UUID NOT NULL DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL,
  student_id    UUID NOT NULL,
  status        TEXT NOT NULL DEFAULT 'PENDING',
  -- PENDING | SUBMITTED | LATE | GRADED | ABSENT
  submitted_at  TIMESTAMPTZ,
  attachment    JSONB,          -- reuses the attachment-storage.ts Saved shape
  marks         INTEGER,
  feedback      TEXT,
  graded_by     UUID,
  graded_at     TIMESTAMPTZ,
  PRIMARY KEY (id),
  UNIQUE (assignment_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment ON public.assignment_submissions (assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student ON public.assignment_submissions (student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_status ON public.assignment_submissions (status);

-- ── Flow B: assignment reminder dedupe markers ─────────────────────────────
-- One row per (user, assignment) so the due-reminder cron nudes a student
-- (due.soon) and a faculty (pending) at most once each.
CREATE TABLE IF NOT EXISTS public.assignment_reminder_markers (
  user_id     UUID NOT NULL,
  assignment_id UUID NOT NULL,
  kind        TEXT NOT NULL,   -- 'due_soon' | 'pending'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, assignment_id, kind)
);
CREATE INDEX IF NOT EXISTS idx_assignment_reminder_markers_assignment
  ON public.assignment_reminder_markers (assignment_id);
