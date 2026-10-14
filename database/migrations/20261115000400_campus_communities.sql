-- ============================================================================
-- Campus Communities Module (G9)
-- Tables: communities, community_memberships, community_posts,
--         community_reports
--
-- All queries in the app go through the service client (bypass RLS), so these
-- tables mirror the established migration pattern: IF NOT EXISTS +
-- service_role policies + role grants + app_role grants + indexes.
--
-- Communities are FULLY MODERATED: member-created posts start in status
-- 'pending' and only moderators/admin/sysadmin may approve or hide them.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. communities
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.communities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL UNIQUE,
  description     TEXT,
  icon            TEXT,
  is_moderated    BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'communities' AND policyname = 'communities_select_all'
  ) THEN
    CREATE POLICY "communities_select_all" ON public.communities
      FOR SELECT TO authenticated, postgres
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'communities' AND policyname = 'communities_service_all'
  ) THEN
    CREATE POLICY "communities_service_all" ON public.communities
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. community_memberships
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_memberships (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id     UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_in_community TEXT NOT NULL DEFAULT 'member'
                   CHECK (role_in_community IN ('member','moderator','admin')),
  joined_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (community_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_memberships_community ON public.community_memberships (community_id);
CREATE INDEX IF NOT EXISTS idx_community_memberships_user ON public.community_memberships (user_id);

ALTER TABLE public.community_memberships ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'community_memberships' AND policyname = 'community_memberships_select_all'
  ) THEN
    CREATE POLICY "community_memberships_select_all" ON public.community_memberships
      FOR SELECT TO authenticated, postgres
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'community_memberships' AND policyname = 'community_memberships_service_all'
  ) THEN
    CREATE POLICY "community_memberships_service_all" ON public.community_memberships
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. community_posts
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id    UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  author_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','hidden')),
  reported_count  INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_posts_community ON public.community_posts (community_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_author ON public.community_posts (author_id, created_at DESC);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'community_posts' AND policyname = 'community_posts_select_all'
  ) THEN
    CREATE POLICY "community_posts_select_all" ON public.community_posts
      FOR SELECT TO authenticated, postgres
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'community_posts' AND policyname = 'community_posts_service_all'
  ) THEN
    CREATE POLICY "community_posts_service_all" ON public.community_posts
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. community_reports
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  reporter_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason       TEXT NOT NULL,
  resolved     BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_community_reports_post ON public.community_reports (post_id);
CREATE INDEX IF NOT EXISTS idx_community_reports_reporter ON public.community_reports (reporter_id, resolved);

ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'community_reports' AND policyname = 'community_reports_select_all'
  ) THEN
    CREATE POLICY "community_reports_select_all" ON public.community_reports
      FOR SELECT TO authenticated, postgres
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'community_reports' AND policyname = 'community_reports_service_all'
  ) THEN
    CREATE POLICY "community_reports_service_all" ON public.community_reports
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
-- Seed starter communities (idempotent, all fully moderated)
-- ----------------------------------------------------------------------------
INSERT INTO public.communities (name, description, icon, is_moderated, created_by)
VALUES
  ('AI & Machine Learning',  'Discuss models, tooling and research — share papers, projects and wins.', 'brain',        TRUE, NULL),
  ('Cybersecurity',          'Security topics, CTF writeups, certifications and lab practice.',          'shield',       TRUE, NULL),
  ('Web Development',        'Frontend and backend builds, code reviews and shipping tips.',            'code',         TRUE, NULL),
  ('Robotics Club',          'Robot projects, hardware, autonomy and competition prep.',               'bot',          TRUE, NULL),
  ('Entrepreneurship',       'Startup ideas, pitches, funding and founder support.',                   'rocket',       TRUE, NULL),
  ('Sports & Fitness',       'Meetups, training plans and campus sport events.',                       'dumbbell',     TRUE, NULL),
  ('Volunteering & Service', 'Service projects, drives and campus giving programs.',                   'heart-handshake', TRUE, NULL)
ON CONFLICT (name) DO NOTHING;

COMMIT;
