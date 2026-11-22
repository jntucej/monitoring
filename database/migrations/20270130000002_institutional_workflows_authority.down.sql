-- 20270130000002_institutional_workflows_authority.sql (down)
-- Rolls back PR-03 + PR-04 in reverse dependency order. Domain tables
-- and the PR-02 case layer are untouched.

BEGIN;

DROP TABLE IF EXISTS public.authority_policies;
DROP TABLE IF EXISTS public.role_contexts;
DROP TABLE IF EXISTS public.workflow_transitions;
DROP TABLE IF EXISTS public.workflow_instances;
DROP TABLE IF EXISTS public.workflow_definitions;

COMMIT;
