-- 20270131000012_seed_mess_reference.sql
-- Seed ref_categories for mess_vote and mess_scan_outcome, plus default counters.

BEGIN;

INSERT INTO public.ref_categories (domain, code, label, description, sort_order, active)
VALUES
  ('mess_vote', 'yes',   'Yes',   'Strong intent to eat this item', 1, true),
  ('mess_vote', 'maybe', 'Maybe', 'Might eat depending on day',     2, true),
  ('mess_vote', 'no',    'No',    'Not interested',                 3, true),
  ('mess_scan_outcome', 'ok',              'Served',          'Valid TOTP + counter incremented', 1, true),
  ('mess_scan_outcome', 'duplicate',       'Duplicate',       'Already scanned in this session',  2, true),
  ('mess_scan_outcome', 'expired',         'Expired',         'TOTP window expired',              3, true),
  ('mess_scan_outcome', 'wrong_session',   'Wrong Session',   'Session not active',               4, true),
  ('mess_scan_outcome', 'invalid_code',    'Invalid Code',    'TOTP mismatch',                    5, true),
  ('mess_scan_outcome', 'tampered',        'Tampered',        'HMAC verification failed',         6, true),
  ('mess_scan_outcome', 'not_registered',  'Not Registered',  'No daily secret for student',      7, true),
  ('mess_scan_outcome', 'manual_override', 'Manual Override', 'Operator override with reason',    8, true),
  ('mess_scan_outcome', 'wrong_device',    'Wrong Device',    'Device not bound to mess counter', 9, true)
ON CONFLICT (domain, code) DO NOTHING;

INSERT INTO public.mess_counters (name, block_id, active)
SELECT v.name, v.block_id, true
FROM (VALUES
  ('Counter A', NULL),
  ('Counter B', NULL),
  ('Counter C', NULL)
) AS v(name, block_id)
WHERE NOT EXISTS (SELECT 1 FROM public.mess_counters);

COMMIT;
