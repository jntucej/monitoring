BEGIN;
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  key        TEXT PRIMARY KEY,
  count      INTEGER NOT NULL DEFAULT 0,
  reset_at   TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_reset_at ON public.rate_limit_buckets (reset_at);
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.rate_limit_buckets WHERE reset_at < NOW() - INTERVAL '1 hour';
$$;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_limit_buckets TO gate_app;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limits() TO gate_app;
COMMIT;
