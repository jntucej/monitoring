-- database/migrations/20261011000036_sustainability_metric_date_unique.sql
-- Deduplicate existing rows, keeping the most recent per date
WITH ranked AS (
  SELECT id, metric_date,
         ROW_NUMBER() OVER (PARTITION BY metric_date ORDER BY updated_at DESC) AS rn
  FROM public.sustainability_metrics
)
DELETE FROM public.sustainability_metrics
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Now enforce uniqueness
ALTER TABLE public.sustainability_metrics
  ADD CONSTRAINT sustainability_metrics_date_unique UNIQUE (metric_date);
