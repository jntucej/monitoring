-- 20270130000003_institutional_decisions.sql (down)
-- Rolls back PR-05 + PR-06 in reverse dependency order. PR-07 adds no
-- tables (it is the delegation-aware query in authorize()); the
-- entity_foundation delegations table is untouched.

BEGIN;

DROP TABLE IF EXISTS public.decision_signatures;
DROP TABLE IF EXISTS public.decisions;
DROP TABLE IF EXISTS public.sla_instances;
DROP TABLE IF EXISTS public.escalations;

COMMIT;
