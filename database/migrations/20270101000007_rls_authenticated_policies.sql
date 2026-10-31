-- database/migrations/20270101000007_rls_authenticated_policies.sql
-- Part 1 of R2-6 RLS Flip: Add robust authenticated RLS policies for complaints, emergency_alerts, delegation_rules, and meal_opt_outs.

DO $$ BEGIN
  -- Complaints RLS
  EXECUTE 'ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY';
  DROP POLICY IF EXISTS complaints_auth_select ON public.complaints;
  DROP POLICY IF EXISTS complaints_auth_insert ON public.complaints;
  DROP POLICY IF EXISTS complaints_auth_update ON public.complaints;

  CREATE POLICY complaints_auth_select ON public.complaints
    FOR SELECT TO authenticated
    USING (
      raised_by = NULLIF(current_setting('app.current_user_id', true), '')::uuid
      OR current_setting('app.current_user_role', true) IN ('admin', 'sysadmin', 'principal')
      OR current_owner_role = current_setting('app.current_user_role', true)
    );

  CREATE POLICY complaints_auth_insert ON public.complaints
    FOR INSERT TO authenticated
    WITH CHECK (
      raised_by = NULLIF(current_setting('app.current_user_id', true), '')::uuid
      OR current_setting('app.current_user_role', true) IN ('admin', 'sysadmin', 'student')
    );

  CREATE POLICY complaints_auth_update ON public.complaints
    FOR UPDATE TO authenticated
    USING (
      raised_by = NULLIF(current_setting('app.current_user_id', true), '')::uuid
      OR current_setting('app.current_user_role', true) IN ('admin', 'sysadmin', 'principal')
      OR current_owner_role = current_setting('app.current_user_role', true)
    );

  -- Emergency Alerts RLS
  EXECUTE 'ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY';
  DROP POLICY IF EXISTS alerts_auth_all ON public.security_alerts;
  CREATE POLICY alerts_auth_all ON public.security_alerts
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (current_setting('app.current_user_role', true) IN ('admin', 'sysadmin', 'supervisor', 'warden'));

  -- Delegation Rules RLS
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'delegation_rules') THEN
    EXECUTE 'ALTER TABLE public.delegation_rules ENABLE ROW LEVEL SECURITY';
    DROP POLICY IF EXISTS delegation_rules_auth_all ON public.delegation_rules;
    CREATE POLICY delegation_rules_auth_all ON public.delegation_rules
      FOR ALL TO authenticated
      USING (true)
      WITH CHECK (current_setting('app.current_user_role', true) IN ('admin', 'sysadmin', 'principal'));
  END IF;

  -- Meal Opt Outs RLS. The owner column on meal_opt_outs is `student_id`
  -- (the table has no `user_id` column — verified live), so the policy
  -- scopes rows via student_id against app.current_user_id.
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'meal_opt_outs') THEN
    EXECUTE 'ALTER TABLE public.meal_opt_outs ENABLE ROW LEVEL SECURITY';
    DROP POLICY IF EXISTS meal_opt_outs_auth_all ON public.meal_opt_outs;
    CREATE POLICY meal_opt_outs_auth_all ON public.meal_opt_outs
      FOR ALL TO authenticated
      USING (student_id::uuid = NULLIF(current_setting('app.current_user_id', true), '')::uuid OR current_setting('app.current_user_role', true) IN ('admin', 'sysadmin', 'mess_incharge'))
      WITH CHECK (student_id::uuid = NULLIF(current_setting('app.current_user_id', true), '')::uuid OR current_setting('app.current_user_role', true) IN ('admin', 'sysadmin', 'mess_incharge'));
  END IF;

END $$;
