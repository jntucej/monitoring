-- Migration 51: Zero-Hardcoding Campus OS foundation (Phase 1).
--
-- BRIDGE + EXTEND (never wipe). Per the user's mandate:
--   * org_units / facilities are NEW, populated FROM the live departments /
--     gates / hostel_block sources so /api/gate/scan, /api/org-map and
--     /api/admin/lockdown keep working against their existing tables.
--   * academic_regulations is EXTENDED in place (it already holds R22/R25 in
--     a lean shape) with the versioned-policy columns; no existing row changes.
--   * pgvector is available (verified) -> HNSW index (NOT ivfflat) so vector
--     search is accurate from day one.
--
-- All statements are idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS /
-- ON CONFLICT DO NOTHING). Safe to re-run.

-- ═══════════════════════ 1. DYNAMIC CAMPUS TOPOLOGY ═══════════════════════

-- 1a. Academic organizational units (institutes, faculties, departments).
CREATE TABLE IF NOT EXISTS public.org_units (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(32)  NOT NULL UNIQUE,
  name        VARCHAR(255) NOT NULL,
  unit_type   VARCHAR(64)  NOT NULL DEFAULT 'DEPARTMENT',  -- INSTITUTE|FACULTY|DEPARTMENT|DIVISION
  parent_id   UUID REFERENCES public.org_units(id) ON DELETE CASCADE,
  source_kind VARCHAR(32)  NOT NULL DEFAULT 'native',       -- native|bridged
  source_ref  TEXT,                                          -- original table.pk for bridged rows
  metadata    JSONB      NOT NULL DEFAULT '{}',
  is_active   BOOLEAN    NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_org_units_type ON public.org_units (unit_type);

-- 1b. Physical facilities (campuses, buildings, blocks, gates, rooms).
CREATE TABLE IF NOT EXISTS public.facilities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_code VARCHAR(64) NOT NULL UNIQUE,
  name          VARCHAR(255) NOT NULL,
  category      VARCHAR(64)  NOT NULL,  -- HOSTEL_BLOCK|GATE|LAB|HALL|BUILDING|ROOM
  parent_id     UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
  source_kind   VARCHAR(32)  NOT NULL DEFAULT 'native',
  source_ref    TEXT,
  config        JSONB NOT NULL DEFAULT '{
    "gender_restriction": null,
    "curfew_time": null,
    "requires_digital_pass": true
  }',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_facilities_category ON public.facilities (category);

-- Bridge: org_units <- departments (the live 9-row source). Idempotent upsert.
INSERT INTO public.org_units (code, name, unit_type, source_kind, source_ref, metadata)
SELECT d.code, d.name, 'DEPARTMENT', 'bridged',
       'departments:' || d.id::text,
       jsonb_build_object('numeric_code', d.numeric_code, 'short_name', d.short_name)
FROM public.departments d
ON CONFLICT (code) DO NOTHING;

-- Bridge: facilities <- gates (the live 10-row source).
INSERT INTO public.facilities (facility_code, name, category, source_kind, source_ref, config)
SELECT g.gate_code, g.name, 'GATE', 'bridged',
       'gates:' || g.id::text,
       jsonb_build_object(
         'type', g.type, 'location', g.location, 'audience', g.audience,
         'latitude', g.latitude, 'longitude', g.longitude,
         'allowed_radius_meters', g.allowed_radius_meters,
         'requires_digital_pass', true
       )
FROM public.gates g
ON CONFLICT (facility_code) DO NOTHING;

-- Bridge: facilities <- distinct live hostel blocks (student_details.hostel_block).
INSERT INTO public.facilities (facility_code, name, category, source_kind, source_ref, config)
SELECT 'HOSTEL_' || upper(b.block), b.block, 'HOSTEL_BLOCK', 'bridged',
       'student_details.hostel_block', '{}'::jsonb
FROM (SELECT DISTINCT btrim(hostel_block) AS block
       FROM public.student_details
      WHERE hostel_block IS NOT NULL AND btrim(hostel_block) <> '') b
