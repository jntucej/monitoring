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
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (
  role IN (
    'operator','admin','sysadmin','supervisor','guardian','parent','hod','student',
    'warden','faculty','staff','worker','visitor',
    'caretaker','deputy_warden','hostel_manager','principal','vice_principal','oie','exam_branch',
    'exam_superintendent','mess_incharge'
  )
);

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
INSERT INTO public.schema_migrations (version)
VALUES ('20261112000001')
ON CONFLICT (version) DO NOTHING;

COMMIT;
