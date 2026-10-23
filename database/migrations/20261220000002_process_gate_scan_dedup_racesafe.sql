-- P0-4 (reliability): the concurrent-scan dedup gap.
--
-- The old process_gate_scan used a "SELECT recent row FOR UPDATE" check, but
-- FOR UPDATE only locks existing rows — two operators scanning the same
-- student in the same minute both see "no recent row" and both insert.
-- The partial unique index in 20261220000001 makes the second insert fail
-- with a duplicate key; this rewrite turns that failure into a clean
-- "return the existing row, is_duplicate=true" instead of a 500.
BEGIN;

CREATE OR REPLACE FUNCTION public.process_gate_scan(
  p_scan_id uuid, p_user_id uuid, p_direction character varying, p_reason character varying,
  p_gate_id uuid, p_gate_name character varying, p_operator_id uuid, p_operator_name character varying,
  p_timestamp timestamp with time zone, p_is_manual boolean, p_dup_window_minutes integer DEFAULT 5
)
RETURNS TABLE(inserted_log jsonb, is_duplicate boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_caller uuid;
  v_caller_role text;
  v_caller_gate uuid;
  v_recent_id uuid;
  v_log jsonb;
  v_now timestamptz := now();
  v_ts timestamptz;
BEGIN
  BEGIN v_caller := current_setting('app.current_user_id', true)::uuid; EXCEPTION WHEN OTHERS THEN v_caller := NULL; END;
  IF v_caller IS NULL THEN RAISE EXCEPTION 'FORBIDDEN: no caller identity'; END IF;
  SELECT role, gate_id INTO v_caller_role, v_caller_gate FROM public.users WHERE id = v_caller AND status = 'ACTIVE';
  IF v_caller_role IS NULL OR v_caller_role NOT IN ('operator', 'admin', 'sysadmin', 'principal') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF v_caller_role = 'operator' AND v_caller_gate IS NOT NULL AND v_caller_gate <> p_gate_id THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  v_ts := coalesce(p_timestamp, v_now);
  IF v_ts < v_now - interval '5 minutes' OR v_ts > v_now + interval '5 minutes' THEN v_ts := v_now; END IF;

  -- Same-direction scan inside the dup window → return the existing row.
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

  IF NOT p_is_manual THEN
    BEGIN
      INSERT INTO public.movement_logs (id, user_id, direction, reason, gate_id, gate_name,
                                        operator_id, operator_name, timestamp, is_manual, is_correction)
      VALUES (p_scan_id, p_user_id, p_direction, p_reason, p_gate_id, p_gate_name,
              v_caller, p_operator_name, v_ts, false, false);
    EXCEPTION WHEN unique_violation THEN
      -- Another operator won the race in the same minute bucket: hand them
      -- the row we just saw instead of erroring.
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
    VALUES (p_scan_id, p_user_id, p_direction, p_reason, p_gate_id, p_gate_name,
            v_caller, p_operator_name, v_ts, true, false);
  END IF;

  SELECT to_jsonb(m.*) INTO v_log FROM public.movement_logs m WHERE id = p_scan_id;
  RETURN QUERY SELECT v_log, false;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.process_gate_scan(uuid, uuid, varchar, varchar, uuid, varchar, uuid, varchar, timestamptz, boolean, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_gate_scan(uuid, uuid, varchar, varchar, uuid, varchar, uuid, varchar, timestamptz, boolean, integer) TO authenticated, service_role;

COMMIT;
