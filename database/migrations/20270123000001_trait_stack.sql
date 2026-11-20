-- 20270123000001_trait_stack.sql
--
-- Trait layer: ~20 profile signals, each owning a small scoped slice of
-- preference keys. The kernel (lib/traits/definitions.ts) is the source of
-- truth for what each trait overrides; these tables persist the per-user
-- activation (user_traits) so temporal traits auto-activate/revert.
--
-- trait_definitions: the seed rows (the kernel's TRAIT_DEFINITIONS, mirrored
-- to the DB so an admin can audit/adjust without a deploy).
-- user_traits: which traits are active for a user, with the evidence +
-- temporal window. Refreshed on login, profile update, and daily for
-- temporal traits.

CREATE TABLE IF NOT EXISTS public.trait_definitions (
  trait_id     TEXT PRIMARY KEY,
  label        TEXT NOT NULL,
  source       TEXT NOT NULL,           -- 'profile' | 'computed' | 'temporal' | 'declared'
  category     TEXT NOT NULL DEFAULT 'student',
  roles        JSONB NOT NULL DEFAULT '[]'::jsonb,
  priority     INT NOT NULL DEFAULT 0,
  overrides    JSONB NOT NULL DEFAULT '{}'::jsonb,
  description  TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS public.user_traits (
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  trait_id     TEXT NOT NULL REFERENCES public.trait_definitions(trait_id),
  active_from  TIMESTAMPTZ NOT NULL DEFAULT now(),
  active_until TIMESTAMPTZ,
  source       TEXT NOT NULL,
  evidence     JSONB NOT NULL DEFAULT '{}'::jsonb,
  derived_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, trait_id)
);

CREATE INDEX IF NOT EXISTS idx_user_traits_user ON public.user_traits(user_id);

GRANT SELECT ON public.trait_definitions, public.user_traits TO gate_app, admin, authenticated;
GRANT INSERT, UPDATE ON public.user_traits TO gate_app, admin;

-- Seed the trait definitions (mirrors lib/traits/definitions.ts).
INSERT INTO public.trait_definitions (trait_id, label, source, category, roles, priority, overrides) VALUES
  ('year_1', 'First year', 'profile', 'student', '["student"]', 30, '{"onboarding.tour.show":"every_session"}'),
  ('exam_week', 'Exam week', 'temporal', 'student', '["student","parent","guardian","faculty"]', 100, '{"curfew.liftForStudy":true}'),
  ('on_call', 'On-call', 'temporal', 'executive', '["principal","vice_principal","admin","sysadmin","operator"]', 100, '{"ui.minimal":true}'),
  ('medical_chronic', 'Chronic medical condition', 'profile', 'student', '["student"]', 60, '{"meals.showAllergens":true}'),
  ('distant', 'Distant (>50km)', 'computed', 'student', '["student"]', 40, '{"pass.defaultType":"outpass_home"}')
ON CONFLICT (trait_id) DO UPDATE SET
  label = EXCLUDED.label, source = EXCLUDED.source, priority = EXCLUDED.priority,
  overrides = EXCLUDED.overrides;
