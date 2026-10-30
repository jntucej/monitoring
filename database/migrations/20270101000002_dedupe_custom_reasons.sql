-- ============================================================================
-- 20270101000002_dedupe_custom_reasons
-- Removes the older hostel_medical / hostel_family rows from custom_reasons.
-- They were seeded by 20261010000001_default_reasons_seed.sql and later
-- replaced by 20261026000001_permission_workflow_reconciliation.sql which
-- added the same labels under the canonical codes medical_emergency and
-- family_emergency. Both rows appeared in the student reason dropdown,
-- showing "Medical Emergency" and "Family Emergency" twice.
-- Idempotent: safe to re-run.
-- ============================================================================

BEGIN;

DELETE FROM public.custom_reasons
WHERE code IN ('hostel_medical', 'hostel_family');

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
      '20270101000002',
      '20270101000002_dedupe_custom_reasons.sql',
      NOW(),
      md5('20270101000002_dedupe_custom_reasons')
    )
    ON CONFLICT (version) DO NOTHING;
  ELSIF has_filename THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at)
    VALUES (
      '20270101000002',
      '20270101000002_dedupe_custom_reasons.sql',
      NOW()
    )
    ON CONFLICT (version) DO NOTHING;
  ELSE
    INSERT INTO public.schema_migrations (version, applied_at)
    VALUES ('20270101000002', NOW())
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;

COMMIT;
