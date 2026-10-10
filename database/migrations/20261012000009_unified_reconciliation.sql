-- database/migrations/20261012000009_unified_reconciliation.sql
-- Unified migration to reconcile previously conflicting constraints and functions.

BEGIN;

-- 1. Unify Role Helpers to ensure a single source of truth
CREATE OR REPLACE FUNCTION public.is_super_admin(p_uid uuid)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$ 
BEGIN
  RETURN EXISTS (SELECT 1 FROM users WHERE id = p_uid AND role = 'sysadmin');
END;
$$;

-- 2. Expand CHECK constraints on gate_passes
DO $$
BEGIN
  -- final_status
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'gate_passes_final_status_check') THEN
    ALTER TABLE public.gate_passes DROP CONSTRAINT gate_passes_final_status_check;
  END IF;
  
  ALTER TABLE public.gate_passes ADD CONSTRAINT gate_passes_final_status_check
    CHECK (final_status IN ('PENDING','APPROVED','REJECTED','APPROVED_PARENT','APPROVED_ADMIN','COMPLETED','EXPIRED','CANCELLED'));

  -- guardian_status
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'gate_passes_guardian_status_check') THEN
    ALTER TABLE public.gate_passes DROP CONSTRAINT gate_passes_guardian_status_check;
  END IF;

  ALTER TABLE public.gate_passes ADD CONSTRAINT gate_passes_guardian_status_check
    CHECK (guardian_status IN ('PENDING','APPROVED','REJECTED','APPROVED_PARENT','APPROVED_ADMIN','COMPLETED','EXPIRED','CANCELLED'));

  -- admin_status
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'gate_passes_admin_status_check') THEN
    ALTER TABLE public.gate_passes DROP CONSTRAINT gate_passes_admin_status_check;
  END IF;

  ALTER TABLE public.gate_passes ADD CONSTRAINT gate_passes_admin_status_check
    CHECK (admin_status IN ('PENDING','APPROVED','REJECTED','APPROVED_PARENT','APPROVED_ADMIN','COMPLETED','EXPIRED','CANCELLED'));
END $$;

COMMIT;
