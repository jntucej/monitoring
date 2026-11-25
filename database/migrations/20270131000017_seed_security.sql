-- 20270131000017_seed_security.sql
BEGIN;

INSERT INTO public.ref_categories (domain, code, label, description, sort_order, active)
VALUES
  ('sos_category', 'harassment', 'Harassment',     'Harassment or intimidation', 1, true),
  ('sos_category', 'medical',    'Medical',        'Medical emergency',          2, true),
  ('sos_category', 'theft',      'Theft',          'Theft or property loss',     3, true),
  ('sos_category', 'suspicious', 'Suspicious',     'Suspicious activity',        4, true),
  ('sos_category', 'unsafe',     'Feeling Unsafe', 'Student feels unsafe',       5, true),
  ('sos_category', 'fire',       'Fire / Hazard',  'Fire or safety hazard',      6, true),
  ('sos_category', 'other',      'Other',          'Other security request',     7, true)
ON CONFLICT (domain, code) DO NOTHING;

INSERT INTO public.ops_rules (domain, rule_key, scope, value, created_by)
VALUES (
  'sos_escalation',
  'default',
  NULL,
  '{"redispatch_after_s":30,"supervisor_after_s":60,"admin_after_s":120,"guardian_after_s":300,"critical_priority_skip_redispatch":true}'::jsonb,
  '00000000-0000-4000-8000-000000000001'::uuid
)
ON CONFLICT (domain, rule_key, scope, effective_from) DO NOTHING;

INSERT INTO public.security_shift_templates (name, start_time, end_time, days_of_week, active)
SELECT v.name, v.start_time::time, v.end_time::time, '{1,2,3,4,5,6,7}'::int[], true
FROM (VALUES
  ('Morning', '06:00:00', '14:00:00'),
  ('Evening', '14:00:00', '22:00:00'),
  ('Night',   '22:00:00', '06:00:00')
) AS v(name, start_time, end_time)
WHERE NOT EXISTS (SELECT 1 FROM public.security_shift_templates);

COMMIT;
