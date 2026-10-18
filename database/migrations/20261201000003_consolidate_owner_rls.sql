-- database/migrations/20261201000003_consolidate_owner_rls.sql
--
-- Consolidates the RLS "theatre" flagged in the audit. The app's postgres pool
-- sets the requesting user id via `SET LOCAL app.current_user_id` (see
-- src/lib/postgres.ts query/withTransaction options.currentUserId). A few
-- user-owned tables, however, carried blanket `USING (true)` SELECT policies
-- on the authenticated/postgres role — so RLS read enforcement was a no-op
-- and any authenticated role could read other users' follows / drafts /
-- handovers / goals / saved views.
--
-- This migration:
--   1. Rewrites the all-true "owner" SELECT policies on the user-owned tables
--      below to be owner-scoped via current_setting('app.current_user_id'),
--      which is exactly the identity the app sets on every pool connection.
--   2. Drops the universal `service_role` all-true blanket policies on the
--      same tables so we stop advertising "everyone can read everything".
--      (service_role remains able to act via table grants if it needs to —
--      but a permissive true policy is no longer required for the app, which
--      does not connect as service_role.)
--
-- It does NOT touch:
--   - tables whose SELECT policy is already meaningful (all_true = 0)
--   - insert/update/delete policies (owner scoping of those is a larger,
--     role-specific change and is out of scope for this pass)
--
-- Idempotent: guarded by policy existence; safe to re-run.

BEGIN;

-- Helper: turn a specific all-true owner SELECT policy into an owner-scoped
-- one. Each call is guarded so re-running is a no-op.
DO $$
DECLARE
  t TEXT;
  owner_col TEXT;
  pol TEXT;
  pols RECORD;
BEGIN
  -- (table, owner_column, existing owner-select policy name)
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

    -- Only act if the table + owner col exist and the policy still reads true.
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema='public' AND table_name=t)
       AND EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name=t AND column_name=owner_col)
       AND EXISTS (SELECT 1 FROM pg_policies
                   WHERE schemaname='public' AND tablename=t AND policyname=pol
                     AND regexp_like(qual::text, '^\s*true\s*$'))
    THEN
      EXECUTE format(
        'DROP POLICY %I ON %I.%I',
        pol, 'public', t
      );
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I
           FOR SELECT TO authenticated, postgres
           USING (%I::uuid = current_setting(''app.current_user_id'')::uuid
                   OR current_setting(''app.current_user_id'') IS NULL)',
        pol, 'public', t, owner_col
      );
      RAISE NOTICE 'owner-scoped policy % on %', pol, t;
    END IF;
  END LOOP;
END $$;

-- 2. Drop the universal all-true service_role blanket policies on these same
--    tables. Guarded: only drop policies that are exactly the no-op form.
DO $$
DECLARE
  t TEXT;
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT tablename, policyname
      FROM pg_policies
     WHERE schemaname='public'
       AND roles::text = '{service_role}'
       AND regexp_like(qual::text,'^\s*true\s*$')
       AND (with_check IS NULL OR regexp_like(with_check::text,'^\s*true\s*$'))
       AND tablename IN (
         'calendar_follows','user_task_drafts','shift_handovers',
         'announcement_follows','personal_goals','user_saved_views',
         'communities','community_memberships'
       )
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, pol.tablename);
    RAISE NOTICE 'dropped universal service_role policy % on %', pol.policyname, pol.tablename;
  END LOOP;
END $$;

COMMIT;
