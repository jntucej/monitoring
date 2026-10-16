-- ============================================================================
-- Migration: 20261201000000_hostel_hierarchy_and_type_selection
-- Purpose: Add hostel-permission-hierarchy routing columns, student
--          entry-type-selection tracking, approval-password tracking on
--          users, and extend the audit_logs action allowlist with 8 new
--          actions for the new feature.
--
-- Additive-only: every DDL is IF NOT EXISTS / ON CONFLICT DO NOTHING.
-- No existing column, table, view, or exported symbol is renamed, dropped,
-- or altered. The permission_requests view continues to work unchanged.
-- Idempotent: safe to re-run.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1.1 users approval-password columns
-- ----------------------------------------------------------------------------
-- Track per-user approval password (hash + set timestamp), a failure counter
-- for the lockout heuristic, and the lockout expiry. All nullable; the
-- application layer populates them on demand.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS approval_password_hash     TEXT,
  ADD COLUMN IF NOT EXISTS approval_password_set_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_password_failed_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approval_password_locked_until TIMESTAMPTZ;

COMMENT ON COLUMN public.users.approval_password_hash IS 'SHA-256 hash of the user approval password (bcrypt/argon2 in the app layer; raw hash stored here)';
COMMENT ON COLUMN public.users.approval_password_set_at IS 'When the approval password was last set or rotated';
COMMENT ON COLUMN public.users.approval_password_failed_count IS 'Consecutive failed approval-password attempts (reset on success; drives lockout)';
COMMENT ON COLUMN public.users.approval_password_locked_until IS 'If set, approval-password entry is blocked until this timestamp';

-- ----------------------------------------------------------------------------
-- 1.2 student_details type-change tracking
-- ----------------------------------------------------------------------------
-- current_entry_type records the entry type the student chose at the entry
-- gate (hosteller or day_scholar). type_chosen_at records the timestamp of
-- the most recent selection. type_chosen_at_gate identifies the gate UUID
-- where the selection was made.
--
-- Confirmed: gates.id is the UUID PRIMARY KEY of the gates table
-- (see database/schema.sql section 1.1).
ALTER TABLE public.student_details
  ADD COLUMN IF NOT EXISTS current_entry_type    TEXT
    CHECK (current_entry_type IN ('hosteller','day_scholar')),
  ADD COLUMN IF NOT EXISTS type_chosen_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS type_chosen_at_gate   UUID REFERENCES public.gates(id);

COMMENT ON COLUMN public.student_details.current_entry_type IS 'Entry type selected by the student at the entry gate: hosteller or day_scholar';
COMMENT ON COLUMN public.student_details.type_chosen_at IS 'Timestamp of the most recent entry-type selection';
COMMENT ON COLUMN public.student_details.type_chosen_at_gate IS 'Gate UUID where the entry type was last chosen';

-- ----------------------------------------------------------------------------
-- 1.3 permissions routing columns
-- ----------------------------------------------------------------------------
-- routed_to_role: the role this permission request is currently routed to
--                 (for the multi-stage hostel hierarchy workflow).
-- forwarded_from_role: the role that forwarded this request to the next
--                      level in the hierarchy.
-- forward_comment: free-text reason/annotation attached when a lower-level
--                  role forwards to the next level.
-- direct_generated: TRUE when the request was generated directly (not
--                   through the normal multi-stage forwarding chain).
-- stepup_verified_at: timestamp when a step-up approval was confirmed.
-- stepup_verified_by: UUID of the user who confirmed the step-up approval.
--
-- Confirmed: permissions.status already exists with value PENDING
-- (see 20261009000000_permission_workflow_additions.sql).
-- Confirmed: users.id is the UUID PRIMARY KEY (see schema.sql section 1.2).
ALTER TABLE public.permissions
  ADD COLUMN IF NOT EXISTS routed_to_role        TEXT,
  ADD COLUMN IF NOT EXISTS forwarded_from_role   TEXT,
  ADD COLUMN IF NOT EXISTS forward_comment        TEXT,
  ADD COLUMN IF NOT EXISTS direct_generated       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stepup_verified_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stepup_verified_by     UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS pending_hostel_block   TEXT,
  ADD COLUMN IF NOT EXISTS pending_room_number    TEXT,
  ADD COLUMN IF NOT EXISTS pending_warden_id      UUID REFERENCES public.users(id);

