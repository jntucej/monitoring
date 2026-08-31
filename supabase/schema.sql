-- ============================================================================
-- GATE MONITOR SYSTEM - UNIFIED USER MODEL (SINGLE-FILE DATABASE RESET)
-- ============================================================================
-- Model: EVERY person on campus is a single `users` row. Access and identity
-- are derived from role + unique_id. No separate student/parent split.
-- Optional detail layers (student_details / employee_details) are keyed by
-- user_id so student-style info stays indexable without special-casing.
-- Gates are fully data-driven (auto-generated UUIDs, NO fixed 1/2/3 ids).

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SECTION 1: GATES + UNIFIED IDENTITY
-- ============================================================================

-- 1.1 GATES (data-driven; id is a generated UUID, gate_code is the stable label)
CREATE TABLE IF NOT EXISTS gates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_code  TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  location   TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'main',
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- 1.2 USERS (single unified identity; 1:1 with auth.users.id)
--     role = access level. unique_id = fixed human-facing identifier
--     (roll number for students, employee id for staff, phone/email otherwise).
CREATE TABLE IF NOT EXISTS users (
  id                   UUID PRIMARY KEY,
  unique_id            VARCHAR(50) UNIQUE NOT NULL,
  handle               TEXT UNIQUE,
  name                 TEXT NOT NULL,
  role                 TEXT NOT NULL
                       CHECK (role IN ('operator','admin','sysadmin',
                                       'guardian','student','warden','faculty',
                                       'staff','worker','visitor')),
  email                TEXT UNIQUE NOT NULL,
  phone                TEXT,
  department_id        TEXT,
  photo_url            TEXT,
  qr_code              TEXT,
  thumbprint_hash      TEXT,
  thumbprint_verified_at TIMESTAMPTZ,
  gate_id              UUID REFERENCES gates(id) ON DELETE SET NULL,
  supervised_gates     UUID[],
  assigned_hostel      TEXT,
  can_view_gender      TEXT[],
  status               TEXT NOT NULL DEFAULT 'ACTIVE'
                       CHECK (status IN ('ACTIVE','LOCKED','SUSPENDED','DISABLED','DEPROVISIONED')),
  auth_provider        TEXT NOT NULL DEFAULT 'email',
  login_identifier     TEXT UNIQUE,
  pin_hash             TEXT,
  initial_pin_hash     TEXT,
  flag_status          TEXT CHECK (flag_status IN ('OVERDUE', 'UNAUTHORIZED_EXIT', 'NO_GATE_PASS', 'SUSPENDED', 'CURFEW_VIOLATION', 'MANUAL_LOCKDOWN')),
  last_password_change TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ
);
ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_auth;
-- 1.3 STUDENT DETAILS (optional layer for anyone who is a student;
--     keyed by user_id so it stays indexable, NOT a separate identity)
CREATE TABLE IF NOT EXISTS student_details (
  user_id            UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  roll               VARCHAR(20) UNIQUE NOT NULL,
  year               INTEGER,
  section            VARCHAR(5),
  batch              VARCHAR(10),
  guardian_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  student_type       VARCHAR(5) CHECK (student_type IN ('HM','HF','DM','DF')),
  gender             VARCHAR(10) CHECK (gender IN ('male','female')),
  hostel_block       VARCHAR(10),
  room_number        VARCHAR(10),
  hostel_curfew_time VARCHAR(10) DEFAULT '21:00',
  warden_id          UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 1.4 EMPLOYEE DETAILS (optional layer for faculty/staff/worker; keyed by user_id)
CREATE TABLE IF NOT EXISTS employee_details (
  user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  employee_id   VARCHAR(20) UNIQUE NOT NULL,
  designation   VARCHAR(100),
  joining_date  DATE,
  is_hod        BOOLEAN DEFAULT FALSE,
  department_id VARCHAR(20)
);
-- ============================================================================
-- SECTION 2: OPERATIONAL TABLES (keyed by user_id)
-- ============================================================================

-- 2.1 MOVEMENT LOGS (every scan; every user's own in/out; drives auto toggle)
CREATE TABLE IF NOT EXISTS movement_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  direction        TEXT NOT NULL CHECK (direction IN ('IN','OUT')),
  reason           TEXT CHECK (reason IN ('Home Out','Day Out','Leave','Regular','Outing','Emergency')),
  gate_id          UUID NOT NULL REFERENCES gates(id) ON DELETE CASCADE,
  gate_name        TEXT NOT NULL,
  operator_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  operator_name    TEXT,
  timestamp        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_manual        BOOLEAN NOT NULL DEFAULT FALSE,
  is_correction    BOOLEAN NOT NULL DEFAULT FALSE,
  original_log_id  UUID REFERENCES movement_logs(id) ON DELETE SET NULL,
  correction_reason TEXT
);

-- 2.2 CAMPUS OCCUPANCY (current IN/OUT per user)
CREATE TABLE IF NOT EXISTS campus_occupancy (
  user_id        UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_status TEXT NOT NULL CHECK (current_status IN ('IN','OUT')),
  last_gate_id   UUID REFERENCES gates(id) ON DELETE SET NULL,
  last_log_id    UUID REFERENCES movement_logs(id) ON DELETE SET NULL,
  last_updated   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.3 DAILY GATE STATS (one row per date + gate; rolls to a fresh row at midnight
--     so counters naturally reset to 0 each new day, while historical days persist)
CREATE TABLE IF NOT EXISTS daily_stats (
  date           DATE NOT NULL,
  gate_id        UUID NOT NULL REFERENCES gates(id) ON DELETE CASCADE,
  gate_code      TEXT,
  entries        BIGINT NOT NULL DEFAULT 0,
  exits          BIGINT NOT NULL DEFAULT 0,
  peak_hour      INTEGER,
  peak_count     INTEGER,
  on_campus_last INTEGER,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (date, gate_id)
);

-- 2.3 VISITOR LOGS (visitor users' check-in/out; keyed by user_id)
CREATE TABLE IF NOT EXISTS visitor_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  check_in_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_out_at TIMESTAMPTZ,
  host_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  purpose      VARCHAR(200),
  status       VARCHAR(20) NOT NULL DEFAULT 'active'
               CHECK (status IN ('active','completed'))
);

-- 2.4 EXIT PASSES (exit requests/approvals; the person requesting is the user)
CREATE TABLE IF NOT EXISTS gate_passes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  roll                TEXT NOT NULL,
  requester_name      TEXT NOT NULL,
  department          TEXT,
  reason              TEXT NOT NULL CHECK (reason IN ('Home Out','Day Out','Leave','Regular','Outing','Emergency')),
  from_datetime       TIMESTAMPTZ NOT NULL,
  to_datetime         TIMESTAMPTZ NOT NULL,
  description         TEXT,
  requested_by_id     UUID REFERENCES users(id),
  requested_by_name   TEXT,
  requested_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  guardian_status     TEXT NOT NULL DEFAULT 'PENDING'
                      CHECK (guardian_status IN ('PENDING','APPROVED','REJECTED','APPROVED_PARENT','APPROVED_ADMIN','COMPLETED')),
  admin_status        TEXT NOT NULL DEFAULT 'PENDING'
                      CHECK (admin_status IN ('PENDING','APPROVED','REJECTED','APPROVED_PARENT','APPROVED_ADMIN','COMPLETED')),
  final_status        TEXT NOT NULL DEFAULT 'PENDING'
                      CHECK (final_status IN ('PENDING','APPROVED','REJECTED','APPROVED_PARENT','APPROVED_ADMIN','COMPLETED')),
  guardian_comment    TEXT,
  admin_comment       TEXT,
  guardian_approver_id UUID REFERENCES users(id),
  admin_approver_id   UUID REFERENCES users(id),
  qr_code             TEXT NOT NULL
);

-- 2.5 ALERTS (security/safety events)
CREATE TABLE IF NOT EXISTS alerts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity     TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  title        TEXT NOT NULL,
  message      TEXT NOT NULL,
  gate_id      UUID REFERENCES gates(id) ON DELETE SET NULL,
  user_unique_id TEXT,
  timestamp    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved     BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at  TIMESTAMPTZ,
  resolved_by  UUID REFERENCES users(id)
);
-- ============================================================================
-- SECTION 3: PLATFORM TABLES
-- ============================================================================

