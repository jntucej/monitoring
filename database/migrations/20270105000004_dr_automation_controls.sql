-- Incident Response & DR: kill switches, escalation ladder, status page data.
--
-- The autonomous system must be stoppable by a human, restorable from a
-- verified backup, and operable by a stranger who has never seen the
-- codebase. This migration adds the three tables that make all three true:
--
--   automation_controls   — one row per autonomous job. enabled=FALSE skips
--                           the job entirely (kill switch).
--   escalation_contacts   — the ladder: who gets paged, in what order, on
--                           what channels, and when.
--   status_updates         — SEV-1/SEV-2 incident rows that the /status page
--                           renders. Caddy serves this page even when the web
--                           container is down.

BEGIN;

-- ── Kill switches ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.automation_controls (
  name        TEXT PRIMARY KEY,
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  reason      TEXT,
  disabled_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  disabled_at TIMESTAMPTZ
);

-- One row per autonomous job. Default = enabled. The sysadmin dashboard's
-- red button sets enabled=FALSE + reason + disabled_by + disabled_at, and
-- posts to Telegram. Every autonomous job reads its row before acting.
INSERT INTO public.automation_controls (name, enabled) VALUES
  ('auto_heal_enabled',      TRUE),   -- auto-heal-watchdog.sh / auto-heal-agent.sh
  ('auto_scale_enabled',     TRUE),   -- forecaster -> raise_pool_size / scale_replicas
  ('auto_response_enabled',  TRUE),   -- operator_actions auto-exec (low-risk)
  ('backup_verify_enabled',  TRUE),   -- verify-backup.sh nightly drill
  ('drill_enabled',          TRUE)    -- quarterly restore drill + monthly chaos
ON CONFLICT (name) DO NOTHING;

-- ── Escalation ladder ────────────────────────────────────────────────────
-- The answer to "no one is maintaining it." If the on-call sysadmin is
-- unreachable, this table defines who gets paged next, on which channel,
-- and how long after the incident started.
CREATE TABLE IF NOT EXISTS public.escalation_contacts (
  level           INT NOT NULL,
  role            TEXT NOT NULL,
  user_id         UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notify_at_min   INT NOT NULL,       -- minutes after incident start
  channels        TEXT[] NOT NULL DEFAULT ARRAY['telegram','email'],
  PRIMARY KEY (level)
);

INSERT INTO public.escalation_contacts (level, role, user_id, notify_at_min, channels) VALUES
  (1, 'sysadmin',  NULL, 0,   ARRAY['telegram','email']),
  (2, 'sysadmin',  NULL, 15,  ARRAY['telegram','sms']),
  (3, 'principal', NULL, 60,  ARRAY['telegram','sms','email']),
  (4, 'admin',     NULL, 240, ARRAY['sms','email'])
ON CONFLICT (level) DO NOTHING;

-- ── Status page data ─────────────────────────────────────────────────────
-- SEV-1/SEV-2 incidents write a row here. The /status page (served by
-- Caddy when web is down, or by Next.js when it's up) renders the last
-- 5 rows. This is the page that replaces the sysadmin's phone number.
CREATE TABLE IF NOT EXISTS public.status_updates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  severity     TEXT NOT NULL CHECK (severity IN ('SEV-1','SEV-2','SEV-3','SEV-4','RESOLVED')),
  title        TEXT NOT NULL,
  detail       TEXT,
  resolved_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_status_updates_created_at
  ON public.status_updates (created_at DESC);

COMMIT;

-- RLS + GRANTs
ALTER TABLE public.automation_controls  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_updates       ENABLE ROW LEVEL SECURITY;

CREATE POLICY automation_controls_gate_app   ON public.automation_controls
  FOR ALL TO gate_app USING (true) WITH CHECK (true);
CREATE POLICY escalation_contacts_gate_app   ON public.escalation_contacts
  FOR ALL TO gate_app USING (true) WITH CHECK (true);
CREATE POLICY status_updates_gate_app        ON public.status_updates
  FOR ALL TO gate_app USING (true) WITH CHECK (true);

GRANT SELECT, UPDATE, INSERT ON public.automation_controls  TO gate_app;
GRANT SELECT, UPDATE ON public.escalation_contacts           TO gate_app;
GRANT SELECT, INSERT, UPDATE ON public.status_updates         TO gate_app;

GRANT SELECT ON public.status_updates TO anon, authenticated;
