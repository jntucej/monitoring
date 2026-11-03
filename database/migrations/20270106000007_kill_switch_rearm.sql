-- Batch J2: dual-control re-arm for automation kill switches.
--
-- Design ("cheap engage, expensive re-enable", cookbook):
--   ENGAGE   — one admin, one reason string, no quorum.
--   RE-ENABLE— two DISTINCT humans, each recording an approval. The
--              re-arm job (worker/jobs/rearm-automation-controls.js)
--              flips auto_* rows back to enabled=TRUE only when both
--              approvers are recorded and they are different users.
--
-- Invariants:
--   - approved_by_1 <> approved_by_2 (a single human cannot approve both)
--   - requested_by may equal one of the approvers (the engager can also
--     co-approve; that is not a quorum violation — the quorum is between
--     the two APPROVALS, not between approver and requester)
--   - completed_at is set by the re-arm job, not by the approvers
--
-- This migration is idempotent and grant-safe: gate_app gets INSERT/SELECT
-- only (the job runs as gate_app); the approver routes call
-- rearm_approve() (SECURITY DEFINER, run by gate_app) which enforces the
-- distinct-user CHECK inside the function.

BEGIN;

CREATE TABLE IF NOT EXISTS public.automation_controls_rearm_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason        TEXT NOT NULL DEFAULT '',
  approved_by_1 UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at_1 TIMESTAMPTZ,
  approved_by_2 UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at_2 TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  completed_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  -- The two approvers must be distinct humans:
  CONSTRAINT rearm_distinct_approvers CHECK (
    approved_by_1 IS NULL OR approved_by_2 IS NULL OR approved_by_1 <> approved_by_2
  )
);

-- An active request is one that has NOT been completed yet.
CREATE INDEX IF NOT EXISTS rearm_requests_active_idx
  ON public.automation_controls_rearm_requests(requested_at)
  WHERE completed_at IS NULL;

-- SECURITY DEFINER function so a sysadmin (who lacks direct UPDATE on
-- gate-owned columns) can record an approval without a grant escalation.
CREATE OR REPLACE FUNCTION public.rearm_approve(
  p_request_id UUID,
  p_approver_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $func$
DECLARE
  v_req record;
BEGIN
  SELECT * INTO v_req FROM automation_controls_rearm_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'rearm request % not found', p_request_id;
  END IF;

  -- Idempotent: approver already recorded in either slot → return unchanged.
  IF v_req.approved_by_1 = p_approver_id OR v_req.approved_by_2 = p_approver_id THEN
    RETURN p_request_id;
  END IF;

  IF v_req.approved_by_1 IS NULL AND v_req.approved_by_2 IS NULL THEN
    UPDATE automation_controls_rearm_requests SET
      approved_by_1 = p_approver_id, approved_at_1 = now()
    WHERE id = p_request_id;
  ELSIF v_req.approved_by_1 IS NOT NULL AND v_req.approved_by_2 IS NULL
        AND v_req.approved_by_1 <> p_approver_id THEN
    UPDATE automation_controls_rearm_requests SET
      approved_by_2 = p_approver_id, approved_at_2 = now()
    WHERE id = p_request_id;
  END IF;

  RETURN p_request_id;
END
$func$;

GRANT EXECUTE ON FUNCTION public.rearm_approve(UUID, UUID) TO gate_app;

-- Gate_app can read the request table and insert new requests; UPDATE is
-- only via rearm_approve() (SECURITY DEFINER).
-- gate_app can read the request table and insert new requests; UPDATE is
-- only via rearm_approve() (SECURITY DEFINER, running as table owner).
GRANT SELECT, INSERT ON public.automation_controls_rearm_requests TO gate_app;

-- Audit: extend the known-action CHECK constraint with REARM_REQUESTED /
-- REARM_APPROVAL / REARM_COMPLETED (idempotent — skips if any is present).
DO $$
DECLARE
  v_def TEXT;
  v_missing TEXT[];
BEGIN
  SELECT pg_get_constraintdef(oid) INTO v_def
  FROM pg_constraint
  WHERE conname = 'audit_logs_action_known'
    AND conrelid = 'public.audit_logs'::regclass;
  IF v_def IS NULL THEN
    RETURN;
  END IF;
  v_missing := ARRAY[]::text[];
  IF v_def NOT LIKE '%REARM_REQUESTED%' THEN
    v_missing := v_missing || ARRAY['REARM_REQUESTED'];
  END IF;
  IF v_def NOT LIKE '%REARM_APPROVAL%' THEN
    v_missing := v_missing || ARRAY['REARM_APPROVAL'];
  END IF;
  IF v_def NOT LIKE '%REARM_COMPLETED%' THEN
    v_missing := v_missing || ARRAY['REARM_COMPLETED'];
  END IF;
  IF array_length(v_missing, 1) IS NULL THEN
    RETURN;
  END IF;
  EXECUTE format(
    'ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_action_known,
     ADD CONSTRAINT audit_logs_action_known CHECK (action IN (%L))',
    (
      SELECT string_agg(quote_literal(trim(vv)), ', ')
      FROM (
        SELECT unnest(string_to_array(
          regexp_replace(regexp_replace(v_def, '^(.*)CHECK \(\w+ IN \(\s*', '', 's'), '\s*\)\s*$', '', 's'),
          ',\s*')) AS vv
      ) AS x WHERE trim(vv) <> ''
    ) || ',' || (
      SELECT string_agg(quote_literal(v), ', ')
      FROM unnest(v_missing) AS v
    )
  );
END
$$;

COMMENT ON TABLE public.automation_controls_rearm_requests IS
  'Batch J2: dual-control re-arm requests for automation kill switches. '
  'Two distinct sysadmin approvals required; the re-arm job completes the '
  'request and flips automation_controls.auto_* rows back to enabled=TRUE.';

COMMIT;
