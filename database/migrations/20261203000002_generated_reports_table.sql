-- Persist admin "generated reports" so the admin/reports page list survives
-- a refresh. Previously these lived in useState only and vanished on every
-- page load, which the UI had to label "session reports (refresh resets)"
-- to be honest about. Now each generated report row is stored here and the
-- page loads the last N on mount.
CREATE TABLE IF NOT EXISTS public.generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  range_label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Daily','Weekly','Monthly')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('auto','manual')),
  csv_body TEXT,
  payload JSONB,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_reports_created ON public.generated_reports (created_at DESC);
