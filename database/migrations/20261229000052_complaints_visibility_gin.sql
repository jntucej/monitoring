-- database/migrations/20261229000052_complaints_visibility_gin.sql
BEGIN;

CREATE INDEX IF NOT EXISTS idx_complaints_visible_roles
  ON public.complaints USING gin (visible_to_roles);

CREATE INDEX IF NOT EXISTS idx_complaints_visible_departments
  ON public.complaints USING gin (visible_departments);

CREATE INDEX IF NOT EXISTS idx_complaints_visible_hostels
  ON public.complaints USING gin (visible_hostels)
  WHERE visible_hostels IS NOT NULL;

COMMIT;
