SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.is_sysadmin(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ DECLARE r TEXT; BEGIN
  SELECT role INTO r FROM users WHERE id = user_id; RETURN r = 'sysadmin';
EXCEPTION WHEN OTHERS THEN RETURN FALSE; END; $function$;

CREATE OR REPLACE FUNCTION public.is_warden(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ DECLARE r TEXT; BEGIN
  SELECT role INTO r FROM users WHERE id = user_id; RETURN r = 'warden';
EXCEPTION WHEN OTHERS THEN RETURN FALSE; END; $function$;

CREATE OR REPLACE FUNCTION public.is_operator(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ DECLARE r TEXT; BEGIN
  SELECT role INTO r FROM users WHERE id = user_id; RETURN r = 'operator';
EXCEPTION WHEN OTHERS THEN RETURN FALSE; END; $function$;

CREATE OR REPLACE FUNCTION public.get_guardian_wards(p_guardian_id uuid)
 RETURNS uuid[]
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ SELECT COALESCE(array_agg(sd.user_id), ARRAY[]::UUID[]) FROM student_details sd WHERE sd.guardian_id = p_guardian_id; $function$;

CREATE OR REPLACE FUNCTION public.get_warden_hostel(p_user_id uuid)
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ SELECT assigned_hostel FROM users WHERE id = p_user_id; $function$;

CREATE OR REPLACE FUNCTION public.get_supervised_gates(p_user_id uuid)
 RETURNS uuid[]
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ SELECT COALESCE(supervised_gates, ARRAY[]::UUID[]) FROM users WHERE id = p_user_id; $function$;

CREATE OR REPLACE FUNCTION public.get_user_department(p_user_id uuid)
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ SELECT department_id FROM users WHERE id = p_user_id; $function$;

CREATE OR REPLACE FUNCTION public.invalidate_all_user_sessions(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.users
  SET handle = NULL, updated_at = NOW()
  WHERE id = p_user_id;

  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.audit_log_entry(p_action text, p_user_id uuid, p_user_name text, p_role text, p_details jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ BEGIN
  INSERT INTO audit_logs (action, user_id, user_name, user_role, details)
  VALUES (p_action, p_user_id, p_user_name, p_role, p_details);
END; $function$;

