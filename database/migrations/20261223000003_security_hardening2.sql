-- ============================================================================
-- Migration: 20261223000003_security_hardening2.sql
--
-- P1-11: Manual-scan 60-second dedup guard
--   The process_gate_scan rewrite in 20261220000002 deduplicates only
--   when NOT is_manual, so an operator can repeatedly mark a student
--   IN or OUT manually within the same minute to inflate daily_stats,
--   campus_occupancy, and the student dashboard. This migration adds a
--   second dedup check for manual scans: reject an auto scan that occurs
--   within 60 seconds of a manual scan for the same user/direction, and
--   also reject a second manual scan in that window.
--
-- P1-15: login_attempts uppercase identifier
--   login_attempts.identifier is TEXT PRIMARY KEY (case-sensitive).
--   pin_login_attempts had an UPPER(identifier) index. The merge in
--   20261114000002 collapses only exact-case matches, so 'op001' and
--   'OP001' produce two rows and the rate-limit reader (which queries
--   case-sensitively) sees only one, allowing a lockout bypass.
--   Fix: merge case-variant duplicates, add a unique index on
--   UPPER(identifier), and normalize all existing rows to uppercase.
-- ============================================================================

BEGIN;

-- ============================================================================
-- P1-11: manual-scan 60s dedup guard
-- ============================================================================

