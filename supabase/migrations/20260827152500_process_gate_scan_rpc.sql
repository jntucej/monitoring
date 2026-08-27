-- Migration: Atomic Gate Scan Processing RPC with concurrency lock (FOR UPDATE)
-- Fixes race condition on concurrent duplicate scan check & insertion.

CREATE OR REPLACE FUNCTION process_gate_scan(
  p_scan_id UUID,
  p_user_id UUID,
  p_direction VARCHAR,
  p_reason VARCHAR,
  p_gate_id UUID,
  p_gate_name VARCHAR,
  p_operator_id UUID,
  p_operator_name VARCHAR,
  p_timestamp TIMESTAMPTZ,
  p_is_manual BOOLEAN,
  p_dup_window_minutes INT DEFAULT 5
)
RETURNS TABLE (
  inserted_log JSONB,
  is_duplicate BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recent_id UUID;
  v_log JSONB;
BEGIN
  -- Perform row lock / atomic check for recent duplicate scan within window
  SELECT id INTO v_recent_id
  FROM movement_logs
  WHERE user_id = p_user_id
    AND direction = p_direction
    AND timestamp >= (p_timestamp - (p_dup_window_minutes || ' minutes')::INTERVAL)
  ORDER BY timestamp DESC
  LIMIT 1
  FOR UPDATE;

  IF v_recent_id IS NOT NULL THEN
    SELECT to_jsonb(m.*) INTO v_log
    FROM movement_logs m
    WHERE id = v_recent_id;

    RETURN QUERY SELECT v_log, TRUE;
    RETURN;
  END IF;

  -- Insert atomic log record
  INSERT INTO movement_logs (
    id, user_id, direction, reason, gate_id, gate_name,
    operator_id, operator_name, timestamp, is_manual, is_correction
  ) VALUES (
    p_scan_id, p_user_id, p_direction, p_reason, p_gate_id, p_gate_name,
    p_operator_id, p_operator_name, p_timestamp, p_is_manual, FALSE
  );

  SELECT to_jsonb(m.*) INTO v_log
  FROM movement_logs m
  WHERE id = p_scan_id;

  RETURN QUERY SELECT v_log, FALSE;
END;
$$;
