-- Migration 54: Autonomous Campus OS — operational policy seeds + cold-archive
--
-- Seeds the "locked-in operational policies" as editable JSONB so nothing is
-- hardcoded in TypeScript/JSX. All values live in `facilities.config`
-- (category SYSTEM_POLICY) and `workflow_definitions` and are admin-editable
-- from /sysadmin/topology + the catalog layer with zero redeploy.
--
-- Telegram is deliberately NOT in these seeds (per user direction 2026-11-28:
-- "forgot about telegram now"). Tier-1 approvals are web-portal 1-click with a
-- signed single-use action token; Tier-2 stays two-person + StepUpModal.

-- ── 1. Campus telemetry / geofence / retention policy (single JSONB row) ──
INSERT INTO public.facilities (facility_code, name, category, config, is_active)
VALUES (
  'CAMPUS_TELEMETRY_POLICY',
  'JNTUHCEJ Campus Geofence & Retention Policy',
  'SYSTEM_POLICY',
  '{
    "gps_max_accuracy_meters": 30,
    "sampling_moving_seconds": 30,
    "sampling_stationary_seconds": 300,
    "min_displacement_meters": 15,
    "wayfinding_only_roles": ["student","parent","guardian","visitor","faculty","hod","staff"],
    "web_1click_allowed": ["ROUTINE_CIRCULAR","CLASS_RESCHEDULE","PASS_APPROVAL","MESS_REBATE","QA_PROMOTE"],
    "stepup_two_person_required": ["DEBARRED_CHANGE","LOCKDOWN_CONTROL","REGULATION_PUBLISH","THRESHOLD_EDIT","RBAC_EDIT","BREAK_GLASS"],
    "retention_hot_chat_days": 180,
    "retention_hot_audit_days": 365,
    "retention_cold_r2_years": 8
  }'::jsonb,
  TRUE
)
ON CONFLICT (facility_code) DO UPDATE SET config = EXCLUDED.config, is_active = TRUE;

-- ── 2. Role-scoped spatial / telemetry matrix (SYSTEM_POLICY facility) ──
-- Static wayfinding = zero live trails; live telemetry is role + area scoped.
-- (config_roles_registry has no scope column, so the matrix lives here — no schema change.)
INSERT INTO public.facilities (facility_code, name, category, config, is_active)
VALUES (
  'SPATIAL_ROLE_MATRIX',
  'Role-Scoped Spatial & Telemetry Map Matrix',
  'SYSTEM_POLICY',
  '{
    "wayfinding_only_roles": ["student","parent","guardian","visitor","faculty","hod","staff"],
    "live_scopes": [
      {"roles": ["supervisor","operator"], "area": "security", "grants": ["gate_reader_health","scan_pulse","lockdown_boundary"]},
      {"roles": ["hostel_manager","chief_warden","deputy_warden"], "area": "hostel", "grants": ["block_occupancy","curfew_status"]},
      {"roles": ["principal","admin","sysadmin"], "area": "institutional", "grants": ["aggregate_counts","reader_health"]}
    ],
    "aggregate_only_roles": ["vice_principal"],
    "note": "vice_principal is strictly aggregate-only on hostel blocks; live per-block telemetry is denied."
  }'::jsonb,
  TRUE
)
ON CONFLICT (facility_code) DO UPDATE SET config = EXCLUDED.config, is_active = TRUE;

-- ── 3. Hot-to-cold retention run ledger (1-yr hot -> 8-yr cold R2) ──
-- retention_archive_runs was created in migration 52; ensure it idempotently.
CREATE TABLE IF NOT EXISTS public.retention_archive_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name      TEXT NOT NULL,
  cutoff_before   TIMESTAMPTZ NOT NULL,
  rows_archived   INT NOT NULL DEFAULT 0,
  archive_r2_key  TEXT NOT NULL,
  retain_until    TIMESTAMPTZ NOT NULL,
  executed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
