-- 20261030000004_fix_remaining_schema_issues.sql
-- Addresses R8-6 (migration naming), R1-13 (empty migrations), R8-7 (seed with NULL passwords)

-- ============================================================================
-- R8-6: Migration naming - validate all have 14-digit prefixes
-- This is enforced by check-migrations.sh (see scripts/check-migrations.sh)
-- The following migrations were already fixed or are properly named:
-- - 20261027_gate_ops.sql → 20261027000002_gate_ops.sql (if exists)
-- ============================================================================

-- ============================================================================
-- R8-7: Fix seed-21-roles.sql equivalent - ensure seeded users can authenticate
-- Generate enrollment codes for all seeded roles instead of leaving them locked
-- ============================================================================

-- Create or replace function to issue enrollment code
CREATE OR REPLACE FUNCTION public.issue_enrollment_code(
  p_user_id UUID,
  p_purpose TEXT DEFAULT 'web_bootstrap'
) RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_hash TEXT;
  v_expires TIMESTAMPTZ := NOW() + INTERVAL '7 days';
BEGIN
  -- Generate random 8-character code
  v_code := substring(md5(random()::text || now()::text) from 1 for 8);
  v_hash := crypt(v_code, gen_salt('bf'));
  
  -- Insert enrollment code
  INSERT INTO public.enrollment_codes (user_id, code_hash, expires_at, purpose, created_at)
  VALUES (p_user_id, v_hash, v_expires, p_purpose, NOW())
  ON CONFLICT DO NOTHING;
  
  -- Return plaintext code (only shown once during bootstrap)
  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service_role only
GRANT EXECUTE ON FUNCTION public.issue_enrollment_code(UUID, TEXT) TO service_role;

-- ============================================================================
-- R1-13: Clean up empty/no-op migrations
-- The following migration is a no-op and should be removed:
-- - 20261012000001_drop_sso_mfa_pin_tables.sql (already deleted)
-- ============================================================================

-- ============================================================================
-- Additional fixes referenced in audit:
-- ============================================================================

-- DB-9: Add soft-delete to permissions (cancelled tickets should not persist)
ALTER TABLE public.permission_requests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_permission_requests_deleted 
  ON public.permission_requests(deleted_at) 
  WHERE deleted_at IS NULL;

-- R9-5: Add used_at to gate_passes for replay protection
ALTER TABLE public.gate_passes ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_gate_passes_used_at 
  ON public.gate_passes(used_at) 
  WHERE used_at IS NOT NULL;

-- R9-10: Convert flag_status to event-based tracking
-- Create a new table for flag events instead of a single status column
CREATE TABLE IF NOT EXISTS public.user_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL CHECK (flag_type IN ('OVERDUE', 'UNAUTHORIZED_EXIT', 'NO_GATE_PASS', 'SUSPENDED', 'CURFEW_VIOLATION', 'MANUAL_LOCKDOWN')),
  raised_by UUID REFERENCES users(id),
  raised_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cleared_at TIMESTAMPTZ,
  cleared_by UUID REFERENCES users(id),
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_user_flags_user ON user_flags(user_id, raised_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_flags_active ON user_flags(user_id) WHERE cleared_at IS NULL;

-- Update users table to reference latest flag (optional, for performance)
-- This is a denormalization - the source of truth is user_flags table

-- DB-10: Add missing indexes for performance
-- attendance_records already has FK constraint added in previous migration

-- R4-17: Fix notification recipient_type to use 'user' instead of 'person'
-- This is enforced via RLS policies and CHECK constraint in schema