COMMENT ON COLUMN public.permissions.routed_to_role IS 'Role this permission request is currently routed to in the hostel hierarchy';
COMMENT ON COLUMN public.permissions.forwarded_from_role IS 'Role that forwarded this request to the next approval level';
COMMENT ON COLUMN public.permissions.forward_comment IS 'Free-text annotation attached when a request is forwarded up the hierarchy';
COMMENT ON COLUMN public.permissions.direct_generated IS 'TRUE when the request was generated directly, bypassing the multi-stage chain';
COMMENT ON COLUMN public.permissions.stepup_verified_at IS 'When a step-up approval was confirmed';
COMMENT ON COLUMN public.permissions.stepup_verified_by IS 'UUID of the user who confirmed the step-up approval';
COMMENT ON COLUMN public.permissions.pending_hostel_block IS 'Option A pre-assignment: hostel block to write to student_details on Home In return (day-scholar home-out); discarded on Day Scholar In';
COMMENT ON COLUMN public.permissions.pending_room_number IS 'Option A pre-assignment: room number to write to student_details on Home In return; discarded on Day Scholar In';
COMMENT ON COLUMN public.permissions.pending_warden_id IS 'Option A pre-assignment: warden (users.id) owning the pre-assigned block/room; enforced as HOSTEL_ROOM_REQUIRED when missing on Home In';

