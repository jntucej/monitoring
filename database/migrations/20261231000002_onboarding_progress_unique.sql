-- 20261231000002_onboarding_progress_unique.sql
--
-- Idempotency + de-dup for onboarding_progress.
--
-- Problems this closes:
--   * No UNIQUE(user_id, step): markStepCompleted's read-then-write
--     (upsert-style SELECT → INSERT) allowed duplicate rows per step,
--     and a retry after a 5xx produced a second row.
--   * Backfill: every 'demo-user' row is untrusted junk created by the
--     pre-fix routes that accepted a client-supplied x-user-id header;
--     it is dropped so it can never be attributed to a real account.

-- 1. Drop untrusted demo-user rows (they belong to no real account).
DELETE FROM public.onboarding_progress WHERE user_id::text = 'demo-user';

-- 2. De-duplicate real rows: keep the earliest completion per (user_id, step).
DELETE FROM public.onboarding_progress a
 USING public.onboarding_progress b
WHERE a.user_id = b.user_id
  AND a.step = b.step
  AND a.id > b.id;

-- 3. Enforce uniqueness going forward.
ALTER TABLE public.onboarding_progress
  ADD CONSTRAINT onboarding_progress_user_step_unique
  UNIQUE (user_id, step);

-- 4. Complete is monotonic: once a step is completed it stays completed.
--    (markStepCompleted never writes completed = false.)
CREATE OR REPLACE FUNCTION public.onboarding_progress_complete_immutable()
RETURNS trigger AS $$
BEGIN
  IF NEW.completed AND NOT OLD.completed THEN
    RETURN NEW;
  END IF;
  -- completed=true -> completed=false is rejected; no-op updates pass through.
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER onboarding_progress_complete_immutable
AFTER UPDATE ON public.onboarding_progress
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.onboarding_progress_complete_immutable();

COMMENT ON TABLE public.onboarding_progress IS
  'Per-user onboarding step completion. Identity comes ONLY from the '
  'authenticated JWT (auth.userId) — never from client headers.';
