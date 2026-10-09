SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_user_with_auth(p_name text, p_role text, p_unique_id text, p_email text, p_phone text, p_gate_id uuid, p_supervised_gates uuid[], p_assigned_hostel text, p_department_id text, p_can_view_gender text[], p_status text, p_login_identifier text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ DECLARE v_caller_role TEXT; v_user_id UUID; BEGIN
  SELECT role INTO v_caller_role FROM users WHERE id = current_setting('app.current_user_id', true)::uuid;
  IF v_caller_role IS NULL OR v_caller_role != 'sysadmin' THEN
    RAISE EXCEPTION 'FORBIDDEN: Only system administrators can create users';
  END IF;
  IF p_unique_id IS NULL OR p_unique_id = '' THEN
    RAISE EXCEPTION 'INVALID_UNIQUE_ID: unique_id is required';
  END IF;
  v_user_id := gen_random_uuid();
  INSERT INTO users (id,name,role,unique_id,email,phone,gate_id,
    supervised_gates,assigned_hostel,department_id,can_view_gender,status,
    auth_provider,last_password_change,updated_at,login_identifier)
  VALUES (v_user_id,p_name,p_role,p_unique_id,p_email,p_phone,p_gate_id,
    p_supervised_gates,p_assigned_hostel,p_department_id,p_can_view_gender,p_status,
    'email',NOW(),NOW(),p_login_identifier);
  RETURN v_user_id;
END; $function$;

CREATE OR REPLACE FUNCTION public.delete_user_with_auth(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ DECLARE v_caller_role TEXT; BEGIN
  SELECT role INTO v_caller_role FROM users WHERE id = current_setting('app.current_user_id', true)::uuid;
  IF v_caller_role IS NULL OR v_caller_role != 'sysadmin' THEN
    RAISE EXCEPTION 'FORBIDDEN: Only system administrators can delete users';
  END IF;
  IF p_user_id = current_setting('app.current_user_id', true)::uuid THEN RAISE EXCEPTION 'FORBIDDEN: Cannot delete own account'; END IF;
  DELETE FROM users WHERE id = p_user_id; RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RETURN FALSE; END; $function$;

CREATE OR REPLACE FUNCTION public.process_gate_scan(p_scan_id uuid, p_user_id uuid, p_direction character varying, p_reason character varying, p_gate_id uuid, p_gate_name character varying, p_operator_id uuid, p_operator_name character varying, p_timestamp timestamp with time zone, p_is_manual boolean, p_dup_window_minutes integer DEFAULT 5)
 RETURNS TABLE(inserted_log jsonb, is_duplicate boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_recent_id UUID;
  v_log JSONB;
BEGIN
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
$function$;

