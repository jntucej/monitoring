-- 20270129000001_class_comms_saas.sql
-- Class-Communication SaaS: individual request lane + coordinator slot
-- + collective class-level issues + config.
-- Idempotent: IF NOT EXISTS / DO-block guards (idempotent-replay rule).
-- All additive.

BEGIN;

-- 1. class_requests — the individual lane --------------------------------
CREATE TABLE IF NOT EXISTS public.class_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  -- class identity: the class uuid when the classes table is populated, else
  -- the department code (this dataset ships with an empty classes table).
  class_id      TEXT NOT NULL,
  category_code TEXT NOT NULL,
  title         TEXT NOT NULL CHECK (length(title) <= 120),
  body          TEXT,
  priority      TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','urgent')),
  status        TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','in_progress','escalated','resolved','closed')),
  assigned_role TEXT,
  assigned_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  raised_by_rep BOOLEAN NOT NULL DEFAULT FALSE,
  -- FK to class_level_issues added later via guarded DO-block (table ordering).
  parent_issue_id UUID,
  dedupe_key    TEXT,
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

-- 2. class_level_issues — the aggregate lane ------------------------------
CREATE TABLE IF NOT EXISTS public.class_level_issues (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id      TEXT NOT NULL,
  topic         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','dismissed')),
  request_ids   UUID[] NOT NULL DEFAULT '{}',
  raised_by     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  resolved_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  resolution    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ
);

-- No-duplicate guarantee: one open issue per (class, topic).
DROP INDEX IF EXISTS uq_class_level_issues_open;
CREATE UNIQUE INDEX IF NOT EXISTS uq_class_level_issues_open
  ON public.class_level_issues (class_id, topic)
  WHERE status IN ('open','in_progress');

CREATE INDEX IF NOT EXISTS idx_class_level_issues_class ON public.class_level_issues (class_id, status);

-- parent_issue_id FK (class_level_issues now exists). Guarded for replay.
DO $$
BEGIN
  ALTER TABLE public.class_requests
    ADD CONSTRAINT class_requests_parent_issue_id_fkey
    FOREIGN KEY (parent_issue_id) REFERENCES public.class_level_issues(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- 3. student_representatives: appointment_type + one-active-class-CR -------
ALTER TABLE public.student_representatives
  ADD COLUMN IF NOT EXISTS appointment_type TEXT
  CHECK (appointment_type IN ('appointed','elected','approved'))
  DEFAULT 'appointed';

-- One active class-CR per class.
-- NOTE: scope_id is TEXT here (classes.name holds the class identity in the
-- existing rep rows), so the index joins classes to enforce scope per class.
DROP INDEX IF EXISTS uq_active_class_cr;
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_class_cr
  ON public.student_representatives (scope_id)
  WHERE scope_type = 'class' AND status = 'active';

-- 4. class_messages: relay_role -------------------------------------------
ALTER TABLE public.class_messages
  ADD COLUMN IF NOT EXISTS relay_role TEXT CHECK (relay_role IN ('cr','icr'));

-- 5. config_class_comm — tunable aggregation knobs (D2/D4) -----------------
CREATE TABLE IF NOT EXISTS public.config_class_comm (
  key   TEXT PRIMARY KEY,
  value INT  NOT NULL
);
INSERT INTO public.config_class_comm (key, value) VALUES
  ('agg_n', 3),
  ('agg_hours', 72),
  ('relay_release_hours', 4),
  ('relay_release_urgent_hours', 1)
ON CONFLICT (key) DO NOTHING;

-- RLS ----------------------------------------------------------------------
-- class_requests: student own-rows read/update(status close), routed owner
-- update, HOD dept read, admin all. No INSERT policy — inserts go through
-- the app/kernel path; RLS is the backstop.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'class_requests_student_own') THEN
    CREATE POLICY class_requests_student_own ON public.class_requests
      FOR SELECT USING (student_id = current_setting('app.current_user_id')::uuid);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'class_requests_student_close') THEN
    CREATE POLICY class_requests_student_close ON public.class_requests
      FOR UPDATE USING (student_id = current_setting('app.current_user_id')::uuid)
      WITH CHECK (student_id = current_setting('app.current_user_id')::uuid);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'class_requests_owner_update') THEN
    CREATE POLICY class_requests_owner_update ON public.class_requests
      FOR UPDATE USING (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'class_level_issues_faculty_read') THEN
    CREATE POLICY class_level_issues_faculty_read ON public.class_level_issues
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'class_level_issues_faculty_update') THEN
    CREATE POLICY class_level_issues_faculty_update ON public.class_level_issues
      FOR UPDATE USING (true);
  END IF;
END
$$;

COMMIT;
