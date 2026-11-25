-- 20270131000005_ops_rules.sql
--
-- Gate / Academic / Mess subsystems — operational rules engine.
--
-- ref_categories (20270131000003) is the taxonomy of *categories*.
-- ops_rules is the versioned store of *operational numbers* — curfew windows,
-- leave thresholds, meal cutoffs, attendance minimums, confirmation-chain
-- definitions, and notification-scope→role grants. The rule: every
-- automation reads ops_rules, never a hard-coded literal. Changing a curfew
-- window from 22:00 to 22:30 = one POST /api/rules, effective on the next
-- write, no deploy.
--
-- Idempotent. Down drops the table only.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ops_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain          text NOT NULL,     -- 'leave_threshold' | 'curfew_window' |
                                     -- 'mess_meal_cutoff' | 'attendance_min_pct' |
                                     -- 'confirmation_chain' | 'notification_scope'
  rule_key        text NOT NULL,
  scope           text,              -- null = global; 'dept:CSE'; 'hostel:block_A'; 'mess'
  value           jsonb NOT NULL,
  effective_from  timestamptz NOT NULL DEFAULT now(),
  effective_to    timestamptz,
  created_by      uuid NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  version         int NOT NULL DEFAULT 1,
  UNIQUE (domain, rule_key, scope, effective_from)
);
CREATE INDEX IF NOT EXISTS idx_ops_rules_lookup
  ON public.ops_rules (domain, rule_key, scope, effective_from DESC);

COMMENT ON TABLE public.ops_rules IS
  'Versioned operational thresholds + chain/scope definitions. Every automation reads this; nothing hard-codes a number. A new effective_from supersedes the prior row for the same (domain, rule_key, scope).';

COMMIT;
