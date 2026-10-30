-- ============================================================================
-- Add checksum column to public.backups for cryptographic integrity verification
-- ============================================================================

ALTER TABLE public.backups ADD COLUMN IF NOT EXISTS checksum TEXT;
