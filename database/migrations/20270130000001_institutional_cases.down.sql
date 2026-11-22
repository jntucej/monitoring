-- 20270130000001_institutional_cases.sql (down)
-- Rolls back PR-02. Domain tables are untouched; only the universal
-- case layer is removed.

BEGIN;

DROP TRIGGER IF EXISTS cases_touch_updated ON public.cases;
DROP FUNCTION IF EXISTS public.touch_cases_updated_at();
DROP TABLE IF EXISTS public.case_evidence;
DROP TABLE IF EXISTS public.case_events;
DROP TABLE IF EXISTS public.cases;

COMMIT;
