-- Create scan_nonces table for single-use QR token replay protection
CREATE TABLE IF NOT EXISTS public.scan_nonces (
  jti TEXT PRIMARY KEY,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_nonces_expires ON public.scan_nonces(expires_at);
