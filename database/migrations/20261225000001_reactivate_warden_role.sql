-- Reactivate the 'warden' role in config_roles_registry.
-- The 20261125000001 migration deactivated it during the
-- warden→principal consolidation, but the campus still operates a
-- hostel-warden workflow and requires a live warden login account.

BEGIN;

UPDATE public.config_roles_registry
   SET is_active = TRUE
 WHERE code = 'warden'
   AND is_active = FALSE;

COMMIT;
