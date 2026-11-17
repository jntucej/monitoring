-- 20270119: Sakuga anime-VFX theme for female students
--
-- `ui_theme` on personalization_prefs:
--   'sakuga'  - anime VFX (default for female students on first login)
--   'graphite' - existing graphite theme (default for everyone else)
--
-- Sakuga palette (from the sakuga-vfx repo, core.js):
--   --sk-ink:#1d1a4a; --sk-card:#fff; --sk-pri:#8f8df7;
--   --sk-acc:#ff5fa8; --sk-soft:#b8b3ff; --sk-dim:#8580b0;

-- Add ui_theme to personalization_prefs
ALTER TABLE public.personalization_prefs
  ADD COLUMN IF NOT EXISTS ui_theme TEXT NOT NULL DEFAULT 'graphite';

ALTER TABLE public.personalization_prefs
  DROP CONSTRAINT IF EXISTS chk_ui_theme;
ALTER TABLE public.personalization_prefs
  ADD CONSTRAINT chk_ui_theme CHECK (ui_theme IN ('sakuga', 'graphite'));

-- Default: female students get 'sakuga' on their first login
-- (the onboarding / login handler sets this; this is the seed)
UPDATE public.personalization_prefs
   SET ui_theme = 'sakuga'
 WHERE ui_theme = 'graphite'
   AND user_id IN (
     SELECT sd.user_id
       FROM public.student_details sd
       JOIN public.users u ON u.id = sd.user_id
      WHERE sd.gender = 'female' AND u.role = 'student'
   );

-- Index for the theme lookup
CREATE INDEX IF NOT EXISTS idx_prefs_theme ON public.personalization_prefs (ui_theme);
