-- 20270101000019_provision_missing_reference_tables.sql
-- Production-readiness audit: the principal delegations API
-- (src/app/api/principal/delegations/route.ts) and the supervisor shift
-- surface reference two tables that no migration had created.
--
-- delegation_logs: the delegations route already degrades to audit-only
-- on insert failure ("delegation_logs is not provisioned in this
-- environment yet"); provisioning the table ends that degrade mode.
-- Column set matches the route's SELECT/INSERT statements exactly.
--
-- shifts: the supervisor schedule surface expects named shift slots
-- (gate x start/end x assigned operator) per day. Minimal authoritative
-- shape; the UI's existing data reads fall through gracefully when empty.
--
-- Idempotent: CREATE TABLE IF NOT EXISTS throughout.

DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS public.delegation_logs (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by     UUID NOT NULL,
    delegatee_role TEXT NOT NULL,
    scope          TEXT NOT NULL DEFAULT 'all',
    expires_at     TIMESTAMPTZ NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at     TIMESTAMPTZ
  );
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS public.shifts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_id     UUID NOT NULL,
    shift_date  DATE NOT NULL,
    start_time  TIME NOT NULL,
    end_time    TIME NOT NULL,
    operator_id UUID,
    name        TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (gate_id, shift_date, start_time)
  );
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- RLS (gate_app read set must stay covered — check-gate-app-read-set.sh
-- asserts every RLS-enabled public table has a gate_app SELECT/ALL policy).
ALTER TABLE public.delegation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS delegation_logs_select_staff ON public.delegation_logs;
CREATE POLICY delegation_logs_select_staff ON public.delegation_logs
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS delegation_logs_write_staff ON public.delegation_logs;
CREATE POLICY delegation_logs_write_staff ON public.delegation_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS shifts_select_staff ON public.shifts;
CREATE POLICY shifts_select_staff ON public.shifts
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS shifts_write_staff ON public.shifts;
CREATE POLICY shifts_write_staff ON public.shifts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- gate_app read set (the app connection role runs RLS — these tables carry
-- no role-scoping predicate yet, so plain SELECT USING (true)).
DROP POLICY IF EXISTS delegation_logs_gate_app_select ON public.delegation_logs;
CREATE POLICY delegation_logs_gate_app_select ON public.delegation_logs
  FOR SELECT TO gate_app USING (true);

DROP POLICY IF EXISTS shifts_gate_app_select ON public.shifts;
CREATE POLICY shifts_gate_app_select ON public.shifts
  FOR SELECT TO gate_app USING (true);

-- gate_app write (writes happen through the app connection role).
DROP POLICY IF EXISTS delegation_logs_gate_app_write ON public.delegation_logs;
CREATE POLICY delegation_logs_gate_app_write ON public.delegation_logs
  FOR ALL TO gate_app USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS shifts_gate_app_write ON public.shifts;
CREATE POLICY shifts_gate_app_write ON public.shifts
  FOR ALL TO gate_app USING (true) WITH CHECK (true);
