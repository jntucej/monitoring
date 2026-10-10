-- database/migrations/20261013000000_harden_scan_and_user_functions.sql

BEGIN;

-- Issue 429: Secure process_gate_scan
CREATE OR REPLACE FUNCTION public.process_gate_scan(
  p_scan_id uuid, p_user_id uuid, p_direction character varying, p_reason character varying, p_gate_id uuid, p_gate_name character varying, p_operator_id uuid,
  p_operator_name character varying, p_timestamp timestamp with time zone, p_is_manual boolean, p_dup_window_minutes integer DEFAULT 5
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
  IF v_caller_role IS NULL OR v_caller_role NOT IN ('operator', 'admin', 'sysadmin', 'warden') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF v_caller_role = 'operator' AND v_caller_gate IS NOT NULL AND v_caller_gate <> p_gate_id THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  
  v_ts := coalesce(p_timestamp, v_now);
  IF v_ts < v_now - interval '5 minutes' OR v_ts > v_now + interval '5 minutes' THEN v_ts := v_now; END IF;

  SELECT id INTO v_recent_id FROM public.movement_logs WHERE user_id = p_user_id AND direction = p_direction AND timestamp >= (v_now - (p_dup_window_minutes || ' minutes')::interval) ORDER BY timestamp DESC LIMIT 1 FOR UPDATE;
  IF v_recent_id IS NOT NULL THEN
    SELECT to_jsonb(m.*) INTO v_log FROM public.movement_logs m WHERE id = v_recent_id;
    RETURN QUERY SELECT v_log, true;
    RETURN;
  END IF;

  INSERT INTO public.movement_logs (id, user_id, direction, reason, gate_id, gate_name, operator_id, operator_name, timestamp, is_manual, is_correction) 
  VALUES (p_scan_id, p_user_id, p_direction, p_reason, p_gate_id, p_gate_name, v_caller, p_operator_name, v_ts, p_is_manual, false);
  SELECT to_jsonb(m.*) INTO v_log FROM public.movement_logs m WHERE id = p_scan_id;
  RETURN QUERY SELECT v_log, false;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.process_gate_scan(uuid, uuid, varchar, varchar, uuid, varchar, uuid, varchar, timestamptz, boolean, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_gate_scan(uuid, uuid, varchar, varchar, uuid, varchar, uuid, varchar, timestamptz, boolean, integer) TO authenticated, service_role;

-- Issue 430: Fix create_user_with_auth bootstrapping (bootstrap detection)
CREATE OR REPLACE FUNCTION public.create_user_with_auth(
  p_name text, p_role text, p_unique_id text, p_email text, p_phone text,
  p_gate_id uuid, p_supervised_gates uuid[], p_assigned_hostel text,
  p_department_id text, p_can_view_gender text[], p_status text, p_login_identifier text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid;
  v_caller_role text;
  v_user_count int;
  v_user_id uuid;
BEGIN
  BEGIN v_caller := current_setting('app.current_user_id', true)::uuid; EXCEPTION WHEN OTHERS THEN v_caller := NULL; END;
  SELECT count(*) INTO v_user_count FROM users;
  
  IF v_user_count > 0 THEN
    IF v_caller IS NULL THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501'; END IF;
    SELECT role INTO v_caller_role FROM users WHERE id = v_caller AND status = 'ACTIVE';
    IF v_caller_role IS DISTINCT FROM 'sysadmin' THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501'; END IF;
  END IF;

  IF p_unique_id IS NULL OR trim(p_unique_id) = '' THEN
    RAISE EXCEPTION 'INVALID_UNIQUE_ID: unique_id is required';
  END IF;

  v_user_id := gen_random_uuid();
  INSERT INTO users (
    id, name, role, unique_id, email, phone, gate_id,
    supervised_gates, assigned_hostel, department_id, can_view_gender, status,
    auth_provider, last_password_change, updated_at, login_identifier
  ) VALUES (
    v_user_id, p_name, p_role, p_unique_id, p_email, p_phone, p_gate_id,
    p_supervised_gates, p_assigned_hostel, p_department_id, p_can_view_gender, p_status,
    'email', NOW(), NOW(), p_login_identifier
  );
  RETURN v_user_id;
END;
$function$;

-- Issue 431: Fix delete_user_with_auth
CREATE OR REPLACE FUNCTION public.delete_user_with_auth(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE v_caller_role text; v_caller_id uuid; v_row_count int;
BEGIN
  BEGIN v_caller_id := current_setting('app.current_user_id', true)::uuid; EXCEPTION WHEN OTHERS THEN v_caller_id := NULL; END;
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501'; END IF;
  SELECT role INTO v_caller_role FROM public.users WHERE id = v_caller_id;
  IF v_caller_role IS DISTINCT FROM 'sysadmin' THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501'; END IF;
  IF p_user_id = v_caller_id THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501'; END IF;
  DELETE FROM public.users WHERE id = p_user_id;
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  RETURN v_row_count > 0;
END;
$function$;

COMMIT;
