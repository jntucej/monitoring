-- 20270128000001_academic_subsystem.sql
-- Assignments, submissions, and extension requests for the teaching capability.
-- Keyed on faculty_assignments (subject_code + class_id) for scoping.

CREATE TABLE IF NOT EXISTS public.assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_code  VARCHAR(50)  NOT NULL,           -- matches faculty_assignments.subject_code
  class_id      UUID         NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  posted_by     UUID         NOT NULL REFERENCES public.users(id)    ON DELETE CASCADE,
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  due_at        TIMESTAMPTZ  NOT NULL,
  max_marks     NUMERIC(7,2),
  status        VARCHAR(10)  NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','closed')),
  closed_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Enforce: only bound faculty can post (trigger checks faculty_assignments)
  CONSTRAINT fk_assignments_class  FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT fk_assignments_poster FOREIGN KEY (posted_by)  REFERENCES public.users(id)
);

-- Index for the "my pending assignments" student query (by class + due date)
CREATE INDEX idx_assignments_class_due
  ON public.assignments (class_id, due_at)
  WHERE status = 'open';

-- Index for the faculty review inbox (by poster + status)
CREATE INDEX idx_assignments_poster
  ON public.assignments (posted_by, status);

CREATE TABLE IF NOT EXISTS public.submissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID         NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id    UUID         NOT NULL REFERENCES public.users(id)       ON DELETE CASCADE,
  files         JSONB        NOT NULL DEFAULT '[]',   -- [{name, key, size, contentType}]
  note          TEXT,
  submitted_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  status        VARCHAR(10)  NOT NULL DEFAULT 'submitted'
                CHECK (status IN ('submitted','graded')),
  grade         NUMERIC(7,2),
  feedback      TEXT,
  graded_by     UUID REFERENCES public.users(id),
  graded_at     TIMESTAMPTZ,

  -- One submission per student per assignment
  UNIQUE (assignment_id, student_id)
);

CREATE INDEX idx_submissions_assignment ON public.submissions (assignment_id, status);
CREATE INDEX idx_submissions_student    ON public.submissions (student_id, status);

CREATE TABLE IF NOT EXISTS public.extension_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id    UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id       UUID NOT NULL REFERENCES public.users(id)       ON DELETE CASCADE,
  reason           TEXT NOT NULL,
  requested_until  TIMESTAMPTZ NOT NULL,
  status           VARCHAR(15) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','approved','rejected')),
  decided_by       UUID REFERENCES public.users(id),
  decided_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (assignment_id, student_id)
);

CREATE INDEX idx_extension_assignment ON public.extension_requests (assignment_id, status);

-- RLS: students see only their own submissions (or privileged roles see all)
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY submissions_student_own ON public.submissions
  FOR SELECT TO public
  USING (
    student_id = current_setting('app.current_user_id', true)::uuid
    OR current_setting('app.current_user_role', true) IN ('admin','sysadmin','hod','principal')
  );

-- RLS: only the posting faculty (or admin/sysadmin) can grade
CREATE POLICY submissions_faculty_grade ON public.submissions
  FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_id
        AND a.posted_by = current_setting('app.current_user_id', true)::uuid
    )
    OR current_setting('app.current_user_role', true) IN ('admin','sysadmin')
  );
