-- Add BULK_USER_IMPORT to the audit_logs action allowlist so bulk imports are
-- logged. Idempotent. The live constraint is  CHECK (action = ANY (ARRAY[...]))
-- so we splice the new value in right after the ARRAY[ opener (a single,
-- unique anchor). If an IN (...) style def is present instead, anchor on "IN (".
DO $$
DECLARE
  cdef   TEXT;
  newdef TEXT;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO cdef
  FROM pg_constraint
  WHERE conname = 'audit_logs_action_known';

  -- No constraint yet, or value already present: nothing to do.
  IF cdef IS NULL OR cdef LIKE '%BULK_USER_IMPORT%' THEN
    RETURN;
  END IF;

  -- Preferred anchor:  ARRAY['FIRST'::character varying, ...
  newdef := replace(cdef, 'ARRAY[', 'ARRAY[''BULK_USER_IMPORT''::character varying, ');

  -- Fallback anchor: an IN (...) style def.
  IF newdef = cdef THEN
    newdef := replace(cdef, 'IN (', 'IN ( ''BULK_USER_IMPORT'', ');
  END IF;

  IF newdef = cdef THEN
    RAISE NOTICE 'audit_logs_action_known patch: no insert anchor found, leaving constraint unchanged';
    RETURN;
  END IF;

  EXECUTE 'ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_action_known';
  EXECUTE 'ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_known ' || newdef;
END $$;
