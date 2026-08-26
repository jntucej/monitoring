-- ============================================================================
-- 0003_daily_stats.sql
-- Adds a per-day gate stats table that
--   • tracks entries / exits per gate per day,
--   • rolls to a fresh row at midnight (new date row => counters reset to 0),
--   • preserves historical days, and
--   • backfills existing movement_logs history so old days are retained.
-- Safe to run against an existing database. Idempotent.
-- ============================================================================

-- 1. TABLE -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_stats (
  date           DATE   NOT NULL,
  gate_id        UUID   NOT NULL REFERENCES gates(id) ON DELETE CASCADE,
  gate_code      TEXT,
  entries        BIGINT NOT NULL DEFAULT 0,
  exits          BIGINT NOT NULL DEFAULT 0,
  peak_hour      INTEGER,
  peak_count     INTEGER,
  on_campus_last INTEGER,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (date, gate_id)
);

-- 2. AUTO-UPDATE ON NEW SCANS ---------------------------------------------
-- Every new movement row upserts today's (date, gate) counter. A scan after
-- midnight creates a brand-new row, so the day starts at 0.
CREATE OR REPLACE FUNCTION update_daily_stats_on_movement()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$ DECLARE v_date DATE; BEGIN
  v_date := (NEW.timestamp AT TIME ZONE 'UTC')::date;
  INSERT INTO daily_stats (date, gate_id, gate_code, entries, exits, updated_at)
  VALUES (
    v_date,
    NEW.gate_id,
    NEW.gate_name,
    CASE WHEN NEW.direction = 'IN'  THEN 1 ELSE 0 END,
    CASE WHEN NEW.direction = 'OUT' THEN 1 ELSE 0 END,
    NOW()
  )
  ON CONFLICT (date, gate_id) DO UPDATE
  SET entries    = daily_stats.entries + EXCLUDED.entries,
      exits      = daily_stats.exits  + EXCLUDED.exits,
      gate_code  = EXCLUDED.gate_code,
      updated_at = NOW();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_daily_stats_on_movement ON movement_logs;
CREATE TRIGGER trg_daily_stats_on_movement
  AFTER INSERT ON movement_logs FOR EACH ROW EXECUTE FUNCTION update_daily_stats_on_movement();

-- 3. RLS -------------------------------------------------------------------
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dstats_select_operator ON daily_stats;
CREATE POLICY dstats_select_operator ON daily_stats FOR SELECT TO authenticated
  USING (is_operator(auth.uid()) AND gate_id = (SELECT gate_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS dstats_select_staff ON daily_stats;
CREATE POLICY dstats_select_staff ON daily_stats FOR SELECT TO authenticated
  USING (is_supervisor(auth.uid()) OR is_admin(auth.uid()) OR is_warden(auth.uid()));

DROP POLICY IF EXISTS dstats_all_service ON daily_stats;
CREATE POLICY dstats_all_service ON daily_stats FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. BACKFILL EXISTING HISTORY (preserve past + today) --------------------------------
-- Idempotent: re-running SETs the absolute per-day totals rather than adding,
-- so repeated runs never double-count.
INSERT INTO daily_stats (date, gate_id, gate_code, entries, exits, updated_at)
SELECT
  (ml.timestamp AT TIME ZONE 'UTC')::date        AS date,
  ml.gate_id                                     AS gate_id,
  ml.gate_name                                   AS gate_code,
  COUNT(*) FILTER (WHERE ml.direction = 'IN')    AS entries,
  COUNT(*) FILTER (WHERE ml.direction = 'OUT')   AS exits,
  NOW()                                          AS updated_at
FROM movement_logs ml
GROUP BY (ml.timestamp AT TIME ZONE 'UTC')::date, ml.gate_id, ml.gate_name
ON CONFLICT (date, gate_id) DO UPDATE
SET entries = EXCLUDED.entries,
    exits   = EXCLUDED.exits,
    gate_code = EXCLUDED.gate_code,
    updated_at = NOW();