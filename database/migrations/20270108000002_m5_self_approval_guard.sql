-- 20270108000002_m5_self_approval_guard.sql
-- M5: two-human approval. Self-approval of a destructive action is
-- impossible at the database level: a BEFORE UPDATE trigger on
-- operator_actions raises an exception when the decider is the same
-- user who created the request (recorded in payload.requested_by).
-- This is defence in depth — the approve route also refuses in the
-- application layer, but the trigger is the reliable enforcement point.
BEGIN;

CREATE OR REPLACE FUNCTION public.reject_self_approval()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'approved'
     AND NEW.decided_by IS NOT NULL
     AND NEW.payload->>'requested_by' IS NOT NULL
     AND NEW.decided_by = (NEW.payload->>'requested_by')::uuid THEN
    RAISE EXCEPTION 'SELF_APPROVAL_FORBIDDEN: a request cannot be approved by its own creator';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_operator_actions_no_self_approval ON public.operator_actions;
CREATE TRIGGER trg_operator_actions_no_self_approval
  BEFORE UPDATE ON public.operator_actions
  FOR EACH ROW EXECUTE FUNCTION public.reject_self_approval();

COMMIT;
