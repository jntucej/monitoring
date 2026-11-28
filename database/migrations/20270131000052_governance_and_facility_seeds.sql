-- Migration 52: Governance & Future Scope + Facility/Workflow Seeds
--
-- Adapted to the lean real schema (code-keyed, no UUID PK on academic_regulations).
-- All new tables are IF NOT EXISTS for idempotency.

-- 1. Two-Person Sign-Off & Mandatory Dry-Run Gate
CREATE TABLE IF NOT EXISTS public.policy_change_requests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_type           TEXT NOT NULL,
  target_ref            TEXT NOT NULL,
  payload_json          JSONB NOT NULL,
  effective_from        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retroactive_override  BOOLEAN NOT NULL DEFAULT FALSE,
  dry_run_summary       JSONB,
  drafted_by            UUID NOT NULL,
  approved_by           UUID,
  status                TEXT NOT NULL DEFAULT 'PENDING_APPROVAL'
                        CHECK (status IN ('DRAFT','PENDING_APPROVAL','PUBLISHED','REJECTED')),
  step_up_verified_at   TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_two_person CHECK (approved_by IS NULL OR approved_by <> drafted_by)
);

-- 2. Audited Cohort Transfer (JNTUH Transitory Regulations — 8-Year Max Window)
CREATE TABLE IF NOT EXISTS public.cohort_transfers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          UUID NOT NULL,
  from_cohort_id      UUID NOT NULL,
  to_cohort_id        UUID NOT NULL,
  credit_mapping_json JSONB NOT NULL DEFAULT '{}',
  max_completion_year INT NOT NULL,
  approved_by         UUID NOT NULL,
  resolution_ref      TEXT NOT NULL,
  transferred_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Hot-to-Cold Retention Policy (1 Year Hot Postgres -> 8 Years Cold R2 Archive)
CREATE TABLE IF NOT EXISTS public.retention_archive_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name      TEXT NOT NULL,
  cutoff_before   TIMESTAMPTZ NOT NULL,
  rows_archived   INT NOT NULL DEFAULT 0,
  archive_r2_key  TEXT NOT NULL,
  retain_until    TIMESTAMPTZ NOT NULL,
  executed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Facility config seeds (zero-hardcoding: null = undocumented, admin-editable)
INSERT INTO public.facilities (facility_code, name, category, config, is_active)
VALUES
  ('HOSTEL_GH1', 'Girls Hostel Block 1', 'HOSTEL_BLOCK',
   '{"gender_restriction":"FEMALE","official_curfew_time":"21:00","campus_roaming_cutoff":"20:00","curfew_exception_approver":"chief_warden","monthly_outing_quota":null,"local_day_outing_mode":"BIOMETRIC_ONLY","policy_source":"Official Hostel Policy"}'::jsonb, TRUE),
  ('HOSTEL_BH1', 'Boys Hostel Block 1', 'HOSTEL_BLOCK',
   '{"gender_restriction":"MALE","official_curfew_time":null,"campus_roaming_cutoff":"22:00","curfew_exception_approver":"chief_warden","monthly_outing_quota":null,"local_day_outing_mode":"BIOMETRIC_ONLY","policy_source":"Pending Campus Circular"}'::jsonb, TRUE)
ON CONFLICT (facility_code) DO UPDATE SET
  config = EXCLUDED.config,
  is_active = TRUE;

-- 5. Workflow definition seeds (adapted to the code-keyed real schema)
INSERT INTO public.workflow_definitions (code, name, is_active, states, approval_chain, form_schema, ui_schema)
VALUES
  ('HOSTEL_OVERNIGHT_PASS', 'Hostel Overnight / Medical Leave Pass', TRUE,
   '{"DRAFT":{"SUBMIT":"PENDING_PARENT_VERIFICATION"},"PENDING_PARENT_VERIFICATION":{"VERIFY_TELEPHONIC":"PENDING_WARDEN_REVIEW","REJECT":"REJECTED"},"PENDING_WARDEN_REVIEW":{"APPROVE":"PENDING_CHIEF_WARDEN","REJECT":"REJECTED"},"PENDING_CHIEF_WARDEN":{"APPROVE":"APPROVED_FOR_GATE","REJECT":"REJECTED"},"APPROVED_FOR_GATE":{"BIOMETRIC_EXIT":"OUTSIDE_CAMPUS"},"OUTSIDE_CAMPUS":{"BIOMETRIC_RETURN":"COMPLETED"}}'::jsonb,
   '[{"step_order":1,"role":"HOSTEL_OFFICE","verification_mode":"TELEPHONIC_PARENT_CLEARANCE","required":true,"timeout_hours":null},{"step_order":2,"role":["DEPUTY_WARDEN","HOSTEL_MANAGER"],"required":true,"timeout_hours":null,"escalation_fallback_role":"CHIEF_WARDEN"},{"step_order":3,"role":"CHIEF_WARDEN","required":true,"timeout_hours":null,"escalation_fallback_role":"VICE_PRINCIPAL"},{"step_order":4,"role":"GATE_OPERATOR","verification_mode":"BIOMETRIC_EXIT","required":true}]'::jsonb,
   '{"type":"object","required":["leave_type","reason","departure_at","expected_return_at","parent_contact"],"properties":{"leave_type":{"type":"string","enum":["HOME_LEAVE","MEDICAL_LEAVE","ACADEMIC_EMERGENCY"],"title":"Leave Type"},"reason":{"type":"string","minLength":5,"title":"Reason"},"departure_at":{"type":"string","format":"date-time","title":"Departure Date & Time"},"expected_return_at":{"type":"string","format":"date-time","title":"Expected Return"},"parent_contact":{"type":"string","title":"Parent/Guardian Phone"}}}'::jsonb,
   '{}'::jsonb),
  ('MESS_REBATE_APPLICATION', 'Hostel Mess Rebate Form', TRUE,
   '{"DRAFT":{"SUBMIT":"PENDING_DEPUTY_WARDEN"},"PENDING_DEPUTY_WARDEN":{"APPROVE":"APPROVED_FOR_BILLING","REJECT":"REJECTED"}}'::jsonb,
   '[{"step_order":1,"role":"DEPUTY_WARDEN","required":true,"must_approve_before_departure":true,"escalation_fallback_role":"CHIEF_WARDEN"}]'::jsonb,
   '{"type":"object","required":["absence_from","absence_to","consecutive_days"],"properties":{"absence_from":{"type":"string","format":"date","title":"Leaving Campus Date"},"absence_to":{"type":"string","format":"date","title":"Returning Campus Date"},"consecutive_days":{"type":"integer","minimum":3,"title":"Consecutive Absent Days (Min 3)"},"advance_cutoff_hours":{"type":["integer","null"],"default":null}}}'::jsonb,
   '{}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  states = EXCLUDED.states,
  approval_chain = EXCLUDED.approval_chain,
  form_schema = EXCLUDED.form_schema,
  is_active = TRUE;
