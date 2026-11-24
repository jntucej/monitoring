-- 20270129000010_mess_eligibility.sql
--
-- Stores the per-(student, mess-day) eligibility DECISION made at finalize
-- time, so the dashboard, the counter verifier, and the student's empty-state
-- all read the SAME stored decision instead of recomputing it. The
-- reason/explanation columns answer "how sure are we the right people got
-- tokens" without re-deriving leave/presence/opt-out at scan time.

CREATE TABLE IF NOT EXISTS public.mess_eligibility (
  user_id        UUID NOT NULL,
  mess_day_id    UUID NOT NULL,
  eligible       BOOLEAN NOT NULL,
  reason         TEXT NOT NULL,
  -- PENDING | HOSTELLER_IN_CAMPUS | HOSTELLER_OUT_CAMPUS_RETURNING |
  -- HOSTELLER_ON_LEAVE | HOSTELLER_OPTED_OUT | DAY_SCHOLAR | NO_PREFERENCE |
  -- SUSPENDED | GRADUATED
  explanation    TEXT,
  decided_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, mess_day_id)
);
CREATE INDEX IF NOT EXISTS idx_mess_eligibility_day ON public.mess_eligibility (mess_day_id);
CREATE INDEX IF NOT EXISTS idx_mess_eligibility_reason ON public.mess_eligibility (mess_day_id, reason);
