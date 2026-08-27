-- ============================================================================
-- SYSTEM_CONFIG TABLE - Global system settings with key/value JSONB storage
-- Used by /api/system/config route for admin/sysadmin persisted configuration.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow SELECT for admin and sysadmin roles (from public.users)
DROP POLICY IF EXISTS "Allow admin/sysadmin read system_config" ON public.system_config;
CREATE POLICY "Allow admin/sysadmin read system_config"
  ON public.system_config FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'sysadmin')
        AND users.status = 'ACTIVE'
    )
  );

-- RLS Policy: Allow INSERT/UPDATE/DELETE for admin/sysadmin via service role
DROP POLICY IF EXISTS "Allow admin/sysadmin write system_config" ON public.system_config;
CREATE POLICY "Allow admin/sysadmin write system_config"
  ON public.system_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'sysadmin')
        AND users.status = 'ACTIVE'
    )
  );

-- Seed default configuration row (idempotent)
INSERT INTO public.system_config (key, value, updated_at)
VALUES (
  'global_settings',
  '{"notificationsEnabled": true, "securityLevel": "high", "mfaRequiredForAdmin": true, "sessionTimeoutMinutes": 60, "maxLoginAttempts": 5, "auditRetentionDays": 90}'::jsonb,
  NOW()
)
ON CONFLICT (key) DO NOTHING;