ON CONFLICT (facility_code) DO NOTHING;

-- 1c. Academic programs (already exists lean; ensure a regulation link exists).
ALTER TABLE public.academic_programs ADD COLUMN IF NOT EXISTS regulation_code TEXT;

-- ═══════════════════════ 2. VERSIONED REGULATIONS ════════════════════════

-- Extend the EXISTING lean academic_regulations with the versioned-policy
-- columns. Existing R22/R25 rows keep working (new cols have safe defaults).
ALTER TABLE public.academic_regulations ADD COLUMN IF NOT EXISTS effective_to_year INT;
ALTER TABLE public.academic_regulations ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE public.academic_regulations ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
ALTER TABLE public.academic_regulations ADD COLUMN IF NOT EXISTS description TEXT;
-- R22/R25 currently store the code in `code`; make the unique constraint safe.
CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_regulations_code_version
  ON public.academic_regulations (code, version);

-- Student cohorts: the immutable binding of an admitted batch to a regulation.
CREATE TABLE IF NOT EXISTS public.student_cohorts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_code             VARCHAR(64) NOT NULL UNIQUE,
  program_code            TEXT REFERENCES public.academic_programs(code),
  regulation_code         TEXT REFERENCES public.academic_regulations(code),
  entry_type              VARCHAR(32) NOT NULL DEFAULT 'REGULAR',
  admission_year          INT NOT NULL,
  expected_graduation_year INT NOT NULL,
  total_degree_credits    INT NOT NULL,
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_student_cohorts_reg ON public.student_cohorts (regulation_code);

-- Dynamic JSONLogic policy rules (one per regulation + category).
CREATE TABLE IF NOT EXISTS public.academic_policy_rules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regulation_code   TEXT NOT NULL REFERENCES public.academic_regulations(code) ON DELETE CASCADE,
  policy_category   VARCHAR(64) NOT NULL,   -- ATTENDANCE|PROMOTION|DETENTION|EXAM_LOCK|FEE
  sub_category      VARCHAR(64) NOT NULL,   -- CONDONATION|YEAR_1_TO_2|FEE_SLAB|...
  rule_expression   JSONB NOT NULL,         -- declarative JSONLogic tree
  rule_metadata     JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (regulation_code, policy_category, sub_category)
);
CREATE INDEX IF NOT EXISTS idx_academic_policy_rules_reg ON public.academic_policy_rules (regulation_code, policy_category);

-- Seed JJR23 as PURE DATA (two entry ladders + the attendance policy tree).
-- Zero regulation logic in TypeScript: the engine reads this JSONB.
INSERT INTO public.academic_regulations (code, program_code, effective_from, is_active, status, version, description)
VALUES ('JJR23', 'BTECH', '2023-07-01', true, 'ACTIVE', 1, 'JNTUH JJR23 regulation (R25-compatible code space)')
ON CONFLICT (code, version) DO NOTHING;

INSERT INTO public.student_cohorts
  (cohort_code, program_code, regulation_code, entry_type, admission_year, expected_graduation_year, total_degree_credits)
VALUES
  ('BTECH_2023_REGULAR', 'BTECH', 'JJR23', 'REGULAR',       2023, 2027, 160),
  ('BTECH_2023_LE',     'BTECH', 'JJR23', 'LATERAL_ENTRY', 2023, 2027, 120)
ON CONFLICT (cohort_code) DO NOTHING;

INSERT INTO public.academic_policy_rules
  (regulation_code, policy_category, sub_category, rule_expression)
