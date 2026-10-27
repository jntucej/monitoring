-- P0-4 (reliability): concurrent gate scans of the same student+direction
-- within the dedup window can both see "no recent row" and both insert,
-- producing duplicate movement_logs rows that inflate occupancy + stats.
--
-- Fix: a partial UNIQUE index on (user_id, direction, minute-bucket) for
-- non-manual scans. date_trunc is STABLE, so Postgres rejects it in a
-- plain expression index — instead we add a small IMMUTABLE helper that
-- computes the epoch-minute bucket, and index on that.
BEGIN;

CREATE OR REPLACE FUNCTION public.movement_minute_bucket(ts timestamptz)
  RETURNS bigint
  LANGUAGE sql
  IMMUTABLE STRICT
AS $$
  SELECT FLOOR(EXTRACT(epoch FROM ts) / 60)::bigint;
$$;

COMMIT;

-- CONCURRENTLY cannot run inside a transaction block, so it's issued here
-- as a standalone statement (not wrapped in BEGIN/COMMIT).
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_movement_logs_dedup
  ON public.movement_logs (user_id, direction, public.movement_minute_bucket(timestamp))
  WHERE NOT is_manual;
