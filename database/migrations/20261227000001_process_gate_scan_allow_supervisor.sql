-- P0-6 fix: the gate-scan RPC process_gate_scan rejects supervisors even
-- though assertOperatorGateMatch (src/server/policy/gate-access.ts) permits
-- a supervisor to scan at any of their supervised_gates. Today a supervisor
-- who passes the JS gate check then gets a FORBIDDEN from the RPC and the
-- scan 500s.
--
-- Fix: re-declare process_gate_scan with 'supervisor' added to the caller
-- role allow-list. Supervisors are NOT gate-bound (their gate access is
-- governed by the supervised_gates list checked in JS), so no gate-binding
-- clause applies to them — the same treatment admin/sysadmin/principal get.
--
-- This is a full re-create of the function (the latest definition as of
-- 20261226000002 plus the widened allow-list). All migrations are replayed
-- in order, so re-declaring the same function body is safe and idempotent.

BEGIN;

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
  -- Supervisor added to the allow-list: their gate access is governed by
  -- supervised_gates (checked in JS via assertOperatorGateMatch), not by a
  -- hard gate_id binding, so no gate constraint applies to this role.
  IF v_caller_role IS NULL OR v_caller_role NOT IN ('operator', 'admin', 'sysadmin', 'principal', 'supervisor') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
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
