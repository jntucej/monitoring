-- 20270131000036_v4_semesters_courses_and_ay_lifecycle.sql
BEGIN;

ALTER TABLE public.academic_years
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('upcoming', 'active', 'closed', 'archived'));

UPDATE public.academic_years
   SET status = CASE WHEN is_current THEN 'active' ELSE 'closed' END
 WHERE status = 'active' AND is_current = false;

CREATE TABLE IF NOT EXISTS public.academic_semesters (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_code text NOT NULL REFERENCES public.academic_years(code),
  semester_number    int NOT NULL CHECK (semester_number BETWEEN 1 AND 12),
  name               text NOT NULL,
  start_date         date NOT NULL,
  end_date           date NOT NULL,
  status             text NOT NULL DEFAULT 'upcoming'
                       CHECK (status IN ('upcoming', 'active', 'closed', 'archived')),
  UNIQUE (academic_year_code, semester_number)
);

CREATE TABLE IF NOT EXISTS public.academic_courses (
  code            text PRIMARY KEY,
  title           text NOT NULL,
  branch_code     text NOT NULL REFERENCES public.academic_branches(code),
  regulation_code text NOT NULL REFERENCES public.academic_regulations(code),
  semester_number int NOT NULL CHECK (semester_number BETWEEN 1 AND 12),
  credits         numeric(3,1) NOT NULL DEFAULT 3.0,
  is_active       boolean NOT NULL DEFAULT true,
  effective_from  date NOT NULL DEFAULT CURRENT_DATE,
  effective_to    date
);

INSERT INTO public.academic_semesters (academic_year_code, semester_number, name, start_date, end_date, status)
VALUES
  ('2026-27', 1, 'Odd Semester 2026-27',  '2026-07-01', '2026-12-15', 'active'),
  ('2026-27', 2, 'Even Semester 2026-27', '2027-01-02', '2027-05-31', 'upcoming')
ON CONFLICT (academic_year_code, semester_number) DO NOTHING;

COMMIT;
