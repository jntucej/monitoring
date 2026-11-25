-- 20270131000024_seed_student_scope.sql
BEGIN;

INSERT INTO public.ref_categories (domain, code, label, description, sort_order, active)
VALUES
  ('class_request_type', 'exemption',        'Exemption / OD',   'Existing OD or leave exemption', 1, true),
  ('class_request_type', 'extra_session',    'Extra Session',    'Faculty-posted extra class',     2, true),
  ('class_request_type', 'reschedule',       'Reschedule',       'Proposed time change',           3, true),
  ('class_request_type', 'lab_swap',         'Lab Batch Swap',   'Lab batch swap request',         4, true),
  ('class_request_type', 'interest_gauging', 'Interest Gauging', 'CR interest poll before ask',    5, true)
ON CONFLICT (domain, code) DO NOTHING;

INSERT INTO public.ops_rules (domain, rule_key, scope, value, created_by)
VALUES
  ('campus_feed_expiry', 'circular_default',  NULL, '{"days":90}'::jsonb,  '00000000-0000-4000-8000-000000000001'::uuid),
  ('campus_feed_expiry', 'event_default',     NULL, '{"days":30}'::jsonb,  '00000000-0000-4000-8000-000000000001'::uuid),
  ('campus_feed_expiry', 'alert_default',     NULL, '{"days":7}'::jsonb,   '00000000-0000-4000-8000-000000000001'::uuid),
  ('campus_feed_expiry', 'emergency_default', NULL, '{"hours":24}'::jsonb, '00000000-0000-4000-8000-000000000001'::uuid)
ON CONFLICT (domain, rule_key, scope, effective_from) DO NOTHING;

INSERT INTO public.achievement_templates (code, title, category, description, awarder_role, visibility, auto_rule)
VALUES
  ('attendance_95', '95%+ Attendance', 'academic', 'Maintained >= 95% attendance in semester', '{faculty,hod,dean}', 'class', '{"metric":"attendance_pct","operator":">=","value":95,"min_classes":30}'::jsonb),
  ('best_poster',   'Best Poster',     'cultural', 'Awarded for best technical poster',        '{faculty,hod,dean}', 'campus', NULL),
  ('nss_40h',       'NSS 40 Hours',    'service',  'Completed 40 hours of NSS service',        '{hod,dean,principal}', 'dept', NULL)
ON CONFLICT (code) DO NOTHING;

COMMIT;
