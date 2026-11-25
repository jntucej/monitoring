-- 20270131000023_achievements.sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.achievement_templates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text UNIQUE NOT NULL,
  title        text NOT NULL,
  category     text NOT NULL,
  icon         text,
  description  text,
  awarder_role text[] NOT NULL DEFAULT '{faculty,hod,dean}',
  visibility   text NOT NULL DEFAULT 'class'
                 CHECK (visibility IN ('class', 'dept', 'campus', 'private')),
  auto_rule    jsonb,
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_achievements
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.achievement_templates(id),
  ADD COLUMN IF NOT EXISTS awarded_by_role text,
  ADD COLUMN IF NOT EXISTS evidence_url text,
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'class',
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_ua_user ON public.user_achievements (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ua_template ON public.user_achievements (template_id);

CREATE MATERIALIZED VIEW IF NOT EXISTS public.class_leaderboards AS
SELECT
  COALESCE(sd.department, 'GEN') || '-' || COALESCE(sd.semester, '1') || '-' || COALESCE(sd.section, 'A') AS class_id,
  u.id AS student_id,
  u.unique_id AS roll_no,
  u.name AS full_name,
  COALESCE(sd.department, 'GEN') AS department,
  COALESCE(
    (SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE ar.status = 'PRESENT') / NULLIF(COUNT(*), 0), 1)
       FROM public.attendance_records ar
      WHERE ar.person_id = u.id),
    0
  ) AS attendance_pct,
  COALESCE(
    (SELECT ROUND(AVG(m.score * 100.0 / NULLIF(m.max_marks, 0))::numeric, 1)
       FROM public.marks m
      WHERE m.student_id = u.id),
    0
  ) AS marks_pct,
  (SELECT COUNT(*)::int FROM public.user_achievements ua WHERE ua.user_id = u.id AND ua.revoked_at IS NULL) AS achievement_count
FROM public.users u
JOIN public.student_details sd ON sd.user_id = u.id
WHERE u.role = 'student' AND u.deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_class_leaderboards_pk
  ON public.class_leaderboards (class_id, student_id);

COMMIT;
