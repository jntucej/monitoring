-- 20270105000007: fix expire_and_auto_run_operator_actions JSONB return
--
-- The original function (20270105000001) accumulated auto-executed rows into a
-- JSONB[] array and returned it, which Postgres refuses to cast to JSONB.
-- This silently broke the Tier-1 auto-exec path: the worker's 5m maintenance
-- job called the function, it threw, and no auto-actions ever ran.
--
-- Fixed function: builds a single JSONB array (out jsonb := '[]'::jsonb;
-- out := out || jsonb_build_array(...)) and returns it. r.id::text so the
-- UUID is embedded as a string, not a jsonb object.
--
-- Idempotent: CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION public.expire_and_auto_run_operator_actions()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  out jsonb;
BEGIN
  out := '[]'::jsonb;
  UPDATE public.operator_actions
     SET status = 'expired', decided_at = NOW()
   WHERE status = 'pending'
     AND expires_at < NOW();
  FOR r IN
    SELECT id, kind, payload FROM public.operator_actions
     WHERE status = 'pending'
       AND risk = 'low'
       AND auto_run_seconds > 0
       AND created_at + make_interval(secs => auto_run_seconds) < NOW()
     ORDER BY created_at
  LOOP
    UPDATE public.operator_actions
       SET status = 'auto_executed', decided_at = NOW(), source = 'worker'
     WHERE id = r.id;
    out := out || jsonb_build_array(jsonb_build_object(
      'id', r.id::text,
      'kind', r.kind,
      'payload', r.payload
    ));
  END LOOP;
  RETURN out;
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_and_auto_run_operator_actions() TO gate_app;
