-- 20261215000000_fix_is_warden_hostel_manager.sql
BEGIN;

-- 1. Fix the function. Policies that call is_warden(...) already pick this up
--    at query time — nothing else to change for them.
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

-- 2. DO NOT DROP POLICIES.
--    The previous version of this migration dropped any policy that contained
--    the literal text 'warden'. Recreating those policies requires knowing
--    their exact USING / WITH CHECK expressions, which are data-dependent.
--    Dropping them without recreation left the tables either over-permissive
--    or default-deny — both are regressions.
--
--    Instead, surface any policy that still has an INLINE 'warden' check.
--    Those are the ones that still need a manual follow-up because the
--    function rewrite above does NOT affect them.
DO $$
DECLARE
  pol RECORD;
  n INT := 0;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, qual::text AS q, with_check::text AS wc
      FROM pg_policies
     WHERE schemaname = 'public'
       AND (
         qual::text ~ '''warden''' OR
         with_check::text ~ '''warden'''
       )
       AND (qual::text NOT LIKE '%is_warden(%'
            AND (with_check IS NULL OR with_check::text NOT LIKE '%is_warden(%'))  LOOP
    n := n + 1;
    RAISE NOTICE
      'MANUAL REVIEW: policy % on %.% still uses inline ''warden'' — convert to is_warden(...)',
      pol.policyname, pol.schemaname, pol.tablename;
  END LOOP;
  IF n = 0 THEN
    RAISE NOTICE 'is_warden() updated. No inline ''warden'' policies require follow-up.';
  ELSE
    RAISE NOTICE '% inline ''warden'' polic(ies) need manual conversion.', n;
  END IF;
END $$;
COMMIT;
