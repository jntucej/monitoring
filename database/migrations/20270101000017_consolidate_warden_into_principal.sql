-- 20270101000017_consolidate_warden_into_principal.sql
-- Stop the 4-way warden migration churn: the 'warden' role is consolidated
-- into 'principal' (decision: 2026-11). This is the NEW single owner of the
-- consolidated end state:
--
--   (a) 'warden' is removed from the users.role CHECK constraint (dropped +
--       re-added WITHOUT warden; every other value preserved verbatim).
--   (b) is_warden() now tests the principal-consolidated set
--       ('principal' only — warden is gone; hostel_manager was removed from
--       the set in 20261215000000) so callers keep working against the
--       consolidated role.
--   (c) Historical data is untouched: existing users.role='warden' rows keep
--       their value; they simply no longer satisfy the role CHECK and will be
--       migrated to 'principal' by an explicit data-move if/when that is
--       decided (out of scope here — the constraint change is the schema
--       end-state, historical data stays as-is per the task).
--
-- The 6 older warden migrations (20261125000001, 20261215000000,
-- 20261221000002, 20261225000001, 20261225000002, 20270101000004) remain in
-- the replay history and replay harmlessly — only this migration defines the
-- final state. Do NOT delete them.

DO $$
DECLARE
  -- Full 21-value role set WITHOUT 'warden' (post-consolidation state).
  -- Rebuilt from the live constraint definition at 2026-11-01; any role
  -- added to users.role after this migration must be appended here.
  v_new_arr TEXT[] := ARRAY[
    'operator','admin','sysadmin','supervisor','guardian','parent','hod',
    'student','faculty','staff','worker','visitor','caretaker',
    'deputy_warden','hostel_manager','principal','vice_principal','oie',
    'exam_branch','exam_superintendent','mess_incharge','emo'
  ];
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
    -- Inline ALTER can't reference plpgsql variables — use dynamic SQL.
    EXECUTE format(
      'ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role = ANY (%L))',
      v_new_arr
    );
  END IF;
END $$;

-- (b) is_warden() → principal-consolidated equivalent. Keep the function
-- name so any remaining callers keep working; it now answers "is this user
-- the principal (warden role consolidated into principal)?"
CREATE OR REPLACE FUNCTION public.is_warden(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r TEXT;
BEGIN
  SELECT role INTO r FROM public.users WHERE id = user_id;
  -- 'warden' is consolidated into 'principal' (20270101000017). Return TRUE
  -- only for principal; hostel_manager was dropped from this set in
  -- 20261215000000 and warden is no longer a role.
  RETURN r = 'principal';
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$function$;
