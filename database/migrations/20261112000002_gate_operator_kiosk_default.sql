-- 20261112000002_gate_operator_kiosk_default.sql
BEGIN;
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_kiosk_default BOOLEAN NOT NULL DEFAULT FALSE;
COMMENT ON COLUMN public.users.is_kiosk_default IS
  'TRUE for the one operator account designated as the gate-kiosk default '
  'session identity. The kiosk endpoint mints a short-lived JWT for this user '
  '(rate-limited, audit-logged). Only one user may hold this flag at a time, '
  'enforced by the application layer.';
-- 2a. Normalise the OPERATOR account fields (do NOT touch pin hash).
UPDATE public.users
   SET login_identifier = 'OPERATOR' WHERE unique_id = 'OPERATOR'
   AND role = 'operator'
   AND (login_identifier IS NULL OR login_identifier = '');
-- 2b. Bind to the Main Campus Gate if no gate is set.
UPDATE public.users u
   SET gate_id = g.id
  FROM public.gates g WHERE u.unique_id = 'OPERATOR'
   AND u.role = 'operator'
   AND u.gate_id IS NULL
   AND g.gate_code = 'MAIN'
   AND g.is_active = TRUE;
-- 2c. Flag it as kiosk default. The initial PIN is NOT set here —
--     an administrator must rotate it via /api/auth/pin-change on first use,
--     or via a one-time script that reads the new PIN from an env var.
UPDATE public.users
   SET is_kiosk_default = TRUE WHERE unique_id = 'OPERATOR'
   AND role = 'operator';
-- 2d. Force a PIN change on next login if a PIN was ever seeded.
UPDATE public.users
   SET pin_must_change = TRUE WHERE unique_id = 'OPERATOR'
   AND role = 'operator'
   AND initial_pin_hash IS NOT NULL
   AND pin_must_change = FALSE;
DO $$DECLARE has_filename BOOLEAN; has_checksum BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='schema_migrations'
      AND column_name='filename') INTO has_filename;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='schema_migrations'
      AND column_name='checksum') INTO has_checksum;
  IF has_filename AND has_checksum THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at, checksum)
    VALUES ('20261112000002', '20261112000002_gate_operator_kiosk_default.sql', NOW(),
            md5('20261112000002_gate_operator_kiosk_default_v2'))
    ON CONFLICT (version) DO NOTHING;
  ELSIF has_filename THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at)
    VALUES ('20261112000002', '20261112000002_gate_operator_kiosk_default.sql', NOW())
    ON CONFLICT (version) DO NOTHING;
  ELSE
    INSERT INTO public.schema_migrations (version, applied_at)
    VALUES ('20261112000002', NOW())
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;
COMMIT;
