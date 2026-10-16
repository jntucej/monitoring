-- Seed a few rows into sustainability_metrics so the admin sustainability
-- panels show non-zero data instead of an empty table. Without this the
-- /api/admin/sustainability GET returns zeros and the two sustainability
-- pages render blank.
--
-- The source is a deterministic derivation from movement_logs: each paperless
-- permission ticket counts as 1 paperless pass. This is a best-effort
-- backfill so the panels are meaningful out of the box; operators can
-- overwrite with real metered values via the admin API.

DO $$
DECLARE
  v_day date;
  v_count int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.sustainability_metrics LIMIT 1) THEN
    FOR v_day IN SELECT d.offset_days FROM generate_series(0, 30, 1) AS d(offset_days) LOOP
      v_count := (
        SELECT COUNT(*)
        FROM public.permission_requests p
        WHERE p.workflow_type = 'exam'
          AND p.status IN ('APPROVED', 'COMPLETED')
          AND p.created_at::date = (CURRENT_DATE - v_day)
      );
      INSERT INTO public.sustainability_metrics (
        metric_date,
        paperless_passes_count,
        carbon_saved_kg
      )
      VALUES (
        CURRENT_DATE - v_day,
        v_count,
        v_count * 0.4
      );
    END LOOP;
  END IF;
END
$$;
