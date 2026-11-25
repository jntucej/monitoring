-- 20270131000033_versioned_academic_core.sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.academic_years (
  code       text PRIMARY KEY,
  start_date date NOT NULL,
  end_date   date NOT NULL,
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.academic_programs (
  code           text PRIMARY KEY,
  name           text NOT NULL,
  duration_years int NOT NULL CHECK (duration_years BETWEEN 1 AND 6),
  is_active      boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.academic_branches (
  code           text PRIMARY KEY,
  short_name     text NOT NULL,
  full_name      text NOT NULL,
  merged_into    text REFERENCES public.academic_branches(code),
  effective_from date NOT NULL DEFAULT '2007-01-01',
  effective_to   date,
  is_active      boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.entry_modes (
  code                   text PRIMARY KEY,
  program_code           text NOT NULL REFERENCES public.academic_programs(code),
  label                  text NOT NULL,
  starting_year_of_study int NOT NULL DEFAULT 1,
  duration_years         int NOT NULL
);

CREATE TABLE IF NOT EXISTS public.academic_regulations (
  code           text PRIMARY KEY,
  program_code   text NOT NULL REFERENCES public.academic_programs(code),
  effective_from date NOT NULL,
  is_active      boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.student_academic_history (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  academic_year_code text NOT NULL REFERENCES public.academic_years(code),
  program_code       text NOT NULL REFERENCES public.academic_programs(code),
  branch_code        text NOT NULL REFERENCES public.academic_branches(code),
  entry_mode_code    text NOT NULL REFERENCES public.entry_modes(code),
  regulation_code    text REFERENCES public.academic_regulations(code),
  year_of_study      int NOT NULL CHECK (year_of_study BETWEEN 1 AND 6),
  section            text,
  academic_status    text NOT NULL DEFAULT 'active'
                       CHECK (academic_status IN ('active', 'detained', 'year_back', 'branch_change', 'readmitted', 'graduated')),
  event_reason       text,
  effective_from     timestamptz NOT NULL DEFAULT now(),
  effective_to       timestamptz,
  created_by         uuid,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sah_student_effective
  ON public.student_academic_history (student_id, effective_from DESC);

ALTER TABLE public.movement_logs
  ADD COLUMN IF NOT EXISTS academic_snapshot jsonb;

ALTER TABLE public.gate_devices
  ADD COLUMN IF NOT EXISTS replaced_by uuid REFERENCES public.gate_devices(id),
  ADD COLUMN IF NOT EXISTS retired_at timestamptz;

CREATE TABLE IF NOT EXISTS public.schedule_exceptions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type    text NOT NULL CHECK (target_type IN ('gate', 'class', 'campus')),
  target_id      text NOT NULL,
  exception_date date NOT NULL,
  override_mode  text NOT NULL CHECK (override_mode IN ('closed', 'extended', 'holiday', 'custom')),
  open_time      time,
  close_time     time,
  reason         text NOT NULL,
  created_by     uuid,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (target_type, target_id, exception_date)
);

-- Seed structural catalogs
INSERT INTO public.academic_years (code, start_date, end_date, is_current)
VALUES
  ('2025-26', '2025-07-01', '2026-06-30', false),
  ('2026-27', '2026-07-01', '2027-06-30', true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.academic_programs (code, name, duration_years)
VALUES
  ('BTECH', 'Bachelor of Technology', 4),
  ('MTECH', 'Master of Technology', 2)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.academic_branches (code, short_name, full_name)
VALUES
  ('02', 'EEE', 'Electrical & Electronics Engineering'),
  ('03', 'ME',  'Mechanical Engineering'),
  ('04', 'ECE', 'Electronics & Communication Engineering'),
  ('05', 'CSE', 'Computer Science & Engineering'),
  ('12', 'IT',  'Information Technology')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.entry_modes (code, program_code, label, starting_year_of_study, duration_years)
VALUES
  ('1A', 'BTECH', 'Regular B.Tech', 1, 4),
  ('5A', 'BTECH', 'Lateral B.Tech', 2, 3),
  ('1D', 'MTECH', 'Regular M.Tech', 1, 2)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.academic_regulations (code, program_code, effective_from)
VALUES
  ('R22', 'BTECH', '2022-07-01'),
  ('R25', 'BTECH', '2025-07-01')
ON CONFLICT (code) DO NOTHING;

-- Backfill active students into student_academic_history (idempotent)
INSERT INTO public.student_academic_history
  (student_id, academic_year_code, program_code, branch_code, entry_mode_code, regulation_code, year_of_study, section, academic_status, event_reason)
SELECT
  u.id,
  '2026-27',
  CASE WHEN u.unique_id ~ '^[0-9]{2}JJ1D' THEN 'MTECH' ELSE 'BTECH' END,
  CASE
    WHEN UPPER(COALESCE(sd.department, '')) IN ('EEE', '02') THEN '02'
    WHEN UPPER(COALESCE(sd.department, '')) IN ('ME', 'MECH', '03') THEN '03'
    WHEN UPPER(COALESCE(sd.department, '')) IN ('ECE', '04') THEN '04'
    WHEN UPPER(COALESCE(sd.department, '')) IN ('IT', '12') THEN '12'
    ELSE '05'
  END,
  CASE
    WHEN u.unique_id ~ '^[0-9]{2}JJ5A' THEN '5A'
    WHEN u.unique_id ~ '^[0-9]{2}JJ1D' THEN '1D'
    ELSE '1A'
  END,
  'R22',
  GREATEST(1, LEAST(4, COALESCE(sd.year, 1))),
  sd.section,
  'active',
  'Initial backfill from student_details'
FROM public.users u
LEFT JOIN public.student_details sd ON sd.user_id = u.id
WHERE u.role = 'student'
  AND u.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.student_academic_history sah WHERE sah.student_id = u.id
  );

COMMIT;
