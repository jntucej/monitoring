-- Create scan_nonces table for single-use QR token replay protection
CREATE TABLE IF NOT EXISTS public.scan_nonces (
  jti TEXT PRIMARY KEY,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_nonces_expires ON public.scan_nonces(expires_at);

ALTER TABLE public.scan_nonces ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'scan_nonces' AND policyname = 'svc_all_scan_nonces'
  ) THEN
    CREATE POLICY svc_all_scan_nonces ON public.scan_nonces FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