-- 3.1 NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id             TEXT PRIMARY KEY,
  type           TEXT NOT NULL,
  priority       TEXT NOT NULL CHECK (priority IN ('low','medium','high','critical')),
  title          TEXT NOT NULL,
  message        TEXT NOT NULL,
  recipient_id   TEXT NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('user','role','department','all')),
  channels       TEXT[] NOT NULL DEFAULT ARRAY['in_app'],
  data           JSONB,
  read           BOOLEAN NOT NULL DEFAULT FALSE,
  delivered_at   TIMESTAMPTZ,
  read_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id     TEXT PRIMARY KEY,
  channels    JSONB NOT NULL DEFAULT '{"push": true, "sms": true, "email": true, "in_app": true}',
  types       JSONB NOT NULL DEFAULT '{}',
  quiet_hours JSONB,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS notification_push_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id TEXT REFERENCES notifications(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL,
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  data            JSONB,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  attempts        INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS notification_sms_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id TEXT REFERENCES notifications(id) ON DELETE CASCADE,
  phone_number    TEXT NOT NULL,
  message         TEXT NOT NULL,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  attempts        INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS notification_email_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id TEXT REFERENCES notifications(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  subject         TEXT NOT NULL,
  body            TEXT NOT NULL,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  attempts        INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.2 AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action     VARCHAR(50) NOT NULL,
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name  VARCHAR(100),
  user_role  VARCHAR(50),
  details    JSONB DEFAULT '{}'::jsonb,
  ip_address VARCHAR(45),
  user_agent TEXT,
  timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.3 API METRICS
CREATE TABLE IF NOT EXISTS api_metrics (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path          VARCHAR(255) NOT NULL,
  method        VARCHAR(10) NOT NULL,
  status_code   INTEGER NOT NULL,
  response_time INTEGER NOT NULL,
  error         TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.4 SYSTEM ALERTS
CREATE TABLE IF NOT EXISTS system_alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity    VARCHAR(20) NOT NULL CHECK (severity IN ('info','warning','critical')),
  message     TEXT NOT NULL,
  details     JSONB DEFAULT '{}'::jsonb,
  resolved    BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.5 BACKUPS
CREATE TABLE IF NOT EXISTS backups (
  id           VARCHAR(100) PRIMARY KEY,
  filename     VARCHAR(255) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  size         BIGINT NOT NULL,
  table_count  INTEGER NOT NULL,
  record_count INTEGER NOT NULL,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status       VARCHAR(20) NOT NULL CHECK (status IN ('pending','completed','failed')),
  error        TEXT
);

-- 3.6 WEBAUTHN, ALERT RULES, SECURITY, TICKETS, PREDICTIONS & GATE RULES
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id TEXT UNIQUE NOT NULL,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  transports TEXT[] DEFAULT '{}',
  device_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS alert_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  metric TEXT NOT NULL,
  threshold DOUBLE PRECISION NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 5,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('critical', 'warning', 'info', 'low', 'medium', 'high')),
  channel TEXT NOT NULL DEFAULT 'opsgenie',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sso_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  provider_id TEXT NOT NULL DEFAULT 'google',
  enabled BOOLEAN NOT NULL DEFAULT true,
  client_id TEXT NOT NULL,
  issuer_url TEXT NOT NULL,
  group_mappings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  ticket_number TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'system_issue',
  priority TEXT NOT NULL DEFAULT 'medium',
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to TEXT,
  assigned_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_ticket_comments (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  comment TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gate_access_rules (
  id TEXT PRIMARY KEY,
  gate_id TEXT NOT NULL DEFAULT 'ALL',
  rule_name TEXT NOT NULL,
  days_of_week JSONB NOT NULL DEFAULT '[0,1,2,3,4,5,6]'::jsonb,
  start_time TEXT NOT NULL DEFAULT '06:00',
  end_time TEXT NOT NULL DEFAULT '22:00',
  action TEXT NOT NULL DEFAULT 'allow',
  priority INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  override_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  target VARCHAR(100) NOT NULL,
  predicted_value DOUBLE PRECISION NOT NULL,
  confidence_interval_low DOUBLE PRECISION NOT NULL,
  confidence_interval_high DOUBLE PRECISION NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  model_version VARCHAR(20) DEFAULT 'v1.0-arima',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS zones (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 500,
  gate_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- ============================================================================
-- SECTION 4: FUNCTIONS (all SECURITY DEFINER with locked search_path)
-- ============================================================================

-- 4.1 ROLE HELPERS (avoid RLS recursion)
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ DECLARE r TEXT; BEGIN
  SELECT role INTO r FROM users WHERE id = user_id;
  RETURN r IN ('admin','sysadmin');
EXCEPTION WHEN OTHERS THEN RETURN FALSE; END; $$;

CREATE OR REPLACE FUNCTION is_sysadmin(user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ DECLARE r TEXT; BEGIN
  SELECT role INTO r FROM users WHERE id = user_id; RETURN r = 'sysadmin';
EXCEPTION WHEN OTHERS THEN RETURN FALSE; END; $$;

CREATE OR REPLACE FUNCTION is_warden(user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ DECLARE r TEXT; BEGIN
  SELECT role INTO r FROM users WHERE id = user_id; RETURN r = 'warden';
EXCEPTION WHEN OTHERS THEN RETURN FALSE; END; $$;

CREATE OR REPLACE FUNCTION is_operator(user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ DECLARE r TEXT; BEGIN
  SELECT role INTO r FROM users WHERE id = user_id; RETURN r = 'operator';
EXCEPTION WHEN OTHERS THEN RETURN FALSE; END; $$;



-- 4.2 SCOPE HELPERS
CREATE OR REPLACE FUNCTION get_guardian_wards(p_guardian_id UUID)
RETURNS UUID[] LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT COALESCE(array_agg(sd.user_id), ARRAY[]::UUID[]) FROM student_details sd WHERE sd.guardian_id = p_guardian_id; $$;

CREATE OR REPLACE FUNCTION get_warden_hostel(p_user_id UUID)
RETURNS TEXT LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT assigned_hostel FROM users WHERE id = p_user_id; $$;

CREATE OR REPLACE FUNCTION get_supervised_gates(p_user_id UUID)
RETURNS UUID[] LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT COALESCE(supervised_gates, ARRAY[]::UUID[]) FROM users WHERE id = p_user_id; $$;

CREATE OR REPLACE FUNCTION get_user_department(p_user_id UUID)
RETURNS TEXT LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT department_id FROM users WHERE id = p_user_id; $$;

-- 4.3 AUTH UTILITIES
CREATE OR REPLACE FUNCTION resolve_login_identifier(p_login_id TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN RETURN (SELECT email FROM users WHERE login_identifier = p_login_id);
EXCEPTION WHEN NO_DATA_FOUND THEN RETURN NULL; END; $$;

CREATE OR REPLACE FUNCTION can_user_authenticate(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN RETURN FALSE; END IF;
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND status = 'ACTIVE') THEN RETURN FALSE; END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN RETURN FALSE; END IF;
  RETURN TRUE;
END; $$;

CREATE OR REPLACE FUNCTION invalidate_all_user_sessions(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.users 
  SET handle = NULL, updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION process_gate_scan(
  p_scan_id UUID,
  p_user_id UUID,
  p_direction VARCHAR,
  p_reason VARCHAR,
  p_gate_id UUID,
  p_gate_name VARCHAR,
  p_operator_id UUID,
  p_operator_name VARCHAR,
  p_timestamp TIMESTAMPTZ,
  p_is_manual BOOLEAN,
  p_dup_window_minutes INT DEFAULT 5
)
RETURNS TABLE (
  inserted_log JSONB,
  is_duplicate BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recent_id UUID;
  v_log JSONB;
BEGIN
  SELECT id INTO v_recent_id
  FROM movement_logs
  WHERE user_id = p_user_id
    AND direction = p_direction
    AND timestamp >= (p_timestamp - (p_dup_window_minutes || ' minutes')::INTERVAL)
  ORDER BY timestamp DESC
  LIMIT 1
  FOR UPDATE;

  IF v_recent_id IS NOT NULL THEN
    SELECT to_jsonb(m.*) INTO v_log
    FROM movement_logs m
    WHERE id = v_recent_id;

    RETURN QUERY SELECT v_log, TRUE;
    RETURN;
  END IF;

  INSERT INTO movement_logs (
    id, user_id, direction, reason, gate_id, gate_name,
    operator_id, operator_name, timestamp, is_manual, is_correction
  ) VALUES (
    p_scan_id, p_user_id, p_direction, p_reason, p_gate_id, p_gate_name,
    p_operator_id, p_operator_name, p_timestamp, p_is_manual, FALSE
  );

  SELECT to_jsonb(m.*) INTO v_log
  FROM movement_logs m
  WHERE id = p_scan_id;

  RETURN QUERY SELECT v_log, FALSE;
END;
$$;
-- 4.4 SECURED USER PROVISIONING (sysadmin only)
CREATE OR REPLACE FUNCTION create_user_with_auth(
  p_name TEXT, p_role TEXT, p_unique_id TEXT, p_email TEXT, p_phone TEXT,
  p_gate_id UUID, p_supervised_gates UUID[], p_assigned_hostel TEXT,
  p_department_id TEXT, p_can_view_gender TEXT[],
  p_status TEXT, p_login_identifier TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ DECLARE v_caller_role TEXT; v_user_id UUID; BEGIN
  SELECT role INTO v_caller_role FROM users WHERE id = auth.uid();
  IF v_caller_role IS NULL OR v_caller_role != 'sysadmin' THEN
    RAISE EXCEPTION 'FORBIDDEN: Only system administrators can create users';
  END IF;
  IF p_unique_id IS NULL OR p_unique_id = '' THEN
    RAISE EXCEPTION 'INVALID_UNIQUE_ID: unique_id is required';
  END IF;
  v_user_id := gen_random_uuid();
  INSERT INTO users (id,name,role,unique_id,email,phone,gate_id,
    supervised_gates,assigned_hostel,department_id,can_view_gender,status,
    auth_provider,last_password_change,updated_at,login_identifier)
  VALUES (v_user_id,p_name,p_role,p_unique_id,p_email,p_phone,p_gate_id,
    p_supervised_gates,p_assigned_hostel,p_department_id,p_can_view_gender,p_status,
    'email',NOW(),NOW(),p_login_identifier);
  RETURN v_user_id;
END; $$;

CREATE OR REPLACE FUNCTION delete_user_with_auth(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ DECLARE v_caller_role TEXT; BEGIN
  SELECT role INTO v_caller_role FROM users WHERE id = auth.uid();
  IF v_caller_role IS NULL OR v_caller_role != 'sysadmin' THEN
    RAISE EXCEPTION 'FORBIDDEN: Only system administrators can delete users';
  END IF;
  IF p_user_id = auth.uid() THEN RAISE EXCEPTION 'FORBIDDEN: Cannot delete own account'; END IF;
  DELETE FROM users WHERE id = p_user_id; RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RETURN FALSE; END; $$;

-- 4.5 OCCUPANCY ENGINE (auto IN/OUT toggle)
CREATE OR REPLACE FUNCTION update_campus_occupancy_on_movement()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$ DECLARE v_user UUID; BEGIN
  v_user := NEW.user_id;
  IF v_user IS NOT NULL THEN
    INSERT INTO campus_occupancy (user_id, current_status, last_gate_id, last_log_id, last_updated)
    VALUES (v_user, NEW.direction, NEW.gate_id, NEW.id, NEW.timestamp)
    ON CONFLICT (user_id) DO UPDATE
    SET current_status = EXCLUDED.current_status,
        last_gate_id   = EXCLUDED.last_gate_id,
        last_log_id    = EXCLUDED.last_log_id,
        last_updated   = EXCLUDED.last_updated;
  END IF;
  RETURN NEW;
END; $$;

-- 4.5b DAILY GATE STATS ENGINE (per-day rollup; a new date row = automatic midnight reset)
CREATE OR REPLACE FUNCTION update_daily_stats_on_movement()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$ DECLARE v_date DATE; BEGIN
  -- Day boundary follows the movement's recorded timestamp (UTC day), matching the
  -- analytics routes. A movement after local midnight creates a brand-new (date, gate)
  -- row, so today's counters start from zero automatically.
  v_date := (NEW.timestamp AT TIME ZONE 'UTC')::date;
  INSERT INTO daily_stats (date, gate_id, gate_code, entries, exits, updated_at)
  VALUES (
    v_date,
    NEW.gate_id,
    NEW.gate_name,
    CASE WHEN NEW.direction = 'IN'  THEN 1 ELSE 0 END,
    CASE WHEN NEW.direction = 'OUT' THEN 1 ELSE 0 END,
    NOW()
  )
  ON CONFLICT (date, gate_id) DO UPDATE
  SET entries    = daily_stats.entries + EXCLUDED.entries,
      exits      = daily_stats.exits  + EXCLUDED.exits,
      gate_code  = EXCLUDED.gate_code,
      updated_at = NOW();
  RETURN NEW;
END; $$;

-- 4.6 AUDIT TRIGGER FUNCTIONS
CREATE OR REPLACE FUNCTION audit_log_entry(p_action TEXT, p_user_id UUID, p_user_name TEXT, p_role TEXT, p_details JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN
  INSERT INTO audit_logs (action, user_id, user_name, user_role, details)
  VALUES (p_action, p_user_id, p_user_name, p_role, p_details);
END; $$;

CREATE OR REPLACE FUNCTION create_audit_log_on_movement()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ DECLARE v_role TEXT; BEGIN
  SELECT role INTO v_role FROM users WHERE id = NEW.operator_id;
  PERFORM audit_log_entry('MOVEMENT_CREATED', NEW.operator_id, NEW.operator_name, v_role,
    jsonb_build_object('direction', NEW.direction,'user', NEW.user_id,
      'unique_id', (SELECT unique_id FROM users WHERE id = NEW.user_id),
      'gate', NEW.gate_name));
  RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION create_audit_log_on_pass_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ DECLARE v_role TEXT; BEGIN
  SELECT role INTO v_role FROM users WHERE id = NEW.requested_by_id;
  PERFORM audit_log_entry('GATE_PASS_CREATED', NEW.requested_by_id, NEW.requested_by_name, v_role,
    jsonb_build_object('pass_id', NEW.id,'requester', NEW.requester_name,'roll', NEW.roll,'reason', NEW.reason));
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION create_audit_log_on_pass_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ DECLARE v_approver UUID; v_name TEXT; v_role TEXT; BEGIN
  IF NEW.final_status IS DISTINCT FROM OLD.final_status THEN
    v_approver := COALESCE(NEW.admin_approver_id, NEW.guardian_approver_id);
    SELECT name, role INTO v_name, v_role FROM users WHERE id = v_approver;
    PERFORM audit_log_entry(
      CASE NEW.final_status WHEN 'APPROVED' THEN 'GATE_PASS_APPROVED'
        WHEN 'REJECTED' THEN 'GATE_PASS_REJECTED' ELSE 'GATE_PASS_UPDATED' END,
      v_approver, v_name, v_role,
      jsonb_build_object('pass_id', NEW.id,'old_status', OLD.final_status,'new_status', NEW.final_status));
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION create_audit_log_on_user_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM audit_log_entry('USER_CREATED', NULL, 'System', 'system',
      jsonb_build_object('user_id', NEW.id,'role', NEW.role));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      PERFORM audit_log_entry('ROLE_CHANGED', auth.uid(), NULL, NULL,
        jsonb_build_object('user_id', NEW.id,'old_role', OLD.role,'new_role', NEW.role));
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      PERFORM audit_log_entry('ACCOUNT_STATUS_CHANGED', auth.uid(), NULL, NULL,
        jsonb_build_object('user_id', NEW.id,'old_status', OLD.status,'new_status', NEW.status));
    END IF;
  END IF;
  RETURN NEW;
END; $$;

-- 4.7 SESSION INVALIDATION NOTIFY (role/status changes -> app-layer session revoke)
CREATE OR REPLACE FUNCTION notify_session_invalidation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN
  IF (TG_OP = 'UPDATE' AND (OLD.role IS DISTINCT FROM NEW.role OR OLD.status IS DISTINCT FROM NEW.status)) THEN
    PERFORM pg_notify('session_invalidation',
      json_build_object('user_id',NEW.id,'old_role',OLD.role,'new_role',NEW.role,
        'old_status',OLD.status,'new_status',NEW.status,'timestamp',NOW())::text);
  END IF;
  RETURN NEW;
END; $$;

-- 4.8 UPDATED_AT MAINTENANCE
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN
  NEW.updated_at = NOW(); RETURN NEW;
END; $$;

-- Automatic Auth User Sync Trigger (creates public.users profile when auth.users is created)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (
    id,
    unique_id,
    name,
    email,
    role,
    status,
    auth_provider,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'unique_id', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    'ACTIVE',
    'email',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN NEW;
END; $$;

-- ============================================================================
-- SECTION 5: TRIGGERS
-- ============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER trg_occupancy_on_movement
  AFTER INSERT ON movement_logs FOR EACH ROW EXECUTE FUNCTION update_campus_occupancy_on_movement();
CREATE TRIGGER trg_daily_stats_on_movement
  AFTER INSERT ON movement_logs FOR EACH ROW EXECUTE FUNCTION update_daily_stats_on_movement();
CREATE TRIGGER trg_audit_on_movement
  AFTER INSERT ON movement_logs FOR EACH ROW EXECUTE FUNCTION create_audit_log_on_movement();
CREATE TRIGGER trg_audit_on_pass_insert
  AFTER INSERT ON gate_passes FOR EACH ROW EXECUTE FUNCTION create_audit_log_on_pass_insert();
CREATE TRIGGER trg_audit_on_pass_update
  AFTER UPDATE ON gate_passes FOR EACH ROW EXECUTE FUNCTION create_audit_log_on_pass_update();
CREATE TRIGGER trg_audit_on_user_change
  AFTER INSERT OR UPDATE ON users FOR EACH ROW EXECUTE FUNCTION create_audit_log_on_user_change();
CREATE TRIGGER trg_notify_session_invalidation
  AFTER UPDATE ON users FOR EACH ROW EXECUTE FUNCTION notify_session_invalidation();
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_notif_prefs_updated_at
  BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- SECTION 6: ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE users                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE gates                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_details           ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_details          ENABLE ROW LEVEL SECURITY;
ALTER TABLE movement_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats               ENABLE ROW LEVEL SECURITY;
ALTER TABLE campus_occupancy          ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_passes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications             ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_push_queue   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_sms_queue    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_email_queue  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_metrics               ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE backups                   ENABLE ROW LEVEL SECURITY;

-- 6.1 USERS (self + admin scope)
CREATE POLICY users_select_own   ON users FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY users_select_admin ON users FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY users_update_own   ON users FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY users_update_admin ON users FOR UPDATE TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY users_update_roles ON users FOR UPDATE TO authenticated USING (is_sysadmin(auth.uid())) WITH CHECK (is_sysadmin(auth.uid()));

-- 6.2 GATES (broad authenticated read of active gates; admin manages; service all)
CREATE POLICY gates_select_active ON gates FOR SELECT TO authenticated USING (is_active = TRUE);
CREATE POLICY gates_select_admin  ON gates FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY gates_all_service   ON gates FOR ALL TO service_role USING (true) WITH CHECK (true);
-- 6.3 STUDENT DETAILS (broad read; warden scoped; admin manage)
CREATE POLICY sdetails_select_auth    ON student_details FOR SELECT TO authenticated USING (true);
CREATE POLICY sdetails_select_owner   ON student_details FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY sdetails_select_warden  ON student_details FOR SELECT TO authenticated
  USING (is_warden(auth.uid()) AND hostel_block = get_warden_hostel(auth.uid()));
CREATE POLICY sdetails_manage_admin   ON student_details FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- 6.4 EMPLOYEE DETAILS (broad read; admin manage)
CREATE POLICY edetails_select_auth    ON employee_details FOR SELECT TO authenticated USING (true);
CREATE POLICY edetails_select_owner   ON employee_details FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY edetails_manage_admin   ON employee_details FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- 6.5 MOVEMENT LOGS (operator scope = own gate; admin broad; self = own trail; insert by operator/admin/warden)
CREATE POLICY mlog_select_operator ON movement_logs FOR SELECT TO authenticated
  USING (is_operator(auth.uid()) AND gate_id = (SELECT gate_id FROM users WHERE id = auth.uid()));
CREATE POLICY mlog_select_staff  ON movement_logs FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR is_warden(auth.uid()));
CREATE POLICY mlog_select_own    ON movement_logs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY mlog_insert_staff  ON movement_logs FOR INSERT TO authenticated
  WITH CHECK (is_operator(auth.uid()) OR is_admin(auth.uid()) OR is_warden(auth.uid()));

-- 6.5b DAILY STATS (operator own gate; staff broad; admin read all; service writes/backfills)
CREATE POLICY dstats_select_operator ON daily_stats FOR SELECT TO authenticated
  USING (is_operator(auth.uid()) AND gate_id = (SELECT gate_id FROM users WHERE id = auth.uid()));
CREATE POLICY dstats_select_staff ON daily_stats FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR is_warden(auth.uid()));
CREATE POLICY dstats_select_own   ON daily_stats FOR SELECT TO authenticated USING (true);
CREATE POLICY dstats_all_service ON daily_stats FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6.6 CAMPUS OCCUPANCY (operator own gate; staff broad; self)
CREATE POLICY occ_select_operator ON campus_occupancy FOR SELECT TO authenticated
  USING (is_operator(auth.uid()) AND last_gate_id = (SELECT gate_id FROM users WHERE id = auth.uid()));
CREATE POLICY occ_select_staff   ON campus_occupancy FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR is_warden(auth.uid()));
CREATE POLICY occ_select_own     ON campus_occupancy FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 6.7 VISITOR LOGS (broad authenticated; inserts by operators/admin)
CREATE POLICY vlogs_select_auth ON visitor_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY vlogs_insert_auth ON visitor_logs FOR INSERT TO authenticated
  WITH CHECK (is_operator(auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY vlogs_update_auth ON visitor_logs FOR UPDATE TO authenticated
  USING (is_operator(auth.uid()) OR is_admin(auth.uid()));

-- 6.8 GATE PASSES (owner + guardian of wards + staff approvers)
CREATE POLICY passes_select_own ON gate_passes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id = ANY(get_guardian_wards(auth.uid())));
CREATE POLICY passes_select_staff ON gate_passes FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR is_warden(auth.uid()));
CREATE POLICY passes_insert_own ON gate_passes FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() OR user_id = ANY(get_guardian_wards(auth.uid())) OR is_admin(auth.uid()));
CREATE POLICY passes_update_approvers ON gate_passes FOR UPDATE TO authenticated USING (
  is_admin(auth.uid()) OR is_warden(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) OR is_warden(auth.uid()));

-- 6.9 ALERTS (admin; operators own gate)
CREATE POLICY alerts_select_admin ON alerts FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY alerts_select_op   ON alerts FOR SELECT TO authenticated
  USING (is_operator(auth.uid()) AND (gate_id = (SELECT gate_id FROM users WHERE id = auth.uid()) OR gate_id IS NULL));
CREATE POLICY alerts_resolve_admin ON alerts FOR UPDATE TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- 6.10 AUDIT LOGS (READ = sysadmin only)
CREATE POLICY audit_select_sysadmin ON audit_logs FOR SELECT TO authenticated USING (is_sysadmin(auth.uid()));

-- 6.11 MONITORING + BACKUPS (admin only)
CREATE POLICY metrics_select_admin  ON api_metrics FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY sysalerts_all_admin   ON system_alerts FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY backups_all_admin     ON backups FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- 6.12 NOTIFICATIONS
CREATE POLICY notif_select_own ON notifications FOR SELECT TO authenticated
  USING (recipient_id = auth.uid()::TEXT OR recipient_type = 'all');
CREATE POLICY notif_update_own ON notifications FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid()::TEXT) WITH CHECK (recipient_id = auth.uid()::TEXT);
CREATE POLICY prefs_select_own ON notification_preferences FOR SELECT TO authenticated USING (user_id = auth.uid()::TEXT);
CREATE POLICY prefs_update_own ON notification_preferences FOR UPDATE TO authenticated
  USING (user_id = auth.uid()::TEXT) WITH CHECK (user_id = auth.uid()::TEXT);
CREATE POLICY queues_service ON notification_push_queue FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY smsq_service   ON notification_sms_queue FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY emailq_service ON notification_email_queue FOR ALL TO service_role USING (true) WITH CHECK (true);
-- ============================================================================
-- SECTION 7: INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_gates_active ON gates(is_active);
CREATE INDEX IF NOT EXISTS idx_users_unique_id ON users(unique_id);
CREATE INDEX IF NOT EXISTS idx_users_handle ON users(handle);
CREATE INDEX IF NOT EXISTS idx_users_email  ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_login_identifier ON users(login_identifier);
CREATE INDEX IF NOT EXISTS idx_users_role   ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_gate_id ON users(gate_id);
CREATE INDEX IF NOT EXISTS idx_users_name ON users USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_sdetails_roll ON student_details(roll);
CREATE INDEX IF NOT EXISTS idx_sdetails_guardian ON student_details(guardian_id);
CREATE INDEX IF NOT EXISTS idx_sdetails_hostel_block ON student_details(hostel_block);
CREATE INDEX IF NOT EXISTS idx_edetails_employee_id ON employee_details(employee_id);
CREATE INDEX IF NOT EXISTS idx_vlogs_user_id ON visitor_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_vlogs_status ON visitor_logs(status);
CREATE INDEX IF NOT EXISTS idx_mlogs_timestamp ON movement_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mlogs_direction ON movement_logs(direction);
CREATE INDEX IF NOT EXISTS idx_mlogs_gate_id ON movement_logs(gate_id);
CREATE INDEX IF NOT EXISTS idx_mlogs_gate_name ON movement_logs(gate_name);
CREATE INDEX IF NOT EXISTS idx_mlogs_operator_id ON movement_logs(operator_id);
CREATE INDEX IF NOT EXISTS idx_mlogs_user_id ON movement_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);
CREATE INDEX IF NOT EXISTS idx_gpasses_user_id ON gate_passes(user_id);
CREATE INDEX IF NOT EXISTS idx_gpasses_final_status ON gate_passes(final_status);
CREATE INDEX IF NOT EXISTS idx_gpasses_requested_at ON gate_passes(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_occ_last_gate ON campus_occupancy(last_gate_id);
CREATE INDEX IF NOT EXISTS idx_occ_status ON campus_occupancy(current_status);
CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_notif_recipient ON notifications(recipient_id, recipient_type);
CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pushq_status ON notification_push_queue(status);
CREATE INDEX IF NOT EXISTS idx_smsq_status ON notification_sms_queue(status);
CREATE INDEX IF NOT EXISTS idx_emailq_status ON notification_email_queue(status);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_apimetrics_path ON api_metrics(path);
CREATE INDEX IF NOT EXISTS idx_apimetrics_timestamp ON api_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_apimetrics_status_code ON api_metrics(status_code);
CREATE INDEX IF NOT EXISTS idx_sysalerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_sysalerts_resolved ON system_alerts(resolved);

-- Composite performance indexes for movement_logs and daily_stats
CREATE INDEX IF NOT EXISTS idx_mlogs_user_timestamp ON movement_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mlogs_gate_timestamp ON movement_logs(gate_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mlogs_timestamp_direction ON movement_logs(timestamp DESC, direction);
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_stats_date_gate ON daily_stats(date, gate_id);
CREATE INDEX IF NOT EXISTS idx_daily_stats_gate_date ON daily_stats(gate_id, date DESC);

-- ============================================================================
-- SECTION 8: SEED DATA
-- ============================================================================
-- Gates are data-driven; no fixed gate-1/2/3 ids. Seed logical campus gates.
INSERT INTO gates (gate_code, name, location, type, is_active) VALUES
  ('MAIN',   'Main Campus Gate', 'Main Entrance',   'main',    TRUE),
  ('HOSTEL', 'Hostel Gate 1',    'Boys Hostel Block A', 'hostel', TRUE)
ON CONFLICT (gate_code) DO UPDATE
  SET name = EXCLUDED.name, location = EXCLUDED.location,
      type = EXCLUDED.type, is_active = EXCLUDED.is_active;
-- ============================================================================
-- SECTION 9: DOCUMENTATION COMMENTS
-- ============================================================================
COMMENT ON TABLE users IS 'Unified identity for every person on campus; role = access level, unique_id = fixed lookup identifier';
COMMENT ON COLUMN users.role IS 'Access level: operator|admin|sysadmin|guardian|student|warden|faculty|staff|worker|visitor';
COMMENT ON COLUMN users.unique_id IS 'Fixed identifying detail (roll number, employee id, phone) used for lookup/index';
COMMENT ON TABLE student_details IS 'Optional student layer keyed by user_id; roll/year/section/hostel indexed by user';
COMMENT ON TABLE employee_details IS 'Optional employee layer for faculty/staff/worker keyed by user_id';
COMMENT ON TABLE movement_logs IS 'Every scan; every user has their own in/out trail; direction auto-derived via campus_occupancy trigger';
COMMENT ON TABLE campus_occupancy IS 'Current IN/OUT state per user - drives automatic direction toggle';
COMMENT ON TABLE gate_passes IS 'Exit approval flow; request is for the user; guardian + admin approval';
COMMENT ON TABLE alerts IS 'Security/safety events at gates';
COMMENT ON TABLE audit_logs IS 'System action trail (movement/pass/user changes)';
COMMENT ON TABLE notifications IS 'In-app/push/sms/email notifications';
COMMENT ON TABLE backups IS 'Database backup metadata';
COMMENT ON COLUMN users.status IS 'Active vs suspended/locked account states';
COMMENT ON COLUMN movement_logs.direction IS 'IN or OUT - driven by campus_occupancy.current_status';
COMMENT ON COLUMN campus_occupancy.current_status IS 'IN or OUT - determines next scan direction';
COMMENT ON COLUMN gate_passes.final_status IS 'PENDING|APPROVED|REJECTED|APPROVED_PARENT|APPROVED_ADMIN|COMPLETED';
COMMENT ON COLUMN gate_passes.reason IS 'Exit type: Home Out|Day Out|Leave|Regular|Outing|Emergency';
COMMENT ON COLUMN student_details.student_type IS 'HM=Hostel Male|HF=Hostel Female|DM=Day Male|DF=Day Female';

-- ============================================================================
-- SECTION 10: PERMISSIONS
-- ============================================================================
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;

-- ============================================================================
-- END OF CONSOLIDATED UNIFIED SCHEMA
-- ============================================================================
