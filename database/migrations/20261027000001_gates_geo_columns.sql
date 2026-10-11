-- Add geo columns to gates table for BACK gate geo-check
ALTER TABLE public.gates
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS allowed_radius_meters INTEGER DEFAULT 200;

-- Seed real coordinates for BACK gate (Jagtial campus)
-- Update with actual Jagtial coordinates when known
UPDATE public.gates
SET latitude = 18.7950,
    longitude = 78.9300,
    allowed_radius_meters = 200
WHERE gate_code = 'BACK';