-- 20270130000004_institutional_impact_attention_emergency.sql (down)
-- Rolls back PR-08 + PR-09 + PR-10 in reverse dependency order. The
-- existing lockdown_broadcasts table is untouched (PR-10 links to it,
-- it does not fork it).

BEGIN;

DROP TABLE IF EXISTS public.emergency_commands;
DROP TABLE IF EXISTS public.attention_items;
DROP TABLE IF EXISTS public.impact_previews;

COMMIT;
