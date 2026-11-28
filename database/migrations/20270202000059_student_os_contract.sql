-- Migration 59: student-OS contract backing.
--
-- Adds the two versioned policy domains the catalog-driven student OS reads:
--   1. facilities.config  -> per-role / per-block curfew + mess rebate knobs
--      (chief_warden drafts; sysadmin applies via the sysadmin API, which is
--      the custodian path. No new code in the kernel — the catalog endpoint
--      serializes facilities.config verbatim.)
--   2. form_schemas       -> JSON Schema + UI Schema registry. The student UI
--      renders any form_key from here; adding a field in 2029 is a DB row,
--      not a frontend deploy.
--
-- All four seeded form keys already exist in workflow_definitions (gate_pass,
-- MESS_REBATE_APPLICATION, academic_status, security_incident); this registry
-- holds the RENDERING layer (JSON Schema + UI hints) for them plus the two
-- statutory direct-escalation forms.

BEGIN;

-- ── facilities.config seed (curfew + mess rebate knobs) ───────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.facilities WHERE facility_code = 'HOSTEL_BOYS') THEN
        -- hostels already exist in facilities (HOSTEL_B1..B2, HOSTEL_G1..G2);
        -- seed the role-keyed curfew config on the existing rows instead.
        UPDATE public.facilities SET config = jsonb_build_object(
            'type', 'hostel', 'audience', 'boys',
            'curfew_time', '23:00',
            'pass_grace_minutes', 15
        ) WHERE facility_code IN ('HOSTEL_B1','HOSTEL_B2','HOSTEL') AND is_active;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.facilities WHERE facility_code = 'HOSTEL_GIRLS') THEN
        UPDATE public.facilities SET config = jsonb_build_object(
            'type', 'hostel', 'audience', 'girls',
            'curfew_time', '21:00',
            'pass_grace_minutes', 15
        ) WHERE facility_code IN ('HOSTEL_G1','HOSTEL_G2') AND is_active;
    END IF;
END
$$;

-- ── form_schemas registry ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.form_schemas (
    form_key        TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    description     TEXT,
    json_schema     JSONB NOT NULL DEFAULT '{}'::jsonb,
    ui_schema       JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- which workflow this form drives (matches workflow_definitions.code);
    -- NULL = pure statutory direct-escalation (no workflow, no staging).
    workflow_code   TEXT REFERENCES public.workflow_definitions(code),
    -- true = bypasses class/CR staging (Anti-Ragging, Exam Grievance, ICC).
    bypass_staging  BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    version         INTEGER NOT NULL DEFAULT 1,
    effective_from  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      TEXT,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4 seeded schemas: the 2 workflow-driven forms + 2 statutory direct forms.
-- JSON Schema is minimal-but-real (required + types); UI Schema carries
-- widget hints the HeroUI renderer maps 1:1.
INSERT INTO public.form_schemas (form_key, name, workflow_code, bypass_staging, json_schema, ui_schema, created_by)
VALUES
 ('outing_pass', 'Outing / Home Pass', 'gate_pass', FALSE,
  '{
    "type":"object",
    "required":["purpose","start_date","end_date","destination"],
    "properties":{
      "purpose":{"type":"string","minLength":2,"maxLength":200},
      "destination":{"type":"string","minLength":2,"maxLength":120},
      "start_date":{"type":"string","format":"date"},
      "end_date":{"type":"string","format":"date"},
      "reason_category":{"type":"string","enum":["personal","family","medical","exam","other"]}
    }
  }',
  '{
    "order":["purpose","reason_category","destination","start_date","end_date"],
    "widgets":{"purpose":"textarea","destination":"input","start_date":"input","end_date":"input","reason_category":"select"},
    "help":{"purpose":"State the reason for the pass (visible to the hostel office)."}
  }',
  'sysadmin_seed'),
 ('mess_rebate', 'Hostel Mess Rebate', 'MESS_REBATE_APPLICATION', FALSE,
  '{
    "type":"object",
    "required":["start_date","end_date","reason"],
    "properties":{
      "reason":{"type":"string","minLength":5,"maxLength":400},
      "start_date":{"type":"string","format":"date"},
      "end_date":{"type":"string","format":"date"},
      "min_consecutive_days":{"type":"integer","minimum":3}
    }
  }',
  '{
    "order":["reason","start_date","end_date"],
    "widgets":{"reason":"textarea","start_date":"input","end_date":"input"},
    "help":{"min_consecutive_days":"Rebate applies after 3+ consecutive days of missed meals (per facilities config)."}
  }',
  'sysadmin_seed'),
 ('condonation_appeal', 'Attendance Condonation Appeal', NULL, FALSE,
  '{
    "type":"object",
    "required":["exam_code","reason","medical_certificate"],
    "properties":{
      "exam_code":{"type":"string","minLength":2},
      "reason":{"type":"string","minLength":10,"maxLength":600},
      "medical_certificate":{"type":"string","format":"uri","description":"Upload URL"},
      "supporting_note":{"type":"string","maxLength":300}
    }
  }',
  '{
    "order":["exam_code","reason","medical_certificate","supporting_note"],
    "widgets":{"reason":"textarea","medical_certificate":"file","supporting_note":"textarea"},
    "help":{"medical_certificate":"PDF or image, max 5 MB."}
  }',
  'sysadmin_seed'),
 ('statutory_grievance', 'Direct Statutory Grievance', NULL, TRUE,
  '{
    "type":"object",
    "required":["category","description"],
    "properties":{
      "category":{"type":"string","enum":["anti_ragging","exam_grievance","icc","other_statutory"]},
      "description":{"type":"string","minLength":10,"maxLength":800},
      "prefers_anonymous":{"type":"boolean","default":false}
    }
  }',
  '{
    "order":["category","description","prefers_anonymous"],
    "widgets":{"category":"select","description":"textarea","prefers_anonymous":"switch"},
    "help":{"category":"This channel bypasses class/CR staging and routes directly to the statutory cell."}
  }',
  'sysadmin_seed');

COMMIT;
