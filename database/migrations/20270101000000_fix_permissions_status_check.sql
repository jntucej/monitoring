-- Fix R6-1: Ensure permissions_status_check allows EXPIRED and DISPUTED statuses
DO $$
BEGIN
  ALTER TABLE public.permissions DROP CONSTRAINT IF EXISTS permissions_status_check;
  ALTER TABLE public.permissions ADD CONSTRAINT permissions_status_check
    CHECK (status IN ('PENDING','APPROVED','REJECTED','ESCALATED','COMPLETED','CANCELLED','EXPIRED','DISPUTED'));
EXCEPTION
  WHEN undefined_table THEN
    -- If permissions table doesn't exist yet in this context, ignore
    NULL;
END $$;
