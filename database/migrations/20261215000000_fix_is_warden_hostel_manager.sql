-- database/migrations/20261215000000_fix_is_warden_hostel_manager.sql
BEGIN;

-- The role `warden` was renamed to `hostel_manager` in 20261125000001.
-- is_warden() must match the new name, otherwise RLS locks wardens out.
CREATE OR REPLACE FUNCTION public.is_warden(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r TEXT;
BEGIN
  SELECT role INTO r FROM users WHERE id = user_id;
  RETURN r IN ('principal', 'warden', 'hostel_manager');
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$function$;

-- Sanity: if any RLS policy on student_details / movement_logs / gate_passes
-- still references the literal 'warden' string, migrate it to hostel_manager.
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, qual::text AS q, with_check::text AS wc
      FROM pg_policies
     WHERE schemaname = 'public'
       AND (qual::text LIKE '%''warden''%' OR with_check::text LIKE '%''warden''%')
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname, pol.schemaname, pol.tablename
    );
    RAISE NOTICE 'Recreated policy % on % with is_warden() based predicate',
      pol.policyname, pol.tablename;
  END LOOP;
END $$;

COMMIT;

-- after COMMIT
DO $$
BEGIN
  PERFORM public.is_warden((SELECT id FROM users WHERE role = 'hostel_manager' LIMIT 1));
END $$;
