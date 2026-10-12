-- ============================================================================
-- Migration: 20261012181951_ticket_indexes
-- Purpose: Self-service "My Tickets" backing indexes + rollup view.
--   • Composite index tuned for the requester-scoped queries
--   • v_my_ticket_counts view — KPI strip without a GROUP BY per request
-- Idempotent — safe to replay.
-- ============================================================================
BEGIN;

-- 1. Indexes --------------------------------------------------------------
-- "My Tickets" — requester's own tickets, newest first.
CREATE INDEX IF NOT EXISTS idx_permissions_student_status_created
  ON public.permission_requests (student_user_id, status, created_at DESC);

-- Approval queues — workflow + hostel scope + stage + status.
CREATE INDEX IF NOT EXISTS idx_permissions_workflow_stage_status
  ON public.permission_requests (workflow_type, current_stage, status);

-- SLA triage — pending rows ordered by deadline.
CREATE INDEX IF NOT EXISTS idx_permissions_sla_pending
  ON public.permission_requests (sla_deadline)
  WHERE status = 'PENDING' AND sla_deadline IS NOT NULL;

-- 2. KPI rollup view ------------------------------------------------------
-- Adaptive: at this migration's timestamp the table is permission_requests
-- with student_user_id as the requester column. The later reconciliation
-- migration (20261026000001) renames student_user_id -> requester_user_id
-- and renames the table to permissions; it also creates a backward-compat
-- VIEW permission_requests AS SELECT *, requester_user_id AS student_user_id.
-- So we use student_user_id here — it resolves correctly both before and
-- after the reconciliation.
CREATE OR REPLACE VIEW public.v_my_ticket_counts AS
SELECT
  p.student_user_id                                    AS user_id,
  COUNT(*) FILTER (WHERE p.status = 'PENDING')           AS pending,
  COUNT(*) FILTER (WHERE p.status = 'APPROVED')          AS approved,
  COUNT(*) FILTER (WHERE p.status = 'REJECTED')          AS rejected,
  COUNT(*) FILTER (WHERE p.status = 'COMPLETED')         AS completed,
  COUNT(*) FILTER (WHERE p.status = 'CANCELLED')         AS cancelled,
  COUNT(*)                                               AS total
FROM public.permission_requests p
GROUP BY p.student_user_id;

COMMENT ON VIEW public.v_my_ticket_counts
  IS 'Per-user rollup of ticket states; drives the My Tickets KPI strip '
     'without a GROUP BY on every request.';

-- 3. Self-record (adaptive to both schema_migrations shapes) --------------
DO $$
DECLARE
  has_filename BOOLEAN;
  has_checksum BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='schema_migrations'
                   AND column_name='filename') INTO has_filename;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='schema_migrations'
                   AND column_name='checksum') INTO has_checksum;
  IF has_filename AND has_checksum THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at, checksum)
    VALUES ('20261012181951', '20261012181951_ticket_indexes.sql', NOW(),
            md5('20261012181951_ticket_indexes'))
    ON CONFLICT (version) DO NOTHING;
  ELSIF has_filename THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at)
    VALUES ('20261012181951', '20261012181951_ticket_indexes.sql', NOW())
    ON CONFLICT (version) DO NOTHING;
  ELSE
    INSERT INTO public.schema_migrations (version, applied_at)
    VALUES ('20261012181951', NOW())
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;

COMMIT;
