-- database/migrations/20261011000017_nullable_daily_stats_gate.sql
ALTER TABLE public.daily_stats ALTER COLUMN gate_id DROP NOT NULL;
