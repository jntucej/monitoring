SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ BEGIN
  NEW.updated_at = NOW(); RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ BEGIN
  -- ponytail: no-op on self-hosted; user creation is handled by the API layer
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.create_audit_log_on_movement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ DECLARE v_role TEXT; BEGIN
  SELECT role INTO v_role FROM users WHERE id = NEW.operator_id;
  PERFORM audit_log_entry('MOVEMENT_CREATED', NEW.operator_id, NEW.operator_name, v_role,
    jsonb_build_object('direction', NEW.direction,'user', NEW.user_id,
      'unique_id', (SELECT unique_id FROM users WHERE id = NEW.user_id),
      'gate', NEW.gate_name));
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.create_audit_log_on_pass_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ DECLARE v_role TEXT; BEGIN
  SELECT role INTO v_role FROM users WHERE id = NEW.requested_by_id;
  PERFORM audit_log_entry('GATE_PASS_CREATED', NEW.requested_by_id, NEW.requested_by_name, v_role,
    jsonb_build_object('pass_id', NEW.id,'requester', NEW.requester_name,'roll', NEW.roll,'reason', NEW.reason));
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.create_audit_log_on_pass_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ DECLARE v_approver UUID; v_name TEXT; v_role TEXT; BEGIN
  IF NEW.final_status IS DISTINCT FROM OLD.final_status THEN
    v_approver := COALESCE(NEW.admin_approver_id, NEW.guardian_approver_id);
    SELECT name, role INTO v_name, v_role FROM users WHERE id = v_approver;
    PERFORM audit_log_entry(
      CASE NEW.final_status WHEN 'APPROVED' THEN 'GATE_PASS_APPROVED'
        WHEN 'REJECTED' THEN 'GATE_PASS_REJECTED' ELSE 'GATE_PASS_UPDATED' END,
      v_approver, v_name, v_role,
      jsonb_build_object('pass_id', NEW.id,'old_status', OLD.final_status,'new_status', NEW.final_status));
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.create_audit_log_on_user_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM audit_log_entry('USER_CREATED', NULL, 'System', 'system',
      jsonb_build_object('user_id', NEW.id,'role', NEW.role));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      PERFORM audit_log_entry('ROLE_CHANGED', current_setting('app.current_user_id', true)::uuid, NULL, NULL,
        jsonb_build_object('user_id', NEW.id,'old_role', OLD.role,'new_role', NEW.role));
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      PERFORM audit_log_entry('ACCOUNT_STATUS_CHANGED', current_setting('app.current_user_id', true)::uuid, NULL, NULL,
        jsonb_build_object('user_id', NEW.id,'old_status', OLD.status,'new_status', NEW.status));
    END IF;
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.update_campus_occupancy_on_movement()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ DECLARE v_user UUID; BEGIN
  v_user := NEW.user_id;
  IF v_user IS NOT NULL THEN
    INSERT INTO campus_occupancy (user_id, current_status, last_gate_id, last_log_id, last_updated)
    VALUES (v_user, NEW.direction, NEW.gate_id, NEW.id, NEW.timestamp)
    ON CONFLICT (user_id) DO UPDATE
    SET current_status = EXCLUDED.current_status,
        last_gate_id   = EXCLUDED.last_gate_id,
        last_log_id    = EXCLUDED.last_log_id,
        last_updated   = EXCLUDED.last_updated;
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.update_daily_stats_on_movement()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ DECLARE v_date DATE; v_code TEXT; BEGIN
  -- Day boundary follows the movement's recorded timestamp (UTC day), matching the
  -- analytics routes. A movement after local midnight creates a brand-new (date, gate)
  -- row, so today's counters start from zero automatically.
  v_date := (NEW.timestamp AT TIME ZONE 'Asia/Kolkata')::date;
  SELECT gate_code INTO v_code FROM gates WHERE id = NEW.gate_id;
  IF v_code IS NULL THEN
    v_code := NEW.gate_name;
  END IF;
  INSERT INTO daily_stats (date, gate_id, gate_code, entries, exits, updated_at)
  VALUES (
    v_date,
    NEW.gate_id,
    v_code,
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
END; $function$;

