-- Fix stale home_out description after warden→principal consolidation.
-- The approval_by column was updated in 20261125000001, but the text
-- description still referenced "warden approved pass".
UPDATE public.config_exit_reasons
   SET description = 'Weekend/overnight leave (requires principal-approved pass)',
       updated_at  = NOW()
 WHERE code = 'home_out';
