-- P1 fix: movement_logs.reason was declared NOT NULL with a CHECK that only
-- allows a fixed list of exit-reason codes. But an IN (arrival) scan carries
-- NO exit reason — the app sends null/blank for arrivals. The hardened
-- process_gate_scan (20261223000003_security_hardening2) inserts p_reason raw,
-- so every IN scan violated the NOT NULL / CHECK constraint and 500'd.
--
-- Fix:
--   1. movement_logs.reason → DROP NOT NULL (arrivals store NULL).
--   2. Widen the CHECK to accept NULL plus the full set of exit-reason codes.
--   3. Repatch process_gate_scan: blank p_reason normalises to NULL; real
--      exit-reason codes pass through untouched.
--
-- movement_logs is empty at the point this migration was written (0 rows),
-- so the column-level change loses no data.

BEGIN;

ALTER TABLE public.movement_logs ALTER COLUMN reason DROP NOT NULL;

ALTER TABLE public.movement_logs
  DROP CONSTRAINT IF EXISTS movement_logs_reason_check;
ALTER TABLE public.movement_logs
  ADD CONSTRAINT movement_logs_reason_check
  CHECK (
    reason IS NULL
    OR reason IN (
      'Home Out','Day Out','Leave','Regular','Outing','Emergency',
      'Daily Outing','Day Pass','Home In','Special Leave','Weekend Outing',
      'daily_outing','home_in','home_out','day_pass',
      'emergency','special_leave','day_scholar_out'
    )
  );

CREATE OR REPLACE FUNCTION public.process_gate_scan(
  p_scan_id uuid, p_user_id uuid, p_direction character varying, p_reason character varying,
  p_gate_id uuid, p_gate_name character varying, p_operator_id uuid, p_operator_name character varying,
  p_timestamp timestamp with time zone, p_is_manual boolean, p_dup_window_minutes integer DEFAULT 5
)
RETURNS TABLE(inserted_log jsonb, is_duplicate boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid;
  v_caller_role text;
  v_caller_gate uuid;
  v_recent_id uuid;
  v_recent_manual_id uuid;
  v_log jsonb;
  v_now timestamptz := now();
  v_ts timestamptz;
  v_reason text;
BEGIN
  BEGIN v_caller := current_setting('app.current_user_id', true)::uuid; EXCEPTION WHEN OTHERS THEN v_caller := NULL; END;
  IF v_caller IS NULL THEN RAISE EXCEPTION 'FORBIDDEN: no caller identity'; END IF;
  SELECT role, gate_id INTO v_caller_role, v_caller_gate FROM public.users WHERE id = v_caller AND status = 'ACTIVE';
  IF v_caller_role IS NULL OR v_caller_role NOT IN ('operator', 'admin', 'sysadmin', 'principal') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF v_caller_role = 'operator' AND v_caller_gate IS NOT NULL AND v_caller_gate <> p_gate_id THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  v_ts := coalesce(p_timestamp, v_now);
  IF v_ts < v_now - interval '5 minutes' OR v_ts > v_now + interval '5 minutes' THEN v_ts := v_now; END IF;

  -- Arrivals (IN scans) have no exit reason: blank / whitespace p_reason
  -- becomes NULL. Exit-reason codes pass through untouched.
  v_reason := nullif(trim(p_reason), '');

  SELECT id INTO v_recent_id
  FROM public.movement_logs
  WHERE user_id = p_user_id AND direction = p_direction
    AND timestamp >= (v_now - (p_dup_window_minutes || ' minutes')::interval)
    AND NOT is_manual
  ORDER BY timestamp DESC LIMIT 1
  FOR UPDATE;
  IF v_recent_id IS NOT NULL THEN
    SELECT to_jsonb(m.*) INTO v_log FROM public.movement_logs m WHERE id = v_recent_id;
    RETURN QUERY SELECT v_log, true;
    RETURN;
  END IF;

  SELECT id INTO v_recent_manual_id
  FROM public.movement_logs
  WHERE user_id = p_user_id AND direction = p_direction
    AND timestamp >= (v_now - INTERVAL '60 seconds')
    AND is_manual = TRUE
  ORDER BY timestamp DESC LIMIT 1 FOR UPDATE;
  IF v_recent_manual_id IS NOT NULL AND p_is_manual THEN
    RAISE EXCEPTION 'DUPLICATE_MANUAL_SCAN_WITHIN_60S: A manual scan was already recorded for this user/direction within the last 60 seconds.';
  END IF;
  IF v_recent_manual_id IS NOT NULL AND NOT p_is_manual THEN
    RAISE EXCEPTION 'DUPLICATE_SCAN_WITHIN_60S: A manual scan was already recorded for this user/direction within the last 60 seconds.';
  END IF;

  IF NOT p_is_manual THEN
    BEGIN
      INSERT INTO public.movement_logs (id, user_id, direction, reason, gate_id, gate_name,
                                        operator_id, operator_name, timestamp, is_manual, is_correction)
      VALUES (p_scan_id, p_user_id, p_direction, v_reason, p_gate_id, p_gate_name,
              v_caller, p_operator_name, v_ts, false, false);
    EXCEPTION WHEN unique_violation THEN
      SELECT to_jsonb(m.*) INTO v_log FROM public.movement_logs m
       WHERE m.user_id = p_user_id AND m.direction = p_direction
         AND public.movement_minute_bucket(m.timestamp) = public.movement_minute_bucket(v_ts)
       ORDER BY m.timestamp DESC LIMIT 1;
      IF v_log IS NOT NULL THEN
        RETURN QUERY SELECT v_log, true;
        RETURN;
      END IF;
      RAISE;
    END;
  ELSE
    INSERT INTO public.movement_logs (id, user_id, direction, reason, gate_id, gate_name,
                                      operator_id, operator_name, timestamp, is_manual, is_correction)
    VALUES (p_scan_id, p_user_id, p_direction, v_reason, p_gate_id, p_gate_name,
            v_caller, p_operator_name, v_ts, true, false);
  END IF;

  SELECT to_jsonb(m.*) INTO v_log FROM public.movement_logs m WHERE id = p_scan_id;
  RETURN QUERY SELECT v_log, false;
END;
$function$;

COMMIT;
