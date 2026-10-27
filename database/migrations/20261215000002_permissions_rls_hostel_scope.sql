BEGIN;

-- 1. Performance: hostel tickets are filtered by (workflow_type, hostel_scope,
--    current_stage). Index all three.
CREATE INDEX IF NOT EXISTS idx_permissions_hostel_scope_stage
  ON public.permissions (hostel_scope, current_stage, status)
  WHERE workflow_type = 'hostel' AND status IN ('PENDING', 'ESCALATED');

-- 2. RLS: hostel roles see only their scope. Scope is derived from
--    users.hostel_scope (added in 20261009000000_permission_workflow_additions).
--    A user with hostel_scope = 'both' sees everything.
DROP POLICY IF EXISTS permissions_hostel_select ON public.permissions;
CREATE POLICY permissions_hostel_select ON public.permissions
  FOR SELECT TO authenticated
  USING (
    workflow_type <> 'hostel'
    OR is_admin(current_setting('app.current_user_id', true)::uuid)
    OR is_warden(current_setting('app.current_user_id', true)::uuid)
    OR requester_user_id = current_setting('app.current_user_id', true)::uuid
    OR (
      -- Warden scope filter
      (SELECT hostel_scope FROM users WHERE id = current_setting('app.current_user_id', true)::uuid) = 'both'
      OR hostel_scope = (SELECT hostel_scope FROM users WHERE id = current_setting('app.current_user_id', true)::uuid)
      OR hostel_scope IS NULL   -- legacy rows before backfill
    )
  );

-- 3. RLS: parent/guardian sees their wards' tickets only.
DROP POLICY IF EXISTS permissions_guardian_select ON public.permissions;
CREATE POLICY permissions_guardian_select ON public.permissions
  FOR SELECT TO authenticated
  USING (
    requester_user_id = ANY(
      get_guardian_wards(current_setting('app.current_user_id', true)::uuid)
    )
  );

-- 4. Sanity: ensure the trigger we added in 20261215000001 exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_derive_hostel_scope'
      AND tgrelid = 'public.permissions'::regclass
  ) THEN
    RAISE EXCEPTION 'trg_derive_hostel_scope missing — run 20261215000001 first';
  END IF;
END $$;

COMMIT;
