BEGIN;

DO $$
DECLARE
  t         TEXT;
  owner_col TEXT;
  pol       TEXT;
  pols      RECORD;
BEGIN
  FOR pols IN
    SELECT unnest(ARRAY[
      'calendar_follows|user_id|calendar_follows_select_owner',
      'user_task_drafts|user_id|user_task_drafts_select_owner',
      'shift_handovers|by_user_id|shift_handovers_select_all',
      'announcement_follows|user_id|announcement_follows_select_owner',
      'personal_goals|user_id|personal_goals_select_owner',
      'user_saved_views|user_id|user_saved_views_select_owner',
      'communities|created_by|communities_select_all',
      'community_memberships|user_id|community_memberships_select_all'
    ]) AS x
  LOOP
    SELECT (split_part(pols.x,'|',1)),
           (split_part(pols.x,'|',2)),
           (split_part(pols.x,'|',3))
      INTO t, owner_col, pol;

    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema='public' AND table_name=t)
       AND EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name=t AND column_name=owner_col)
       AND EXISTS (SELECT 1 FROM pg_policies
                   WHERE schemaname='public' AND tablename=t AND policyname=pol
                     AND qual::text ~ '^\s*true\s*$')
    THEN
      EXECUTE format('DROP POLICY %I ON %I.%I', pol, 'public', t);
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I
           FOR SELECT TO authenticated, postgres
           USING (%I::uuid = auth.uid())',
        pol, 'public', t, owner_col
      );
      RAISE NOTICE 'owner-scoped policy % on %', pol, t;
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT tablename, policyname
      FROM pg_policies
     WHERE schemaname='public'
       AND roles::text = '{service_role}'
       AND qual::text ~ '^\s*true\s*$'
       AND (with_check IS NULL OR with_check::text ~ '^\s*true\s*$')
       AND tablename IN (
         'calendar_follows','user_task_drafts','shift_handovers',
         'announcement_follows','personal_goals','user_saved_views',
         'communities','community_memberships'
       )
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, pol.tablename);
    RAISE NOTICE 'dropped universal service_role policy % on %',
      pol.policyname, pol.tablename;
  END LOOP;
END $$;

COMMIT;
