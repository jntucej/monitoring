-- operator_actions: the single ledger for automation with an approval gate.
--
-- Controlled-autonomy model:
--   TIER 1 (auto-heal, reversible)  — a job detects + acts and records the
--                                       result here with status='executed'
--                                       and risk='low' (it auto-runs unless
--                                       a human rejects within the window).
--   TIER 2 (human approval gate)     — a detect-only job INSERTs a row with
--                                       status='pending'; a sysadmin approves
--                                       or rejects on /sysadmin/actions; the
--                                       executor (scripts/apply-operator-action.sh)
--                                       runs the payload only on 'approved'.
--   TIER 3 (escalation, do nothing)   — the same INSERT, but the payload is a
--                                       runbook pointer; the pg_notify trigger
--                                       below fires the Telegram notification.
--
-- One table = one audit trail for every automated AND human action:
--   SELECT * FROM operator_actions WHERE status IN ('pending','approved')
--       -> what the system wants to do
--   SELECT * FROM operator_actions WHERE status='executed'
--       ORDER BY decided_at DESC
--       -> what was actually done

CREATE TABLE IF NOT EXISTS public.operator_actions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- What kind of action: 'scale_pool', 'rotate_credential', 'drop_table',
  -- 'extend_disk', 'disable_role', 'hard_delete_users', 'restart_container',
  -- 'prune_backups', 'clear_email_queue', 'escalation'
  kind          TEXT NOT NULL,
  -- Human-readable summary shown on the approval card.
  title         TEXT NOT NULL,
  -- The exact command / SQL / API call to run on approval.
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Context / evidence block (current state, thresholds, affected routes).
  evidence      JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Risk tier. 'low' auto-executes after the auto_run_seconds window if no
  -- one rejects; 'high' requires explicit approval.
  risk          TEXT NOT NULL DEFAULT 'high'
                CHECK (risk IN ('low','high')),
  -- State machine.
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','approved','rejected','executed','failed','expired','auto_executed')),
  -- Which role may approve (default sysadmin).
  approver_role TEXT NOT NULL DEFAULT 'sysadmin',
  -- For risk='low': auto-execute after N seconds unless rejected.
  auto_run_seconds INTEGER NOT NULL DEFAULT 0,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at    TIMESTAMPTZ,
  decided_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  decision_note TEXT,
  -- Set when an automated Tier-1 job records its own action (vs a human click).
  source        TEXT NOT NULL DEFAULT 'human'
                CHECK (source IN ('human','worker','job'))
);

-- Fast path for the pending-queue UI.
CREATE INDEX IF NOT EXISTS idx_operator_actions_pending
  ON public.operator_actions (status, created_at) WHERE status = 'pending';

-- RLS posture: gate_app is NOBYPASSRLS-revoked (20261231000014), so the app
-- reads/writes through gate_app and needs an explicit policy. Writes to
-- operator_actions are gated at the application layer (sysadmin role check
-- in the route before the INSERT/UPDATE), so the RLS policy is permissive —
-- matching the announcements_gate_app_write pattern.
ALTER TABLE public.operator_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS operator_actions_gate_app_select ON public.operator_actions;
CREATE POLICY operator_actions_gate_app_select ON public.operator_actions
  FOR SELECT TO gate_app USING (true);

DROP POLICY IF EXISTS operator_actions_gate_app_write ON public.operator_actions;
CREATE POLICY operator_actions_gate_app_write ON public.operator_actions
  FOR ALL TO gate_app USING (true) WITH CHECK (true);

GRANT SELECT ON public.operator_actions TO gate_app;
GRANT INSERT, UPDATE ON public.operator_actions TO gate_app;

-- ── Notification trigger ──────────────────────────────────────────────────
-- Every new pending action fires a NOTIFY so a listener (worker job) can
-- push the Telegram message. The shell scripts stop calling
-- telegram-notify.sh directly; they INSERT here and let the trigger notify.
CREATE OR REPLACE FUNCTION public.notify_pending_operator_action()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_notify(
    'operator_action_pending',
    json_build_object(
      'id', NEW.id,
      'kind', NEW.kind,
      'title', NEW.title,
      'risk', NEW.risk,
      'approver_role', NEW.approver_role
    )::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_pending_operator_action ON public.operator_actions;
CREATE TRIGGER trg_notify_pending_operator_action
  AFTER INSERT ON public.operator_actions
  FOR EACH ROW WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.notify_pending_operator_action();

-- ── Auto-expiry + auto-exec helper (called by the worker scheduler) ───────
-- Marks expired pending rows and auto-executes 'low' risk rows whose
-- auto_run_seconds window has elapsed with no rejection. Returns the rows
-- the caller must actually run (status flipped to 'auto_executed').
-- Returns the JSON array of rows that were just auto-executed so the worker
-- can run their payloads. Returns '[]' when nothing to run. (SETOF RECORD
-- needs a column-definition list at the call site; a JSONB return avoids that.)
CREATE OR REPLACE FUNCTION public.expire_and_auto_run_operator_actions()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  out jsonb;
BEGIN
  out := '[]'::jsonb;
  -- 1. Expire pending rows past their deadline (safe: nothing ran).
  UPDATE public.operator_actions
     SET status = 'expired', decided_at = NOW()
   WHERE status = 'pending'
     AND expires_at < NOW();

  -- 2. Auto-run 'low' risk rows whose window elapsed without a rejection.
  FOR r IN
    SELECT id, kind, payload FROM public.operator_actions
     WHERE status = 'pending'
       AND risk = 'low'
       AND auto_run_seconds > 0
       AND created_at + make_interval(secs => auto_run_seconds) < NOW()
     ORDER BY created_at
  LOOP
    UPDATE public.operator_actions
       SET status = 'auto_executed', decided_at = NOW(), source = 'worker'
     WHERE id = r.id;
    out := out || jsonb_build_array(jsonb_build_object(
      'id', r.id::text,
      'kind', r.kind,
      'payload', r.payload
    ));
  END LOOP;
  RETURN out;
END;
$$;
GRANT EXECUTE ON FUNCTION public.expire_and_auto_run_operator_actions() TO gate_app;
