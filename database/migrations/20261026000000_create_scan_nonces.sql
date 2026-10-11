
-- Create table for QR scan nonces to prevent replay attacks
CREATE TABLE IF NOT EXISTS public.scan_nonces (
  jti TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_nonces_expires ON public.scan_nonces (expires_at);
ALTER TABLE public.scan_nonces ENABLE ROW LEVEL SECURITY;
CREATE POLICY svc_all_scan_nonces ON public.scan_nonces FOR ALL TO service_role USING (true) WITH CHECK (true);
