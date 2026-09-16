-- ============================================================================
-- Migration: Device user mappings for H0201 biometric terminal enrollment
-- ============================================================================
-- Field reality:
--   - Enroll fingerprints directly on the physical H0201 terminal.
--   - Device stores an onboard numeric/text user id (e.g. "101") per enrolled fingerprint.
--   - This table maps (device_serial, device_user_id) -> Supabase users.id.
--   - Sync worker resolves device logs to Supabase users, then writes to:
--       1. public.movement_logs (primary: triggers occupancy/daily stats/audit)
--       2. public.attendance_records (mirror: HR sync continuity)
--
-- Schema compatibility notes (verified against this repo's schema.sql):
--   - Identity anchor is public.users.id UUID, NOT public.persons.
--   - No public.devices table exists yet, so device_serial is free-text (no FK yet).
--   - Worker must use the Supabase service-role client to bypass RLS on movement_logs.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.device_user_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_serial text NOT NULL,
  device_user_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_device_serial_user_id UNIQUE (device_serial, device_user_id)
);

CREATE INDEX IF NOT EXISTS idx_device_mappings_lookup
  ON public.device_user_mappings (device_serial, device_user_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_device_mappings_user_id
  ON public.device_user_mappings (user_id);

-- Optional updated_at automation (safe to create even if table already existed)
CREATE OR REPLACE FUNCTION public.update_device_user_mappings_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_device_user_mappings_updated_at
  ON public.device_user_mappings;

CREATE TRIGGER trg_device_user_mappings_updated_at
  BEFORE UPDATE ON public.device_user_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_device_user_mappings_updated_at();
