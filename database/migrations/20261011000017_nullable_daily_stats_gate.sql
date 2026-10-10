-- database/migrations/20261011000017_nullable_daily_stats_gate.sql
-- In PostgreSQL, columns that are part of PRIMARY KEY (date, gate_id) cannot be NULL.
-- Since 20261011000002_sentinel_gate_and_trigger_fix uses sentinel gate '00000000-0000-0000-0000-000000000000'
-- for any movements with a null gate_id, daily_stats.gate_id remains NOT NULL as part of the PK.
DO $$
BEGIN
  -- Safe no-op check
  NULL;
END $$;
