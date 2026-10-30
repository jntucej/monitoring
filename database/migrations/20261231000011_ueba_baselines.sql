-- Migration: 20261231000001_ueba_baselines.sql
-- Control 8: User and Entity Behavior Analytics (UEBA)
-- Per-role, per-user request baselines and statistical anomaly views.

-- 1. Materialized view for per-user, per-role 30-day baseline metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS public.v_user_baseline AS
SELECT 
  user_id, 
  role,
  AVG(daily) AS avg_daily,
  COALESCE(STDDEV(daily), 0) AS std_daily,
  MAX(daily) AS peak_daily,
  COUNT(DISTINCT d) AS days_active
FROM (
  SELECT 
    user_id, 
    role, 
    date_trunc('day', timestamp) AS d, 
    count(*) AS daily
  FROM public.api_metrics 
  WHERE user_id IS NOT NULL
    AND timestamp > now() - interval '30 days'
  GROUP BY user_id, role, date_trunc('day', timestamp)
) t 
GROUP BY user_id, role;

CREATE UNIQUE INDEX IF NOT EXISTS idx_v_user_baseline_user_role 
  ON public.v_user_baseline (user_id, role);

-- 2. View for Volume Spike Anomalies (today > avg + 3*stddev)
CREATE OR REPLACE VIEW public.v_ueba_volume_spikes AS
SELECT 
  m.user_id,
  m.role,
  m.today_count,
  b.avg_daily,
  b.std_daily,
  ROUND(((m.today_count - b.avg_daily) / NULLIF(b.std_daily, 0))::numeric, 2) AS z_score
FROM (
  SELECT 
    user_id, 
    role, 
    count(*) AS today_count
  FROM public.api_metrics
  WHERE user_id IS NOT NULL
    AND timestamp >= date_trunc('day', now())
  GROUP BY user_id, role
) m
JOIN public.v_user_baseline b ON b.user_id = m.user_id
WHERE b.std_daily > 0
  AND m.today_count > (b.avg_daily + 3 * b.std_daily)
  AND m.today_count > 50; -- Avoid low-volume noise

-- 3. View for Off-Hours Privileged Actions (sysadmin/admin actions outside 07:00-22:00 IST)
-- audit_logs schema: (id, action, user_id, user_name, user_role, details, ip_address, user_agent, timestamp)
-- `details` is JSONB; entity info lives in details->>'entity' when present.
CREATE OR REPLACE VIEW public.v_ueba_off_hours_privileged AS
SELECT 
  a.id,
  a.user_id,
  u.email,
  u.role,
  a.action,
  a.details->>'entity' AS entity,
  a.details->>'entity_id' AS entity_id,
  a.timestamp AS created_at,
  EXTRACT(HOUR FROM (a.timestamp AT TIME ZONE 'Asia/Kolkata')) AS local_hour
FROM public.audit_logs a
JOIN public.users u ON u.id = a.user_id
WHERE u.role IN ('sysadmin', 'admin')
  AND (
    EXTRACT(HOUR FROM (a.timestamp AT TIME ZONE 'Asia/Kolkata')) < 7 
    OR EXTRACT(HOUR FROM (a.timestamp AT TIME ZONE 'Asia/Kolkata')) >= 22
  )
  AND a.action NOT LIKE 'CRON_%'
ORDER BY a.timestamp DESC;

-- 4. View for Impossible Travel / Multi-IP Session Anomalies (within 1 hour)
CREATE OR REPLACE VIEW public.v_ueba_impossible_travel AS
SELECT 
  s1.user_id,
  s1.ip_address AS ip1,
  s2.ip_address AS ip2,
  s1.created_at AS session1_at,
  s2.created_at AS session2_at,
  ROUND(ABS(EXTRACT(EPOCH FROM (s2.created_at - s1.created_at))) / 60) AS minutes_apart
FROM public.sessions s1
JOIN public.sessions s2 ON s1.user_id = s2.user_id AND s1.id <> s2.id
WHERE s1.ip_address IS NOT NULL 
  AND s2.ip_address IS NOT NULL
  AND s1.ip_address <> s2.ip_address
  AND ABS(EXTRACT(EPOCH FROM (s2.created_at - s1.created_at))) < 3600
  AND s1.created_at > now() - interval '7 days'
ORDER BY s2.created_at DESC;
