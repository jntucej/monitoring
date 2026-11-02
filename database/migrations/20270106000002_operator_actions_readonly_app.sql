-- 20270106000002_operator_actions_readonly_app.sql
-- operator_actions is the Tier-3 human-approval control for destructive
-- operations. The blanket gate_app write policy (USING (true)) meant a
-- compromised web pod could INSERT {kind:'drop_table', risk:'low',
-- status:'auto_executed'} and the executor would run it with no human in
-- the loop.
--
-- Fix: gate_app gets read-only on operator_actions. State transitions go
-- through a SECURITY DEFINER function owned by the superuser that only
-- allows forward transitions from legal source states.
BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gate_app') THEN
    RAISE NOTICE 'gate_app missing; skipping';
    RETURN;
  END IF;

  -- Read-only for the app role: sysadmin UI still lists rows; writes go
  -- through the claim function.
  REVOKE INSERT, UPDATE, DELETE ON public.operator_actions FROM gate_app;
  GRANT SELECT ON public.operator_actions TO gate_app;
END $$;

CREATE OR REPLACE FUNCTION public.claim_operator_action(
  p_action_id UUID,
  p_new_status TEXT,
  p_decided_by UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_new_status NOT IN ('approved','rejected','executed','failed','expired','auto_executed') THEN
    RAISE EXCEPTION 'invalid status %', p_new_status;
  END IF;
  UPDATE public.operator_actions
     SET status = p_new_status,
         decided_at = NOW(),
         decided_by = p_decided_by
   WHERE id = p_action_id
     AND (
       (p_new_status IN ('approved','rejected') AND status = 'pending')
       OR
       (p_new_status IN ('executed','failed','expired','auto_executed') AND status IN ('approved','auto_executed'))
     );
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_operator_action(UUID, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_operator_action(UUID, TEXT, UUID) TO gate_app;
COMMIT;
