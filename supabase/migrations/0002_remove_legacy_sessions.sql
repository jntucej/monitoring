-- Remove legacy custom sessions table and legacy authentication columns if present
DROP TABLE IF EXISTS public.sessions CASCADE;

ALTER TABLE public.users 
  DROP COLUMN IF EXISTS password_hash,
  DROP COLUMN IF EXISTS pin_hash;
