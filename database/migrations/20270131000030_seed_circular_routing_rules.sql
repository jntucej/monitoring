-- 20270131000030_seed_circular_routing_rules.sql
BEGIN;

INSERT INTO public.ops_rules (domain, rule_key, scope, value, created_by)
VALUES
  ('circular_routing', 'campus_wide',  NULL, '{"chain":["vice_principal","principal"],"require_principal":true}'::jsonb,  '00000000-0000-4000-8000-000000000001'::uuid),
  ('circular_routing', 'departmental', NULL, '{"chain":["hod","principal"],"require_principal":false}'::jsonb,           '00000000-0000-4000-8000-000000000001'::uuid),
  ('circular_routing', 'operational',  NULL, '{"chain":["admin","principal"],"require_principal":false}'::jsonb,         '00000000-0000-4000-8000-000000000001'::uuid)
ON CONFLICT (domain, rule_key, scope, effective_from) DO NOTHING;

COMMIT;
