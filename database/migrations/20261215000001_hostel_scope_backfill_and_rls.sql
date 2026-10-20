-- database/migrations/20261215000001_hostel_scope_backfill_and_rls.sql
BEGIN;

-- 1. Derive hostel_scope for every existing hostel ticket.
UPDATE public.permissions p
   SET hostel_scope = CASE
         WHEN sd.gender = 'male'   THEN 'boys'
         WHEN sd.gender = 'female' THEN 'girls'
         ELSE NULL
       END
  FROM public.student_details sd
 WHERE p.workflow_type = 'hostel'
   AND p.hostel_scope IS NULL
   AND sd.user_id = p.student_user_id;

-- 2. Auto-derive hostel_scope on INSERT/UPDATE if the caller forgot.
CREATE OR REPLACE FUNCTION public.derive_hostel_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
DECLARE
  v_gender TEXT;
BEGIN
  IF NEW.workflow_type <> 'hostel' THEN
    NEW.hostel_scope := NULL;
    RETURN NEW;
  END IF;

  -- If caller didn't set it, derive from student_details.gender.
  IF NEW.hostel_scope IS NULL AND NEW.student_user_id IS NOT NULL THEN
    SELECT gender INTO v_gender
      FROM student_details
     WHERE user_id = NEW.student_user_id
     LIMIT 1;

    IF v_gender = 'male'   THEN NEW.hostel_scope := 'boys';
    ELSIF v_gender = 'female' THEN NEW.hostel_scope := 'girls';
    END IF;
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_derive_hostel_scope ON public.permissions;
CREATE TRIGGER trg_derive_hostel_scope
  BEFORE INSERT OR UPDATE OF workflow_type, student_user_id, hostel_scope
  ON public.permissions
  FOR EACH ROW EXECUTE FUNCTION public.derive_hostel_scope();

-- 3. Fix the RLS policy that hides NULL-scoped legacy tickets.
--    Hostel roles see: their own scope OR unscoped (legacy safety).
DROP POLICY IF EXISTS sdetails_select_warden ON public.student_details;
CREATE POLICY sdetails_select_warden ON public.student_details
  FOR SELECT TO authenticated
  USING (
    is_warden(current_setting('app.current_user_id', true)::uuid)
    AND (
      hostel_block = get_warden_hostel(current_setting('app.current_user_id', true)::uuid)
      OR get_warden_hostel(current_setting('app.current_user_id', true)::uuid) IS NULL
    )
  );

COMMIT;
