-- database/migrations/20261011000035_permission_state_machine.sql
CREATE OR REPLACE FUNCTION public.enforce_permission_transitions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_allowed text[];
BEGIN
  -- No change — fine
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- Build the allowed next states from the current state
  CASE OLD.status
    WHEN 'PENDING'   THEN v_allowed := ARRAY['APPROVED', 'REJECTED', 'ESCALATED', 'COMPLETED'];
    WHEN 'ESCALATED' THEN v_allowed := ARRAY['APPROVED', 'REJECTED', 'COMPLETED'];
    WHEN 'APPROVED'  THEN v_allowed := ARRAY['COMPLETED'];
    WHEN 'REJECTED'  THEN v_allowed := ARRAY[]::text[];   -- terminal
    WHEN 'COMPLETED' THEN v_allowed := ARRAY[]::text[];   -- terminal
    ELSE v_allowed := ARRAY[]::text[];
  END CASE;

  IF NOT (NEW.status = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Invalid status transition: % -> %', OLD.status, NEW.status
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_permission_state_machine ON public.permission_requests;
CREATE TRIGGER trg_permission_state_machine
  BEFORE UPDATE OF status ON public.permission_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_permission_transitions();

COMMENT ON FUNCTION public.enforce_permission_transitions IS 'Enforces state machine for permission_requests.status';
