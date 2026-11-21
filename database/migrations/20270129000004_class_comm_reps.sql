-- 20270129000004_class_comm_reps.sql
-- 4-representative model: CR/ICR × Boys/Girls per class.
-- A class can hold up to FOUR active representatives:
--   CR-BOYS, CR-GIRLS, ICR-BOYS, ICR-GIRLS.
-- Model as ATTRIBUTES on student_representatives, not as 4 global roles
-- (capability = binding, not role; binding beats the role).
--
-- Idempotent. No destructive writes: additive columns (with defaults), drop
-- the old one-per-class index, add the new 4-way partial unique index.

-- 1. Representative type: CR (class rep) or ICR (in-charge rep / assistant).
ALTER TABLE public.student_representatives
  ADD COLUMN IF NOT EXISTS representative_type TEXT NOT NULL DEFAULT 'CR';
ALTER TABLE public.student_representatives
  ALTER COLUMN representative_type SET DEFAULT 'CR';

-- 2. Constituency: which gender-group this rep represents in the class.
-- BOYS / GIRLS. NULL = undifferentiated (legacy / gender-mixed classes).
ALTER TABLE public.student_representatives
  ADD COLUMN IF NOT EXISTS constituency TEXT;

-- 3. Backfill constituency from the student's gender where the classes table
-- is empty and a rep was appointed. Best-effort: a representative who is male
-- typically represents BOYS; a female rep represents GIRLS.
DO $$
DECLARE r RECORD;
  g TEXT;
BEGIN
  FOR r IN
    SELECT sr.id, sr.student_id
      FROM public.student_representatives sr
     WHERE sr.constituency IS NULL AND sr.status = 'active'
     LOOP
    SELECT sd.gender INTO g
      FROM public.student_details sd
     WHERE sd.user_id = r.student_id
     LIMIT 1;
    UPDATE public.student_representatives
       SET constituency = CASE g WHEN 'male' THEN 'BOYS' WHEN 'female' THEN 'GIRLS' END
     WHERE id = r.id;
  END LOOP;
END
$$;

-- 4. Enforce "one active rep per (class, type, constituency)".
--    Drop the old global one-per-class index; allow up to 4 active reps per
--    class (one per type × constituency cell). Legacy NULL-constituency rows
--    are kept compatible by treating NULL as its own cell (COALESCE key).
DROP INDEX IF EXISTS public.uq_active_class_cr;
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_rep_cell
  ON public.student_representatives
  (scope_id, representative_type, COALESCE(constituency, 'ANY'))
  WHERE (scope_type = 'class' AND status = 'active');

-- 5. CHECK constraints: valid type + valid constituency values.
ALTER TABLE public.student_representatives
  DROP CONSTRAINT IF EXISTS student_reps_type_check;
ALTER TABLE public.student_representatives
  ADD CONSTRAINT student_reps_type_check
  CHECK (representative_type IN ('CR', 'ICR'));
ALTER TABLE public.student_representatives
  DROP CONSTRAINT IF EXISTS student_reps_constituency_check;
ALTER TABLE public.student_representatives
  ADD CONSTRAINT student_reps_constituency_check
  CHECK (constituency IS NULL OR constituency IN ('BOYS', 'GIRLS'));