VALUES
  ('JJR23', 'ATTENDANCE', 'SEMESTER_EVALUATION', '{"policy":"SEMESTER_ATTENDANCE_EVALUATION","eval_scope":"AGGREGATE","rules":[{"tier":"FULL_ELIGIBILITY","condition":{">=":[{"var":"aggregate_attendance_pct"},75.0]},"action":{"status":"ELIGIBLE","hall_ticket_locked":false,"fee_required":0}},{"tier":"CONDONABLE_WINDOW","condition":{"and":[{">=":[{"var":"aggregate_attendance_pct"},65.0]},{"<":[{"var":"aggregate_attendance_pct"},75.0]},{"in":[{"var":"excuse_category"},["MEDICAL","INSTITUTIONAL_DUTY","SPORTS_NCC_NSS"]]}]},"action":{"status":"CONDONATION_ALLOWED","hall_ticket_locked":true,"unlock_trigger":"FEE_PAID_AND_APPROVED","fee_calculation":{"base_rate":1000,"late_surcharge":500}}},{"tier":"MANDATORY_DETENTION","condition":{"<":[{"var":"aggregate_attendance_pct"},65.0]},"action":{"status":"DETAINED","hall_ticket_locked":true,"allow_condonation":false}}]}'::jsonb),
  ('JJR23', 'PROMOTION', 'YEAR_1_TO_2', '{"entry_type":"REGULAR","min_credits":20,"of_total":40,"lateral":{"min_credits":24,"of_total":40}}'::jsonb)
ON CONFLICT (regulation_code, policy_category, sub_category) DO NOTHING;

-- ═══════════════════════ 3. WORKFLOW + EXAM-ACCESS ══════════════════════

-- workflow_definitions ALREADY EXISTS (states/transitions/transition_roles).
-- Add the spec's approval-chain + form-schema JSONB columns (additive).
ALTER TABLE public.workflow_definitions ADD COLUMN IF NOT EXISTS approval_chain JSONB NOT NULL DEFAULT '[]';
ALTER TABLE public.workflow_definitions ADD COLUMN IF NOT EXISTS form_schema    JSONB NOT NULL DEFAULT '{}';
ALTER TABLE public.workflow_definitions ADD COLUMN IF NOT EXISTS ui_schema      JSONB NOT NULL DEFAULT '{}';

-- Exam-access lock state (drives hall-ticket issuance).
CREATE TABLE IF NOT EXISTS public.student_exam_access_controls (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID NOT NULL,
  regulation_code  TEXT REFERENCES public.academic_regulations(code),
  is_hall_ticket_locked BOOLEAN NOT NULL DEFAULT TRUE,
  lock_reasons     JSONB NOT NULL DEFAULT '[]',
  last_evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, regulation_code)
);
CREATE INDEX IF NOT EXISTS idx_student_exam_access_reg ON public.student_exam_access_controls (regulation_code);

-- ═══════════════════════ 4. OPERATIONAL ANNOUNCEMENT LIFECYCLE ═══════════
-- (The live circulars live in their own tables; this is the lifecycle ledger
--  that auto-cycles UPCOMING->LIVE->COMPLETED->ARCHIVED by publish window.)
CREATE TABLE IF NOT EXISTS public.operational_announcements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           VARCHAR(255) NOT NULL,
  category        VARCHAR(64)  NOT NULL DEFAULT 'CIRCULAR',
  target_criteria JSONB NOT NULL DEFAULT '{"roles": ["ALL"], "regulations": ["ALL"]}',
  publish_window  TSTZRANGE NOT NULL DEFAULT 'empty',
  state           VARCHAR(32) NOT NULL DEFAULT 'UPCOMING',  -- UPCOMING|LIVE|COMPLETED|ARCHIVED
  content_payload JSONB NOT NULL DEFAULT '{}',
  updated_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_opann_state ON public.operational_announcements (state);

