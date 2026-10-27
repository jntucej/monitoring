-- ============================================================================
-- Campus Engagement Module
-- Tables: campus_events, event_registrations, announcement_follows,
--         achievement_definitions, user_achievements, personal_goals
-- All queries in the app go through the service client (bypass RLS), so these
-- tables mirror the established migration pattern: IF NOT EXISTS + service_role
-- policies + role grants + app_role grants + indexes.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. campus_events
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campus_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  category        TEXT NOT NULL DEFAULT 'general',
  location        TEXT,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ,
  capacity        INTEGER,
  is_public       BOOLEAN NOT NULL DEFAULT TRUE,
  is_published    BOOLEAN NOT NULL DEFAULT TRUE,
  published_by    TEXT NOT NULL DEFAULT 'campus',
  published_by_user_id UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campus_events_start ON public.campus_events (starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_campus_events_published ON public.campus_events (is_published, is_public);

ALTER TABLE public.campus_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'campus_events' AND policyname = 'campus_events_select_public'
  ) THEN
    CREATE POLICY "campus_events_select_public" ON public.campus_events
      FOR SELECT TO authenticated, postgres
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'campus_events' AND policyname = 'campus_events_service_all'
  ) THEN
    CREATE POLICY "campus_events_service_all" ON public.campus_events
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. event_registrations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES public.campus_events(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'registered'
              CHECK (status IN ('registered','attended','cancelled')),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_registrations_user ON public.event_registrations (user_id, registered_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event ON public.event_registrations (event_id, status);

ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'event_registrations' AND policyname = 'event_registrations_select_owner'
  ) THEN
    CREATE POLICY "event_registrations_select_owner" ON public.event_registrations
      FOR SELECT TO authenticated, postgres
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'event_registrations' AND policyname = 'event_registrations_service_all'
  ) THEN
    CREATE POLICY "event_registrations_service_all" ON public.event_registrations
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. announcement_follows
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.announcement_follows (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  announcement_id   TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, announcement_id)
);

CREATE INDEX IF NOT EXISTS idx_announcement_follows_user ON public.announcement_follows (user_id);

ALTER TABLE public.announcement_follows ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'announcement_follows' AND policyname = 'announcement_follows_select_owner'
  ) THEN
    CREATE POLICY "announcement_follows_select_owner" ON public.announcement_follows
      FOR SELECT TO authenticated, postgres
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'announcement_follows' AND policyname = 'announcement_follows_service_all'
  ) THEN
    CREATE POLICY "announcement_follows_service_all" ON public.announcement_follows
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. achievement_definitions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.achievement_definitions (
  code        TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon        TEXT,
  criteria    TEXT NOT NULL DEFAULT '',
  tier        TEXT NOT NULL DEFAULT 'bronze',
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.achievement_definitions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'achievement_definitions' AND policyname = 'achievement_definitions_select_all'
  ) THEN
    CREATE POLICY "achievement_definitions_select_all" ON public.achievement_definitions
      FOR SELECT TO authenticated, postgres
      USING (enabled = TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'achievement_definitions' AND policyname = 'achievement_definitions_service_all'
  ) THEN
    CREATE POLICY "achievement_definitions_service_all" ON public.achievement_definitions
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. user_achievements
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_code TEXT NOT NULL,
  earned_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, achievement_code)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements (user_id, earned_at DESC);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_achievements' AND policyname = 'user_achievements_select_owner'
  ) THEN
    CREATE POLICY "user_achievements_select_owner" ON public.user_achievements
      FOR SELECT TO authenticated, postgres
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_achievements' AND policyname = 'user_achievements_service_all'
  ) THEN
    CREATE POLICY "user_achievements_service_all" ON public.user_achievements
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 6. personal_goals
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.personal_goals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  target_value  INTEGER NOT NULL DEFAULT 1,
  current_value INTEGER NOT NULL DEFAULT 0,
  is_completed  BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_personal_goals_user ON public.personal_goals (user_id, is_completed);

ALTER TABLE public.personal_goals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'personal_goals' AND policyname = 'personal_goals_select_owner'
  ) THEN
    CREATE POLICY "personal_goals_select_owner" ON public.personal_goals
      FOR SELECT TO authenticated, postgres
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'personal_goals' AND policyname = 'personal_goals_service_all'
  ) THEN
    CREATE POLICY "personal_goals_service_all" ON public.personal_goals
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
-- Seed achievement definitions (idempotent)
-- ----------------------------------------------------------------------------
INSERT INTO public.achievement_definitions (code, title, description, icon, tier)
VALUES
  ('first_attendance',  'First Steps',       'Completed your first day on campus.',              'footprints',  'bronze'),
  ('early_bird',        'Early Bird',        'Consistently arrive early on campus.',              'sunrise',     'silver'),
  ('event_participation','Campus Participant','Registered and attended a campus event.',          'calendar',    'bronze'),
  ('goal_setter',       'Goal Setter',       'Set at least one personal goal.',                   'target',      'bronze'),
  ('achiever',          'Achiever',          'Earned 3 or more achievements.',                    'trophy',      'gold')
ON CONFLICT (code) DO NOTHING;

COMMIT;
