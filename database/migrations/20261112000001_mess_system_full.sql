-- 20261112000001_mess_system_full.sql
-- Mess Food Preference System — Phase 1 (full role & applicability wiring)
--
--   1. Extend users_role_check to allow 'mess_incharge'
--   2. Register mess_incharge in config_roles_registry
--   3. Backfill missing mess_menu_applicability rows (Sweet/Curd/Papad → BOTH, Paneer → VEG)
--   4. Grant mess_incharge role to the warden user
--   5. Record migration in schema_migrations
--
-- Idempotent: all INSERTs use ON CONFLICT DO NOTHING or NOT EXISTS guards.
BEGIN;

-- 1. Extend users.role CHECK constraint to include mess_incharge
--    Merge into the EXISTING constraint rather than replacing it with a
--    hardcoded list, so roles added by other migrations (exam_superintendent,
--    any future role) are never silently dropped.
DO $$
DECLARE
  cdef   TEXT;
  newdef TEXT;
  lit    CONSTANT TEXT := '''';
  extra  TEXT;
  suffix TEXT;
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO cdef
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
   WHERE t.relname = 'users' AND c.conname = 'users_role_check' AND c.contype = 'c';

  IF cdef IS NULL THEN
    ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (
      role IN (
        'operator','admin','sysadmin','supervisor','guardian','parent','hod','student',
        'warden','faculty','staff','worker','visitor',
        'caretaker','deputy_warden','hostel_manager','principal','vice_principal','oie','exam_branch',
        'exam_superintendent','mess_incharge'
      )
    );
    RETURN;
  END IF;

  -- Already patched (idempotent). Match the BARE quoted value — never the
  -- cast suffix, which Postgres renders differently per version.
  IF position(lit || 'mess_incharge' || lit IN cdef) > 0 THEN
    RETURN;
  END IF;

  -- Reuse the cast suffix of the first existing ARRAY LITERAL so the appended
  -- value matches the rest of the definition. Anchored after ARRAY[ so we
  -- capture the literal's cast, not the column's own (role)::text.
  suffix := substring(
    substring(cdef FROM 'ARRAY\[')
    FROM '''[^'']*''(::[a-zA-Z][a-zA-Z0-9_ ]*)'
  );

  IF suffix IS NULL THEN
    suffix := '';
  END IF;

  extra := lit || 'mess_incharge' || lit || suffix;

  newdef := replace(cdef, 'ARRAY[', 'ARRAY[' || extra || ',');

  IF newdef = cdef THEN
    RAISE EXCEPTION 'users_role_check: could not locate ARRAY[ anchor; refusing to drop known roles';
  END IF;

  EXECUTE 'ALTER TABLE public.users DROP CONSTRAINT users_role_check';
  EXECUTE 'ALTER TABLE public.users ADD CONSTRAINT users_role_check ' || newdef;
END $$;

-- 2. Register mess_incharge in config_roles_registry (idempotent)
INSERT INTO public.config_roles_registry (code, display_name, is_privileged, is_super, is_active)
VALUES ('mess_incharge', 'Mess Incharge', false, false, true)
ON CONFLICT (code) DO NOTHING;

-- 3. Backfill mess_menu_applicability rows seeded without applicability

-- Sweet → BOTH
INSERT INTO public.mess_menu_applicability (menu_item_id, applicable_to)
SELECT id, 'BOTH' FROM public.mess_menu_items WHERE code = 'SWEET'
  AND NOT EXISTS (SELECT 1 FROM public.mess_menu_applicability a
                 WHERE a.menu_item_id = (SELECT id FROM public.mess_menu_items WHERE code='SWEET')
                   AND a.applicable_to='BOTH');

-- Curd → BOTH
INSERT INTO public.mess_menu_applicability (menu_item_id, applicable_to)
SELECT id, 'BOTH' FROM public.mess_menu_items WHERE code = 'CURD'
  AND NOT EXISTS (SELECT 1 FROM public.mess_menu_applicability a
                 WHERE a.menu_item_id = (SELECT id FROM public.mess_menu_items WHERE code='CURD')
                   AND a.applicable_to='BOTH');

-- Papad → BOTH
INSERT INTO public.mess_menu_applicability (menu_item_id, applicable_to)
SELECT id, 'BOTH' FROM public.mess_menu_items WHERE code = 'PAPAD'
  AND NOT EXISTS (SELECT 1 FROM public.mess_menu_applicability a
                 WHERE a.menu_item_id = (SELECT id FROM public.mess_menu_items WHERE code='PAPAD')
                   AND a.applicable_to='BOTH');

-- Paneer → VEG (additional row; PANEER already has NON_VEG)
INSERT INTO public.mess_menu_applicability (menu_item_id, applicable_to)
SELECT id, 'VEG' FROM public.mess_menu_items WHERE code = 'PANEER'
  AND NOT EXISTS (SELECT 1 FROM public.mess_menu_applicability a
                 WHERE a.menu_item_id = (SELECT id FROM public.mess_menu_items WHERE code='PANEER')
                   AND a.applicable_to='VEG');

-- 4. Grant mess_incharge to the warden user as starting point
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'mess_incharge' FROM public.users WHERE role = 'warden'
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Record migration
DO $$
DECLARE
  has_filename BOOLEAN;
  has_checksum BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'schema_migrations' AND column_name = 'filename'
  ) INTO has_filename;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'schema_migrations' AND column_name = 'checksum'
  ) INTO has_checksum;

  IF has_filename AND has_checksum THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at, checksum)
    VALUES ('20261112000001', '20261112000001_mess_system_full.sql', NOW(),
            md5('20261112000001_mess_system_full'))
    ON CONFLICT (version) DO NOTHING;
  ELSIF has_filename THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at)
    VALUES ('20261112000001', '20261112000001_mess_system_full.sql', NOW())
    ON CONFLICT (version) DO NOTHING;
  ELSE
    INSERT INTO public.schema_migrations (version, applied_at)
    VALUES ('20261112000001', NOW())
    ON CONFLICT (version) DO NOTHING;
  END IF;
END
$$;

COMMIT;
