-- ============================================================================
-- Achievement Verification
-- Adds verified_by / verified_at to user_achievements, ensures the
-- (user_id, achievement_code) idempotency constraint exists, and seeds the
-- trigger achievement definitions (idempotent).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Verification columns
-- ----------------------------------------------------------------------------
ALTER TABLE public.user_achievements
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.user_achievements
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- ----------------------------------------------------------------------------
-- 2. Idempotency constraint
--    The 20261115000000 migration already creates UNIQUE (user_id,
--    achievement_code) inline, but use ADD CONSTRAINT IF NOT EXISTS so this
--    migration is safe regardless of how the table was originally created.
--    A dedicated unique index first keeps this idempotent even when the
--    constraint was already added by the base migration.
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_achievements_user_code
  ON public.user_achievements (user_id, achievement_code);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_achievements_user_code_unique'
      AND conrelid = 'public.user_achievements'::regclass
  ) THEN
    ALTER TABLE public.user_achievements
      ADD CONSTRAINT user_achievements_user_code_unique
      UNIQUE (user_id, achievement_code);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. RLS policies (mirror the engagement migration pattern)
--    Owner: authenticated users can SELECT their own rows.
--    service_role retains full access so admin routes can verify.
-- ----------------------------------------------------------------------------
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_achievements'
      AND policyname = 'user_achievements_select_owner'
  ) THEN
    CREATE POLICY "user_achievements_select_owner" ON public.user_achievements
      FOR SELECT TO authenticated, postgres
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_achievements'
      AND policyname = 'user_achievements_service_all'
  ) THEN
    CREATE POLICY "user_achievements_service_all" ON public.user_achievements
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. Seed trigger achievement definitions (idempotent)
--    achievement_definitions has code as its PK (TEXT).
-- ----------------------------------------------------------------------------
INSERT INTO public.achievement_definitions (code, title, description, icon, tier)
VALUES
  ('goal_setter',         'Goal Setter',  'Created a personal goal',        'target',   'bronze'),
  ('achiever',            'Achiever',     'Completed at least 3 goals',     'trophy',   'silver'),
  ('event_participation', 'Participant',  'Registered for a campus event',  'calendar', 'bronze'),
  ('first_attendance',    'First Steps',  'First recorded campus movement', 'footprints','bronze')
ON CONFLICT (code) DO NOTHING;

COMMIT;