CREATE OR REPLACE FUNCTION public.process_announcement_lifecycles() RETURNS void AS $$
BEGIN
  UPDATE public.operational_announcements
     SET state = 'LIVE', updated_at = CURRENT_TIMESTAMP
   WHERE state = 'UPCOMING' AND lower(publish_window) <= CURRENT_TIMESTAMP;

  UPDATE public.operational_announcements
     SET state = 'COMPLETED', updated_at = CURRENT_TIMESTAMP
   WHERE state = 'LIVE' AND upper(publish_window) <= CURRENT_TIMESTAMP;

  UPDATE public.operational_announcements
     SET state = 'ARCHIVED', updated_at = CURRENT_TIMESTAMP
   WHERE state = 'COMPLETED' AND upper(publish_window) < (CURRENT_TIMESTAMP - INTERVAL '30 days');
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════ 5. POLICY-AWARE RAG (pgvector + HNSW) ══════════
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.institutional_knowledge_chunks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_document_id UUID NOT NULL,
  chunk_text    TEXT NOT NULL,
  embedding     vector(1536),
  visibility_roles      TEXT[] NOT NULL DEFAULT '{STUDENT,FACULTY}',
  applicable_regulations TEXT[] NOT NULL DEFAULT '{ALL}',
  valid_from    TIMESTAMPTZ,
  valid_until   TIMESTAMPTZ,
  is_tombstoned BOOLEAN NOT NULL DEFAULT FALSE,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW (not ivfflat): accurate from day one, no re-index on empty table.
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_vector
  ON public.institutional_knowledge_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_filters
  ON public.institutional_knowledge_chunks USING gin (visibility_roles);

-- Metadata-pre-filtered retrieval: RBAC + temporal + regulation scoping.
CREATE OR REPLACE FUNCTION public.query_institutional_knowledge(
  query_embedding vector,
  user_role text,
  user_regulation text,
  similarity_threshold float DEFAULT 0.15,
  match_count int DEFAULT 6
) RETURNS TABLE (id uuid, chunk_text text, similarity float) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.chunk_text, 1 - (c.embedding <=> query_embedding) AS similarity
    FROM public.institutional_knowledge_chunks c
   WHERE c.is_tombstoned = FALSE
     AND (c.valid_from IS NULL OR c.valid_from <= CURRENT_TIMESTAMP)
     AND (c.valid_until IS NULL OR c.valid_until >= CURRENT_TIMESTAMP)
     AND (c.visibility_roles @> ARRAY['ALL']::text[] OR c.visibility_roles @> ARRAY[user_role])
     AND (c.applicable_regulations @> ARRAY['ALL']::text[] OR c.applicable_regulations @> ARRAY[user_regulation])
     AND c.embedding IS NOT NULL
     AND (1 - (c.embedding <=> query_embedding)) > similarity_threshold
   ORDER BY c.embedding <=> query_embedding
   LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════ 6. CLONE & FORK A REGULATION ═══════════════════
CREATE OR REPLACE FUNCTION public.clone_academic_regulation(
  source_regulation_code text,
  new_regulation_code text,
  new_effective_year int
) RETURNS uuid AS $$
DECLARE
  src_reg_id uuid;
  new_reg_id uuid;
BEGIN
  SELECT id INTO src_reg_id FROM public.academic_regulations
   WHERE code = source_regulation_code ORDER BY version DESC LIMIT 1;
  IF src_reg_id IS NULL THEN
    RAISE EXCEPTION 'source regulation % not found', source_regulation_code;
  END IF;

  INSERT INTO public.academic_regulations
    (code, program_code, effective_from, is_active, status, version, description)
  SELECT
    new_regulation_code,
    a.program_code,
    make_date(new_effective_year, 7, 1)::date,
    false,
    'DRAFT',
    COALESCE(MAX(a.version), 1) + 1,
    'Cloned from ' || source_regulation_code
  FROM public.academic_regulations a
  WHERE a.id = src_reg_id
  RETURNING id INTO new_reg_id;

  -- Deep-copy all JSONLogic policy trees to the new regulation.
  INSERT INTO public.academic_policy_rules
    (regulation_code, policy_category, sub_category, rule_expression, rule_metadata)
  SELECT new_regulation_code, p.policy_category, p.sub_category, p.rule_expression, p.rule_metadata
    FROM public.academic_policy_rules p
   WHERE p.regulation_code = source_regulation_code
    ON CONFLICT (regulation_code, policy_category, sub_category) DO NOTHING;

  RETURN new_reg_id;
END;
$$ LANGUAGE plpgsql;
