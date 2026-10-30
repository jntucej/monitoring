-- Migration: 20270101000004_deactivate_warden_registry
-- Purpose:   Final deactivation of the 'warden' role in config_roles_registry.
--            This migration runs AFTER the consolidation (20261125000001) has
--            already re-assigned any warden users to hostel_manager and
--            redefined is_warden() as a principal shim. It ensures the
--            registry row is now inactive so no new warden roles can be
--            created, while preserving the row for audit purposes.
-- Idempotent.
BEGIN;

UPDATE public.config_roles_registry
   SET is_active = FALSE
 WHERE code = 'warden'
   AND is_active = TRUE;

COMMIT;

-- Record migration in schema_migrations
DO $$
DECLARE
  has_filename BOOLEAN;
  has_checksum BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'schema_migrations'
      AND column_name = 'filename'
  ) INTO has_filename;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'schema_migrations'
      AND column_name = 'checksum'
  ) INTO has_checksum;

  IF has_filename AND has_checksum THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at, checksum)
    VALUES (
      '20270101000004',
      '20270101000004_deactivate_warden_registry.sql',
      NOW(),
      md5('20270101000004_deactivate_warden_registry')
    )
    ON CONFLICT (version) DO NOTHING;
  ELSIF has_filename THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at)
    VALUES (
      '20270101000004',
      '20270101000004_deactivate_warden_registry.sql',
      NOW()
    )
    ON CONFLICT (version) DO NOTHING;
  ELSE
    INSERT INTO public.schema_migrations (version, applied_at)
    VALUES ('20270101000004', NOW())
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;
