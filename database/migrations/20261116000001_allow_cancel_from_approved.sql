-- Allow principal/admin to revoke (cancel) tickets that were already approved
-- but not yet completed. Without this, the "Revoke" button on APPROVED rows
-- throws "Invalid status transition: APPROVED -> CANCELLED".
-- Replaces the state-machine trigger with a widened version.
CREATE OR REPLACE FUNCTION public.enforce_permission_transitions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_allowed text[];
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  CASE OLD.status
    WHEN 'PENDING'   THEN v_allowed := ARRAY['APPROVED', 'REJECTED', 'ESCALATED', 'COMPLETED', 'CANCELLED'];
    WHEN 'ESCALATED' THEN v_allowed := ARRAY['APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'];
    WHEN 'APPROVED'  THEN v_allowed := ARRAY['COMPLETED', 'CANCELLED'];  -- revoke allowed
    WHEN 'REJECTED'  THEN v_allowed := ARRAY[]::text[];
    WHEN 'COMPLETED' THEN v_allowed := ARRAY[]::text[];
    WHEN 'CANCELLED' THEN v_allowed := ARRAY[]::text[];
    ELSE v_allowed := ARRAY[]::text[];
  END CASE;

  IF NOT (NEW.status = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Invalid status transition: % -> %', OLD.status, NEW.status
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$;
