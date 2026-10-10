-- database/migrations/20261011000040_audit_recursion_guard.sql
CREATE OR REPLACE FUNCTION public.audit_log_entry(
  p_action text,
  p_user_id uuid,
  p_user_name text,
  p_role text,
  p_details jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Guard against recursion: audit insertion must not trigger more audits
  IF pg_trigger_depth() > 5 THEN
    RAISE WARNING '[audit] Recursion depth exceeded: depth=%, action=%', pg_trigger_depth(), p_action;
    RETURN;
  END IF;

  INSERT INTO public.audit_logs (action, user_id, user_name, user_role, details)
  VALUES (p_action, p_user_id, p_user_name, p_role, p_details);
END;
$function$;
