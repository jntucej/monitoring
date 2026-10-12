-- ============================================================================
-- Campus Retention Module
-- Tables: calendar_categories, calendar_follows, campus_knowledge_docs,
--         campus_feedback_reports, user_task_drafts, shift_handovers
-- All queries go through the service client (bypass RLS), so these tables
-- mirror the established migration pattern: IF NOT EXISTS + service_role
-- policies + role grants + app_role grants + indexes.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. calendar_categories
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.calendar_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#6b7280',
  icon        TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_categories_active ON public.calendar_categories (is_active, sort_order);

ALTER TABLE public.calendar_categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'calendar_categories' AND policyname = 'calendar_categories_select_all'
  ) THEN
    CREATE POLICY "calendar_categories_select_all" ON public.calendar_categories
      FOR SELECT TO authenticated, postgres
      USING (is_active = TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'calendar_categories' AND policyname = 'calendar_categories_service_all'
  ) THEN
    CREATE POLICY "calendar_categories_service_all" ON public.calendar_categories
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Seed categories (idempotent)
INSERT INTO public.calendar_categories (code, label, color, icon, sort_order) VALUES
  ('examination',    'Examination Dates',   '#8b5cf6', 'graduation-cap', 1),
  ('workshop',       'Workshops',         '#3b82f6', 'lightbulb',      2),
  ('event',          'Events',            '#10b981', 'calendar',       3),
  ('department',     'Department Activities', '#f59e0b', 'building',   4),
  ('hostel',         'Hostel Events',     '#06b6d4', 'home',         5),
  ('staff_duty',     'Staff Duties',       '#ef4444', 'users',        6),
  ('maintenance',    'Maintenance Windows', '#84cc16', 'wrench',       7),
  ('admin_deadline', 'Administrative Deadlines', '#ec4899', 'clipboard', 8)
ON CONFLICT (code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. calendar_follows
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.calendar_follows (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_code   TEXT NOT NULL,
  reminder_optin  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, category_code)
);

CREATE INDEX IF NOT EXISTS idx_calendar_follows_user ON public.calendar_follows (user_id, created_at DESC);

ALTER TABLE public.calendar_follows ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'calendar_follows' AND policyname = 'calendar_follows_select_owner'
  ) THEN
    CREATE POLICY "calendar_follows_select_owner" ON public.calendar_follows
      FOR SELECT TO authenticated, postgres
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'calendar_follows' AND policyname = 'calendar_follows_service_all'
  ) THEN
    CREATE POLICY "calendar_follows_service_all" ON public.calendar_follows
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. campus_knowledge_docs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campus_knowledge_docs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category      TEXT NOT NULL DEFAULT 'general',
  title         TEXT NOT NULL,
  body          TEXT NOT NULL DEFAULT '',
  owner_role    TEXT NOT NULL DEFAULT 'admin',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version       INTEGER NOT NULL DEFAULT 1,
  is_published  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campus_knowledge_docs_cat ON public.campus_knowledge_docs (category, is_published);
CREATE INDEX IF NOT EXISTS idx_campus_knowledge_docs_search ON public.campus_knowledge_docs USING gin(to_tsvector('english', title || ' ' || body));

ALTER TABLE public.campus_knowledge_docs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'campus_knowledge_docs' AND policyname = 'campus_knowledge_docs_select_published'
  ) THEN
    CREATE POLICY "campus_knowledge_docs_select_published" ON public.campus_knowledge_docs
      FOR SELECT TO authenticated, postgres
      USING (is_published = TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'campus_knowledge_docs' AND policyname = 'campus_knowledge_docs_service_all'
  ) THEN
    CREATE POLICY "campus_knowledge_docs_service_all" ON public.campus_knowledge_docs
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. campus_feedback_reports
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campus_feedback_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status          TEXT NOT NULL DEFAULT 'submitted'
                  CHECK (status IN ('submitted','acknowledged','assigned','in_progress','resolved','feedback')),
  category        TEXT NOT NULL DEFAULT 'general',
  subject         TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  submitted_by    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_to     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes           TEXT,
  reviewer_note   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_campus_feedback_status ON public.campus_feedback_reports (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_campus_feedback_submitted_by ON public.campus_feedback_reports (submitted_by, created_at DESC);

ALTER TABLE public.campus_feedback_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'campus_feedback_reports' AND policyname = 'campus_feedback_select_all'
  ) THEN
    CREATE POLICY "campus_feedback_select_all" ON public.campus_feedback_reports
      FOR SELECT TO authenticated, postgres
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'campus_feedback_reports' AND policyname = 'campus_feedback_service_all'
  ) THEN
    CREATE POLICY "campus_feedback_service_all" ON public.campus_feedback_reports
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. user_task_drafts
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_task_drafts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  task_type   TEXT NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}',
  position    INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, task_type, position)
);

CREATE INDEX IF NOT EXISTS idx_user_task_drafts_user ON public.user_task_drafts (user_id, task_type, updated_at DESC);

ALTER TABLE public.user_task_drafts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_task_drafts' AND policyname = 'user_task_drafts_select_owner'
  ) THEN
    CREATE POLICY "user_task_drafts_select_owner" ON public.user_task_drafts
      FOR SELECT TO authenticated, postgres
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_task_drafts' AND policyname = 'user_task_drafts_service_all'
  ) THEN
    CREATE POLICY "user_task_drafts_service_all" ON public.user_task_drafts
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 6. shift_handovers
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shift_handovers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  by_user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  to_role       TEXT NOT NULL,
  items         JSONB NOT NULL DEFAULT '[]',
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shift_handovers_to_role ON public.shift_handovers (to_role, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shift_handovers_by_user ON public.shift_handovers (by_user_id, created_at DESC);

ALTER TABLE public.shift_handovers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'shift_handovers' AND policyname = 'shift_handovers_select_all'
  ) THEN
    CREATE POLICY "shift_handovers_select_all" ON public.shift_handovers
      FOR SELECT TO authenticated, postgres
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'shift_handovers' AND policyname = 'shift_handovers_service_all'
  ) THEN
    CREATE POLICY "shift_handovers_service_all" ON public.shift_handovers
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Grants (role + app role)
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO postgres, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO postgres, authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gate_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO gate_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO gate_app;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Record migration in schema_migrations
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='schema_migrations') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='schema_migrations' AND column_name='filename')
       AND EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='schema_migrations' AND column_name='checksum') THEN
      INSERT INTO public.schema_migrations (version, filename, applied_at, checksum)
      VALUES ('20261013000000', '20261013000000_campus_retention.sql', NOW(), md5('20261013000000_campus_retention'))
      ON CONFLICT (version) DO NOTHING;
    ELSE
      INSERT INTO public.schema_migrations (version)
      VALUES ('20261013000000')
      ON CONFLICT (version) DO NOTHING;
    END IF;
  END IF;
END $$;

COMMIT;