-- ----------------------------------------------------------------------------
-- 1.4 audit_logs_action_known: append 7 new action strings
-- ----------------------------------------------------------------------------
-- Use the splice technique (same as 20261029000000, 20261114000001,
-- 20261116000000) so this migration does not own the constraint. Reads the
-- live constraint definition, checks whether any of the 7 new actions are
-- already present, and splices in only the missing ones after the ARRAY[
-- opener. All 74 canonical actions from 20261027000000 plus every value
-- appended by later migrations are preserved.
--
-- New actions:
--   PERMISSION_FORWARDED_TO_LEVEL   - a lower-level role forwarded a request
--   PERMISSION_DIRECT_GENERATED     - a request was generated directly
--   PERMISSION_STEPUP_VERIFIED      - a step-up approval was confirmed
--   PERMISSION_STEPUP_FAILED        - a step-up approval attempt failed
--   STUDENT_TYPE_CHANGED_AT_ENTRY   - a student changed entry type at a gate
--   APPROVAL_PASSWORD_ROTATED       - a user rotated their approval password
--   APPROVAL_PASSWORD_SET           - a user set their approval password for
--                                     the first time
--   HOSTEL_ROOM_ASSIGNED_ON_HOME_OUT- Option A: a day-scholar Home In return
--                                     wrote the pre-assigned block/room to
--                                     student_details
DO $$
DECLARE
  cdef   TEXT;
  newdef TEXT;
  extra  TEXT;
  lit    CONSTANT TEXT := '''';
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO cdef
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
   WHERE t.relname = 'audit_logs' AND c.conname = 'audit_logs_action_known' AND c.contype = 'c';

  IF cdef IS NULL THEN
    RAISE NOTICE 'audit_logs_action_known: constraint not found, nothing to do';
    RETURN;
  END IF;

  -- Already fully patched: all 8 new actions present.
  IF cdef LIKE '%PERMISSION_FORWARDED_TO_LEVEL%'
     AND cdef LIKE '%PERMISSION_DIRECT_GENERATED%'
     AND cdef LIKE '%PERMISSION_STEPUP_VERIFIED%'
     AND cdef LIKE '%PERMISSION_STEPUP_FAILED%'
     AND cdef LIKE '%STUDENT_TYPE_CHANGED_AT_ENTRY%'
     AND cdef LIKE '%APPROVAL_PASSWORD_ROTATED%'
     AND cdef LIKE '%APPROVAL_PASSWORD_SET%'
     AND cdef LIKE '%HOSTEL_ROOM_ASSIGNED_ON_HOME_OUT%' THEN
    RAISE NOTICE 'audit_logs_action_known: all 8 new actions already present, nothing to do';
    RETURN;
  END IF;

  -- Build the extra string of missing actions.
  WITH candidates AS (
    SELECT v.val AS val
    FROM (VALUES
      ('PERMISSION_FORWARDED_TO_LEVEL'),
      ('PERMISSION_DIRECT_GENERATED'),
      ('PERMISSION_STEPUP_VERIFIED'),
      ('PERMISSION_STEPUP_FAILED'),
      ('STUDENT_TYPE_CHANGED_AT_ENTRY'),
      ('APPROVAL_PASSWORD_ROTATED'),
      ('APPROVAL_PASSWORD_SET'),
      ('HOSTEL_ROOM_ASSIGNED_ON_HOME_OUT')
    ) v(val)
  )
  SELECT string_agg(lit || a.val || lit || '::character varying', ', ' ORDER BY a.val)
    INTO extra
    FROM candidates a
   WHERE position(lit || a.val || lit || '::character varying' IN cdef) = 0;

  IF extra IS NULL THEN
    RAISE NOTICE 'audit_logs_action_known: all new actions already present, nothing to do';
    RETURN;
  END IF;

  -- Splice after the ARRAY[ opener (same as 20261116000000_approver_contract_repair.sql).
  newdef := replace(cdef, 'ARRAY[', 'ARRAY[' || extra || ',');

  IF newdef = cdef THEN
    -- Fallback: the live constraint may use an IN (...) style def.
    newdef := replace(cdef, 'IN (', 'IN (' || extra || ' ');
  END IF;

  IF newdef = cdef THEN
    RAISE NOTICE 'audit_logs_action_known: no insert anchor found, leaving constraint unchanged';
    RETURN;
  END IF;

  EXECUTE 'ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_action_known';
  EXECUTE 'ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_known ' || newdef;
  RAISE NOTICE 'audit_logs_action_known: appended 8 new actions (missing subset: %)', extra;
END
$$;

-- ----------------------------------------------------------------------------
-- 1.5 Indexes for the new routing columns
-- ----------------------------------------------------------------------------
-- Partial index: fast lookup of pending requests by their target role, used
-- by the hierarchy routing engine to find requests awaiting a given role.
CREATE INDEX IF NOT EXISTS idx_permissions_routed_to ON public.permissions (routed_to_role, status) WHERE status = 'PENDING';

-- Partial index: fast lookup of directly-generated requests, used by the
-- application to distinguish direct requests from forwarded ones.
CREATE INDEX IF NOT EXISTS idx_permissions_direct_generated ON public.permissions (direct_generated) WHERE direct_generated;

-- Partial index: fast lookup of students whose current entry type is set,
-- used by the entry-type / day-scholar routing engine to find students
-- currently entered as a specific type without a full table scan.
CREATE INDEX IF NOT EXISTS idx_student_details_entry_type ON public.student_details (current_entry_type) WHERE current_entry_type IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 1.6 Insert the four hostel-hierarchy roles into config_roles_registry
-- ----------------------------------------------------------------------------
-- Mirror the insert shape from 20261011214459_add_exam_superintendent_role.sql
-- (code + display_name). is_active is a column on the table (default true);
-- we set it explicitly to true per the spec. warden is NOT deactivated here
-- (handled by 20261125000001_warden_principal_consolidation.sql).
--
-- Confirmed columns on config_roles_registry (20261010000000_role_registry.sql):
--   code TEXT PRIMARY KEY, display_name TEXT NOT NULL, is_privileged BOOLEAN
--   default false, is_super BOOLEAN default false, is_active BOOLEAN default
--   true, created_at TIMESTAMPTZ default NOW()
INSERT INTO public.config_roles_registry (code, display_name, is_active)
VALUES
  ('deputy_warden',   'Deputy Warden',    TRUE),
  ('hostel_manager',  'Hostel Manager',   TRUE),
  ('caretaker',       'Caretaker',        TRUE),
  ('principal',       'Principal',        TRUE)
ON CONFLICT (code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 1.7 Record migration in schema_migrations
-- ----------------------------------------------------------------------------
-- Use the DO $$ pattern from 20261013000000_campus_retention.sql:
-- checks whether the schema_migrations table has filename + checksum columns,
-- inserts the full row if so, otherwise falls back to version-only.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='schema_migrations') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='schema_migrations' AND column_name='filename')
       AND EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='schema_migrations' AND column_name='checksum') THEN
      INSERT INTO public.schema_migrations (version, filename, applied_at, checksum)
      VALUES ('20261201000000', '20261201000000_hostel_hierarchy_and_type_selection.sql', NOW(), md5('20261201000000_hostel_hierarchy_and_type_selection'))
      ON CONFLICT (version) DO NOTHING;
    ELSE
      INSERT INTO public.schema_migrations (version)
      VALUES ('20261201000000')
      ON CONFLICT (version) DO NOTHING;
    END IF;
  END IF;
END $$;

COMMIT;
