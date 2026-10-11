-- database/migrations/20261019000000_employee_details_optional_metadata.sql
-- Allow creating an employee_details row before the HR system assigns an ID.
ALTER TABLE public.employee_details
  ALTER COLUMN employee_id DROP NOT NULL;

-- Keep uniqueness when present, allow multiple NULLs
DROP INDEX IF EXISTS employee_details_employee_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS employee_details_employee_id_key
  ON public.employee_details (employee_id)
  WHERE employee_id IS NOT NULL;
