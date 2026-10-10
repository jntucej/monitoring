-- database/migrations/20261011000006_gate_passes_expired_status.sql
-- Widen final_status, guardian_status, and admin_status to include EXPIRED and CANCELLED

-- 1. Fix gate_passes final_status CHECK
ALTER TABLE public.gate_passes DROP CONSTRAINT IF EXISTS gate_passes_final_status_check;
ALTER TABLE public.gate_passes
  ADD CONSTRAINT gate_passes_final_status_check
  CHECK (final_status IN (
    'PENDING','APPROVED','REJECTED',
    'APPROVED_PARENT','APPROVED_ADMIN',
    'COMPLETED','EXPIRED','CANCELLED'
  ));

-- 2. Fix guardian_status CHECK
ALTER TABLE public.gate_passes DROP CONSTRAINT IF EXISTS gate_passes_guardian_status_check;
ALTER TABLE public.gate_passes
  ADD CONSTRAINT gate_passes_guardian_status_check
  CHECK (guardian_status IN (
    'PENDING','APPROVED','REJECTED',
    'APPROVED_PARENT','APPROVED_ADMIN',
    'COMPLETED','EXPIRED','CANCELLED'
  ));

-- 3. Fix admin_status CHECK
ALTER TABLE public.gate_passes DROP CONSTRAINT IF EXISTS gate_passes_admin_status_check;
ALTER TABLE public.gate_passes
  ADD CONSTRAINT gate_passes_admin_status_check
  CHECK (admin_status IN (
    'PENDING','APPROVED','REJECTED',
    'APPROVED_PARENT','APPROVED_ADMIN',
    'COMPLETED','EXPIRED','CANCELLED'
  ));