-- Copy of process_gate_scan from 20261220000002 with added manual-scan
-- 60s dedup guard (P1-11). The original function only dedupes when
-- NOT is_manual; this rewrite adds a v_recent_manual_id check before
-- the manual-insert branch so a second manual scan (or an auto scan)
-- within 60 seconds of a manual scan is rejected.
--
-- Signature copied verbatim from 20261220000002:
--   CREATE OR REPLACE FUNCTION public.process_gate_scan(
--     p_scan_id uuid, p_user_id uuid, p_direction character varying,
--     p_reason character varying, p_gate_id uuid, p_gate_name character varying,
--     p_operator_id uuid, p_operator_name character varying,
--     p_timestamp timestamp with time zone, p_is_manual boolean,
--     p_dup_window_minutes integer DEFAULT 5
--   )
CREATE OR REPLACE FUNCTION public.process_gate_scan(
  p_scan_id uuid, p_user_id uuid, p_direction character varying, p_reason character varying,
  p_gate_id uuid, p_gate_name character varying, p_operator_id uuid, p_operator_name character varying,
  p_timestamp timestamp with time zone, p_is_manual boolean, p_dup_window_minutes integer DEFAULT 5
)
RETURNS TABLE(inserted_log jsonb, is_duplicate boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_caller uuid;
  v_caller_role text;
  v_caller_gate uuid;
  v_recent_id uuid;
  v_recent_manual_id uuid;
  v_log jsonb;
  v_now timestamptz := now();
  v_ts timestamptz;
BEGIN
  BEGIN v_caller := current_setting('app.current_user_id', true)::uuid; EXCEPTION WHEN OTHERS THEN v_caller := NULL; END;
  IF v_caller IS NULL THEN RAISE EXCEPTION 'FORBIDDEN: no caller identity'; END IF;
  SELECT role, gate_id INTO v_caller_role, v_caller_gate FROM public.users WHERE id = v_caller AND status = 'ACTIVE';
  IF v_caller_role IS NULL OR v_caller_role NOT IN ('operator', 'admin', 'sysadmin', 'principal') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF v_caller_role = 'operator' AND v_caller_gate IS NOT NULL AND v_caller_gate <> p_gate_id THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  v_ts := coalesce(p_timestamp, v_now);
  IF v_ts < v_now - interval '5 minutes' OR v_ts > v_now + interval '5 minutes' THEN v_ts := v_now; END IF;

  -- Same-direction scan inside the dup window (auto scans only) → return the existing row.
  SELECT id INTO v_recent_id
  FROM public.movement_logs
  WHERE user_id = p_user_id AND direction = p_direction
    AND timestamp >= (v_now - (p_dup_window_minutes || ' minutes')::interval)
    AND NOT is_manual
  ORDER BY timestamp DESC LIMIT 1
  FOR UPDATE;
  IF v_recent_id IS NOT NULL THEN
    SELECT to_jsonb(m.*) INTO v_log FROM public.movement_logs m WHERE id = v_recent_id;
    RETURN QUERY SELECT v_log, true;
    RETURN;
  END IF;

  -- P1-11: manual-scan 60-second dedup guard.
  -- Before inserting a manual scan, check whether a manual scan for the
  -- same user+direction was already recorded within the last 60 seconds.
  -- An auto scan arriving in that window is also rejected to prevent
  -- double-counting from operator spam.
  SELECT id INTO v_recent_manual_id
  FROM public.movement_logs
  WHERE user_id = p_user_id AND direction = p_direction
    AND timestamp >= (v_now - INTERVAL '60 seconds')
    AND is_manual = TRUE
  ORDER BY timestamp DESC LIMIT 1 FOR UPDATE;
  IF v_recent_manual_id IS NOT NULL AND p_is_manual THEN
    -- Second manual scan within 60s: reject to prevent inflation.
    RAISE EXCEPTION 'DUPLICATE_MANUAL_SCAN_WITHIN_60S: A manual scan was already recorded for this user/direction within the last 60 seconds.';
  END IF;
  IF v_recent_manual_id IS NOT NULL AND NOT p_is_manual THEN
    -- Auto scan within 60s of a manual scan: reject to prevent double-counting.
    RAISE EXCEPTION 'DUPLICATE_SCAN_WITHIN_60S: A manual scan was already recorded for this user/direction within the last 60 seconds.';
  END IF;

  IF NOT p_is_manual THEN
    BEGIN
      INSERT INTO public.movement_logs (id, user_id, direction, reason, gate_id, gate_name,
                                        operator_id, operator_name, timestamp, is_manual, is_correction)
      VALUES (p_scan_id, p_user_id, p_direction, p_reason, p_gate_id, p_gate_name,
              v_caller, p_operator_name, v_ts, false, false);
    EXCEPTION WHEN unique_violation THEN
      -- Another operator won the race in the same minute bucket: hand them
      -- the row we just saw instead of erroring.
      SELECT to_jsonb(m.*) INTO v_log FROM public.movement_logs m
       WHERE m.user_id = p_user_id AND m.direction = p_direction
         AND public.movement_minute_bucket(m.timestamp) = public.movement_minute_bucket(v_ts)
       ORDER BY m.timestamp DESC LIMIT 1;
      IF v_log IS NOT NULL THEN
        RETURN QUERY SELECT v_log, true;
        RETURN;
      END IF;
      RAISE;
    END;
  ELSE
    INSERT INTO public.movement_logs (id, user_id, direction, reason, gate_id, gate_name,
                                      operator_id, operator_name, timestamp, is_manual, is_correction)
    VALUES (p_scan_id, p_user_id, p_direction, p_reason, p_gate_id, p_gate_name,
            v_caller, p_operator_name, v_ts, true, false);
  END IF;

  SELECT to_jsonb(m.*) INTO v_log FROM public.movement_logs m WHERE id = p_scan_id;
  RETURN QUERY SELECT v_log, false;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.process_gate_scan(uuid, uuid, varchar, varchar, uuid, varchar, uuid, varchar, timestamptz, boolean, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_gate_scan(uuid, uuid, varchar, varchar, uuid, varchar, uuid, varchar, timestamptz, boolean, integer) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- P1-11 (guard): recompute_curfew_score should only count auto scans.
-- The current version (from 20261114000001) has NO is_manual filter, so
-- manual IN-scan spam inflates curfew scores. Add `AND NOT m.is_manual`
-- to the WHERE clause.
-- ----------------------------------------------------------------------------
-- Note: recompute_curfew_score currently counts all movement_logs IN rows
-- for a given user/day. We patch the running version to exclude manual rows.
-- The function is replaced in full (CREATE OR REPLACE) to preserve all other
-- logic.
CREATE OR REPLACE FUNCTION public.recompute_curfew_score(
  p_user_id UUID,
  p_date    DATE DEFAULT (CURRENT_DATE)
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_curfew         TEXT;
  v_curfew_minutes INTEGER;
  v_on_time        INTEGER := 0;
  v_late           INTEGER := 0;
  v_score          INTEGER;
BEGIN
  SELECT COALESCE(hostel_curfew_time, '21:00') INTO v_curfew
    FROM student_details WHERE user_id = p_user_id;
  v_curfew := COALESCE(v_curfew, '21:00');
  v_curfew_minutes :=
    CAST(split_part(v_curfew, ':', 1) AS INTEGER) * 60 +
    CAST(split_part(v_curfew, ':', 2) AS INTEGER);

  SELECT
    COUNT(*) FILTER (WHERE (EXTRACT(HOUR FROM m.timestamp AT TIME ZONE 'Asia/Kolkata') * 60 +
                            EXTRACT(MINUTE FROM m.timestamp AT TIME ZONE 'Asia/Kolkata')) <= v_curfew_minutes),
    COUNT(*) FILTER (WHERE (EXTRACT(HOUR FROM m.timestamp AT TIME ZONE 'Asia/Kolkata') * 60 +
                            EXTRACT(MINUTE FROM m.timestamp AT TIME ZONE 'Asia/Kolkata')) > v_curfew_minutes)
    INTO v_on_time, v_late
    FROM movement_logs m
   WHERE m.user_id = p_user_id AND m.direction = 'IN'
     AND (m.timestamp AT TIME ZONE 'Asia/Kolkata')::date = p_date
     AND NOT m.is_manual;

  v_score := GREATEST(0, LEAST(100, 100 - (v_late * 10)));

  INSERT INTO student_curfew_scores
    (student_user_id, score_date, score, on_time_returns, late_returns, violations)
  VALUES (p_user_id, p_date, v_score, v_on_time, v_late, v_late)
  ON CONFLICT (student_user_id, score_date) DO UPDATE
    SET score           = EXCLUDED.score,
        on_time_returns = EXCLUDED.on_time_returns,
        late_returns    = EXCLUDED.late_returns,
        violations      = EXCLUDED.violations,
        updated_at      = NOW();
END;
$$;

-- ============================================================================
-- P1-15: normalize login_attempts identifier to uppercase
-- ============================================================================
-- The merge in 20261114000002 collapses only exact-case matches, so
-- 'op001' and 'OP001' can coexist as two rows. The rate-limit reader
-- queries case-sensitively and sees only one, allowing a bypass.
--
-- Order matters:
--   1. Delete case-variant duplicate rows (keeping the one with the
--      highest failed_count so no lockout state is lost).
--   2. Add a unique index on UPPER(identifier) so new inserts cannot
--      reintroduce case-duplicates.
--   3. Normalize all remaining rows to uppercase so the reader's
--      case-sensitive lookup matches regardless of the case typed.
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'login_attempts_identifier_upper'
  ) THEN
    RAISE NOTICE 'login_attempts_identifier_upper index already exists, skipping P1-15 normalization';
  ELSE
    -- Step 1: merge case-variant duplicates, keeping the row with the
    -- highest failed_count (ties broken by lowest ctid = earliest insert).
    DELETE FROM public.login_attempts a
    USING public.login_attempts b
    WHERE UPPER(a.identifier) = UPPER(b.identifier)
      AND (a.failed_count, a.ctid) < (b.failed_count, b.ctid);

    -- Step 2: unique index on UPPER(identifier) prevents new case-duplicates.
    CREATE UNIQUE INDEX IF NOT EXISTS login_attempts_identifier_upper
      ON public.login_attempts (UPPER(identifier));

    -- Step 3: normalize all remaining rows to uppercase.
    UPDATE public.login_attempts
    SET identifier = UPPER(identifier)
    WHERE identifier <> UPPER(identifier);
  END IF;
END $$;

COMMIT;

-- Self-record (adaptive to both schema_migrations shapes)
DO $$
DECLARE has_filename BOOLEAN; has_checksum BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='schema_migrations'
      AND column_name='filename') INTO has_filename;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='schema_migrations'
      AND column_name='checksum') INTO has_checksum;
  IF has_filename AND has_checksum THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at, checksum)
    VALUES ('20261223000003',
            '20261223000003_security_hardening2.sql', NOW(),
            md5('20261223000003_security_hardening2'))
    ON CONFLICT (version) DO NOTHING;
  ELSIF has_filename THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at)
    VALUES ('20261223000003',
            '20261223000003_security_hardening2.sql', NOW())
    ON CONFLICT (version) DO NOTHING;
  ELSE
    INSERT INTO public.schema_migrations (version, applied_at)
    VALUES ('20261223000003', NOW())
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;
