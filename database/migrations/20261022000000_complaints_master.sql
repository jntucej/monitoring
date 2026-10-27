-- ============================================================================
-- Phase 1 · Migration 0: Complaints core tables, emo role, soft-delete cols, ragging config
-- ============================================================================
BEGIN;

-- ── 1. Add emo role (only new role, per decisions) ────────────────────────
INSERT INTO public.config_roles_registry (code, display_name, is_privileged, is_super)
VALUES ('emo', 'Electrical Maintenance Officer', false, false)
ON CONFLICT (code) DO NOTHING;

-- ── 2. Widen users.role CHECK to include emo ──────────────────────────────
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (
  role IN (
    'operator','admin','sysadmin','supervisor','guardian','parent','hod','student',
    'faculty','staff','worker','visitor',
    'caretaker','deputy_warden','hostel_manager','principal','vice_principal','oie','exam_branch',
    'exam_superintendent','mess_incharge','emo'
  )
);

-- ── 3. Complaint categories ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.complaint_categories (
  code                  TEXT PRIMARY KEY,
  domain                TEXT NOT NULL,
  label                 TEXT NOT NULL,
  description           TEXT,
  owner_role            TEXT NOT NULL,
  sla_hours             INTEGER NOT NULL DEFAULT 48,
  notify_at_pct         INTEGER NOT NULL DEFAULT 75,
  anonymous_allowed     BOOLEAN NOT NULL DEFAULT FALSE,
  is_statutory          BOOLEAN NOT NULL DEFAULT FALSE,
  requires_evidence     BOOLEAN NOT NULL DEFAULT FALSE,
  girls_cell_eligible   BOOLEAN NOT NULL DEFAULT FALSE,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order            INTEGER NOT NULL DEFAULT 100,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_complaint_categories_domain ON public.complaint_categories(domain, sort_order)
  WHERE is_active;

-- ── 4. Complaints core ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.complaints (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_number      TEXT UNIQUE NOT NULL,
  category_code         TEXT NOT NULL REFERENCES public.complaint_categories(code),
  title                 TEXT NOT NULL,
  description           TEXT NOT NULL,
  location              TEXT,
  priority              TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  raised_by             UUID REFERENCES public.users(id) ON DELETE SET NULL,
  is_anonymous          BOOLEAN NOT NULL DEFAULT FALSE,
  on_behalf_of_scope    TEXT,
  on_behalf_of_id       TEXT,
  girls_cell            BOOLEAN NOT NULL DEFAULT FALSE,
  status                TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','acknowledged','assigned','in_progress','resolved',
                      'awaiting_verification','closed','reopened','rejected')),
  current_owner_role    TEXT NOT NULL,
  current_owner_id      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  escalation_level      INTEGER NOT NULL DEFAULT 0,
  sla_deadline          TIMESTAMPTZ,
  visible_to_roles      TEXT[] NOT NULL DEFAULT ARRAY['admin','sysadmin'],
  visible_departments   TEXT[],
  visible_hostels       TEXT[],
  resolution_summary    TEXT,
  resolved_at           TIMESTAMPTZ,
  closed_at             TIMESTAMPTZ,
  reopen_count          INTEGER NOT NULL DEFAULT 0,
  first_read_at         TIMESTAMPTZ,
  read_by_roles         TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  deleted_at            TIMESTAMPTZ,
  deleted_by            UUID REFERENCES public.users(id) ON DELETE SET NULL,
  deleted_reason        TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_complaints_owner ON public.complaints(current_owner_role, status)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_complaints_raised ON public.complaints(raised_by, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_complaints_sla ON public.complaints(sla_deadline)
  WHERE status IN ('submitted','acknowledged','assigned','in_progress') AND deleted_at IS NULL;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
CREATE POLICY complaints_service_all ON public.complaints FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── 5. Complaint tasks ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.complaint_tasks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id   UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  owner_role     TEXT NOT NULL,
  owner_user_id  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action         TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','done','skipped','blocked')),
  notes          TEXT,
  due_at         TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_complaint_tasks_complaint ON public.complaint_tasks(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_tasks_owner ON public.complaint_tasks(owner_role, status);
ALTER TABLE public.complaint_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY complaint_tasks_service_all ON public.complaint_tasks FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── 6. Complaint attachments ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.complaint_attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id  UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  uploaded_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  uploader_role TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type     TEXT NOT NULL,
  size_bytes    BIGINT NOT NULL,
  sha256        TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  storage_kind  TEXT NOT NULL CHECK (storage_kind IN ('volume','tmp')),
  exif_stripped BOOLEAN NOT NULL DEFAULT FALSE,
  is_internal   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_complaint_attachments_complaint ON public.complaint_attachments(complaint_id, created_at);
CREATE INDEX IF NOT EXISTS idx_complaint_attachments_sha ON public.complaint_attachments(sha256);
ALTER TABLE public.complaint_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY complaint_attachments_service_all ON public.complaint_attachments FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── 7. Complaint viewers ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.complaint_viewers (
  complaint_id    UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  viewer_role     TEXT NOT NULL,
  first_viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_viewed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  view_count      INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (complaint_id, user_id)
);
ALTER TABLE public.complaint_viewers ENABLE ROW LEVEL SECURITY;
CREATE POLICY complaint_viewers_service_all ON public.complaint_viewers FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── 8. Complaint calls ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.complaint_calls (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id  UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  caller_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  caller_role   TEXT NOT NULL,
  callee_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  phone_last4   TEXT NOT NULL,
  channel       TEXT NOT NULL DEFAULT 'voice'
    CHECK (channel IN ('voice','whatsapp','sms')),
  duration_secs INTEGER,
  status        TEXT NOT NULL DEFAULT 'initiated'
    CHECK (status IN ('initiated','connected','missed','failed')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_complaint_calls_complaint ON public.complaint_calls(complaint_id, created_at DESC);
ALTER TABLE public.complaint_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY complaint_calls_service_all ON public.complaint_calls FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── 9. Complaint co-signers ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.complaint_co_signers (
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  signed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (complaint_id, user_id)
);

-- ── 10. Complaint feedback ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.complaint_feedback (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id   UUID NOT NULL UNIQUE REFERENCES public.complaints(id) ON DELETE CASCADE,
  rating         SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 11. Complaint escalation chains ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.complaint_escalation_chains (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_code            TEXT NOT NULL REFERENCES public.complaint_categories(code) ON DELETE CASCADE,
  position                 INTEGER NOT NULL,
  role                     TEXT NOT NULL,
  sla_hours                INTEGER NOT NULL,
  auto_escalate_on_breach  BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (category_code, position),
  UNIQUE (category_code, role)
);
CREATE INDEX IF NOT EXISTS idx_complaint_chains_cat ON public.complaint_escalation_chains(category_code, position);

-- ── 12. Complaint SLA rules ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.complaint_sla_rules (
  category                    TEXT PRIMARY KEY,
  initial_sla_hours           INTEGER NOT NULL,
  notify_at_pct               INTEGER NOT NULL DEFAULT 75,
  auto_escalate_at_pct        INTEGER NOT NULL DEFAULT 100,
  auto_escalate_max_tier      INTEGER NOT NULL DEFAULT 3,
  is_active                   BOOLEAN NOT NULL DEFAULT TRUE
);

-- ── 13. Complaint CCTV refs ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.complaint_cctv_refs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id   UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  added_by       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  camera_id      TEXT NOT NULL,
  location       TEXT,
  nvr_host       TEXT,
  clip_start     TIMESTAMPTZ NOT NULL,
  clip_end       TIMESTAMPTZ NOT NULL,
  clip_url       TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.complaint_cctv_refs ENABLE ROW LEVEL SECURITY;
CREATE POLICY complaint_cctv_service_all ON public.complaint_cctv_refs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── 14. Anti-ragging cases ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.anti_ragging_cases (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number      TEXT UNIQUE NOT NULL,
  is_anonymous     BOOLEAN NOT NULL DEFAULT TRUE,
  reporter_hash    TEXT,
  category         TEXT NOT NULL CHECK (category IN ('ragging','harassment','bullying','sexual_harassment','other')),
  severity         TEXT NOT NULL DEFAULT 'high' CHECK (severity IN ('medium','high','critical')),
  narrative        TEXT NOT NULL,
  location         TEXT,
  occurred_at      TIMESTAMPTZ,
  accused_info     TEXT,
  witness_info     TEXT,
  status           TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','under_review','investigating','action_taken','closed','referred')),
  assigned_to      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  committee_notes  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_anti_ragging_status ON public.anti_ragging_cases(status, created_at DESC);
ALTER TABLE public.anti_ragging_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY anti_ragging_service_all ON public.anti_ragging_cases FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── 15. Emergency alerts ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.emergency_alerts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  alert_type       TEXT NOT NULL CHECK (alert_type IN ('medical','fire','safety_threat','electrical_hazard','other')),
  location         TEXT,
  latitude         DOUBLE PRECISION,
  longitude        DOUBLE PRECISION,
  message          TEXT,
  acknowledged_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  acknowledged_at  TIMESTAMPTZ,
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_emergency_open ON public.emergency_alerts(created_at DESC)
  WHERE resolved_at IS NULL;
ALTER TABLE public.emergency_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY emergency_service_all ON public.emergency_alerts FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── 16. Guardian links ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.guardian_links (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id            UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  guardian_name         TEXT NOT NULL,
  guardian_relation     TEXT NOT NULL,
  guardian_phone_encrypted TEXT NOT NULL,
  guardian_phone_last4  TEXT NOT NULL,
  verification_status   TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified','pending','verified','rejected')),
  verification_otp_hash TEXT,
  verification_sent_at  TIMESTAMPTZ,
  verified_by           UUID REFERENCES public.users(id) ON DELETE SET NULL,
  verified_at           TIMESTAMPTZ,
  is_primary            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, guardian_phone_last4)
);
CREATE INDEX IF NOT EXISTS idx_guardian_links_student ON public.guardian_links(student_id);
ALTER TABLE public.guardian_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY guardian_links_service_all ON public.guardian_links FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── 17. Student representatives ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_representatives (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  scope_type    TEXT NOT NULL CHECK (scope_type IN ('class','block','department','mess','hostel','girls')),
  scope_id      TEXT NOT NULL,
  appointed_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  appointed_role TEXT NOT NULL,
  valid_from    DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to      DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','revoked')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, scope_type, scope_id, valid_from)
);
CREATE INDEX IF NOT EXISTS idx_student_reps_active ON public.student_representatives(scope_type, scope_id)
  WHERE status = 'active';
ALTER TABLE public.student_representatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY student_reps_service_all ON public.student_representatives FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── 18. Delegation rules ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.delegation_rules (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL UNIQUE,
  workflow_type         TEXT NOT NULL,
  reason                TEXT,
  max_duration_hours    INTEGER,
  max_distance_km       NUMERIC(8,2),
  local_only            BOOLEAN NOT NULL DEFAULT FALSE,
  delegate_role         TEXT NOT NULL,
  notification_only_role TEXT,
  requires_principal    BOOLEAN NOT NULL DEFAULT FALSE,
  priority              INTEGER NOT NULL DEFAULT 100,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_by            UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.delegation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY delegation_rules_service_all ON public.delegation_rules FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── 19. Meal opt-outs ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meal_opt_outs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  meal_date  DATE NOT NULL,
  meal_type  TEXT NOT NULL CHECK (meal_type IN ('BREAKFAST','LUNCH','DINNER')),
  reason     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, meal_date, meal_type)
);
CREATE INDEX IF NOT EXISTS idx_meal_opt_outs_date ON public.meal_opt_outs(meal_date, meal_type);

-- ── 20. Widen audit_logs.action CHECK to include new complaint actions ─────
DO $$
DECLARE
  cdef TEXT;
  newdef TEXT;
  extra TEXT;
  lit CONSTANT TEXT := '''';
  extra_actions TEXT[] := ARRAY[
    'COMPLAINT_CREATED','COMPLAINT_ACKNOWLEDGED','COMPLAINT_STARTED','COMPLAINT_RESOLVED',
    'COMPLAINT_REJECTED','COMPLAINT_ESCALATED','COMPLAINT_TRANSFERRED','COMPLAINT_AUTO_ESCALATED',
    'COMPLAINT_REOPENED','COMPLAINT_FEEDBACK_RECEIVED','COMPLAINT_SOFT_DELETED','COMPLAINT_RESTORED',
    'COMPLAINT_ATTACHMENTS_ADDED','COMPLAINT_ATTACHMENT_DELETED','COMPLAINT_AUTHORITY_CALL',
    'COMPLAINT_COMMENT_ADDED','COMPLAINT_CCTV_ADDED','COMPLAINT_COSIGNED',
    'ANTI_RAGGING_CASE_FILED','ANTI_RAGGING_CASE_UPDATED','ANTI_RAGGING_CONFIG_UPDATED',
    'SOS_RAISED','SOS_ACKNOWLEDGED','SOS_RESOLVED',
    'GUARDIAN_OTP_SENT','GUARDIAN_VERIFIED','GUARDIAN_REJECTED',
    'STUDENT_REP_APPOINTED','STUDENT_REP_REVOKED',
    'DELEGATION_RULE_CREATED','DELEGATION_RULE_UPDATED','DELEGATION_RULE_DELETED','DELEGATION_RULE_MATCHED',
    'MEAL_OPT_OUT_CREATED','MEAL_OPT_OUT_DELETED',
    'COMPLAINT_SLA_WARNING','COMPLAINT_SLA_BREACHED'
  ];
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO cdef
    FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
   WHERE t.relname = 'audit_logs' AND c.conname = 'audit_logs_action_known' AND c.contype = 'c';
  IF cdef IS NULL THEN RETURN; END IF;
  SELECT string_agg(lit || a || lit || '::character varying', ', ') INTO extra
    FROM unnest(extra_actions) a
   WHERE position(lit || a || lit || '::character varying' IN cdef) = 0;
  IF extra IS NULL THEN RETURN; END IF;
  newdef := replace(cdef, 'ARRAY[', 'ARRAY[' || extra || ',');
  IF newdef = cdef THEN RETURN; END IF;
  EXECUTE 'ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_action_known';
  EXECUTE 'ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_known ' || newdef;
END $$;

-- ── 21. System settings seeds ─────────────────────────────────────────────
INSERT INTO public.system_settings (id, value, updated_at) VALUES
  ('anti_ragging_alert_config',
   '{"enabled":true,"email_roles":["principal","supervisor","admin"],"extra_emails":[],"sms_roles":["principal"]}'::jsonb,
   NOW()),
  ('mess_billing_config',
   '{"cutoff_hour":6,"cutoff_minute":0,"meal_rate_inr":60}'::jsonb,
   NOW())
ON CONFLICT (id) DO NOTHING;

COMMIT;
