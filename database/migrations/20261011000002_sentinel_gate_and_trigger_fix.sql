-- database/migrations/20261011000002_sentinel_gate_and_trigger_fix.sql
INSERT INTO public.gates (id, gate_code, name, location, type, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'UNKNOWN',
  'Unknown Gate',
  'System',
  'system',
  TRUE
)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.update_daily_stats_on_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_date DATE;
  v_code TEXT;
  v_gate_id UUID;
BEGIN
  v_date := (NEW.timestamp AT TIME ZONE 'Asia/Kolkata')::date;
  v_gate_id := COALESCE(NEW.gate_id, '00000000-0000-0000-0000-000000000000'::uuid);

  SELECT gate_code INTO v_code FROM gates WHERE id = v_gate_id;
  IF v_code IS NULL THEN
    v_code := COALESCE(NEW.gate_name, 'UNKNOWN');
  END IF;

  INSERT INTO daily_stats (date, gate_id, gate_code, entries, exits, updated_at)
  VALUES (
    v_date, v_gate_id, v_code,
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
END;
$$;
