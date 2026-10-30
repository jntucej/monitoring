-- Add user tracking columns to api_metrics
ALTER TABLE public.api_metrics
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS role text;

CREATE INDEX IF NOT EXISTS idx_api_metrics_user_ts
  ON public.api_metrics (user_id, timestamp DESC);
