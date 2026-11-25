-- 20270131000008_seed_ops_rules.sql
--
-- Seeds the operational thresholds + chain/scope definitions into ops_rules.
-- created_by is a fixed service uuid (the system actor); a real deploy can
-- repoint this. Idempotent: ON CONFLICT on the unique key DO NOTHING (the
-- seed rows carry a known effective_from so re-runs don't duplicate).

BEGIN;

-- A stable "system" actor id for seeded rules (not a real user; the
-- automation that reads these doesn't audit-attribute them to a person).
-- DO $$
-- BEGIN
--   IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = '00000000-0000-4000-8000-000000000001') THEN
--     -- no-op: we do NOT fabricate a user row; created_by just points at a
--     -- sentinel. The rules service treats 000…001 as "system seed".
--   END IF;
-- END $$;

INSERT INTO public.ops_rules (domain, rule_key, scope, value, created_by) VALUES
  -- Leave thresholds: duration class → chain. (ISO-8601 durations.)
  ('leave_threshold','short',NULL,'{"duration":"PT2H","chain":["deputy_warden"]}', '00000000-0000-4000-8000-000000000001'),
  ('leave_threshold','medium',NULL,'{"duration":"P1D","chain":["deputy_warden","hostel_manager"]}', '00000000-0000-4000-8000-000000000001'),
  ('leave_threshold','long',NULL,'{"duration":"P7D","chain":["deputy_warden","hostel_manager","chief_warden"]}', '00000000-0000-4000-8000-000000000001'),
  ('leave_threshold','emergency',NULL,'{"chain":["deputy_warden"],"parallel_notify":["chief_warden","principal"]}', '00000000-0000-4000-8000-000000000001'),
  ('leave_threshold','auto_escalation',NULL,'{"at_pct_sla":80,"escalate_to":"hostel_manager"}', '00000000-0000-4000-8000-000000000001'),
  -- Curfew windows (in_time / grace / breach) — the gate-records automation
  -- already reads ref_categories(domain='curfew_window'); ops_rules is the
  -- authoritative source and ref_categories is a cached snapshot.
  ('curfew_window','in_time',NULL,'{"start":"20:00","end":"21:30"}', '00000000-0000-4000-8000-000000000001'),
  ('curfew_window','grace',NULL,'{"start":"21:30","end":"22:00"}', '00000000-0000-4000-8000-000000000001'),
  ('curfew_window','breach',NULL,'{"start":"22:00","end":"23:59"}', '00000000-0000-4000-8000-000000000001'),
  -- Mess meal cutoff (minutes before closes_at when token issuance locks)
  ('mess_meal_cutoff','minutes',NULL,'{"before_close_min":30}', '00000000-0000-4000-8000-000000000001'),
  -- Attendance minimums
  ('attendance_min_pct','default',NULL,'{"pct":75}', '00000000-0000-4000-8000-000000000001'),
  -- Confirmation chains per entity (used by the unified Confirmations panel;
  -- the hostel-vs-academic segregation is validated by the shared chain guard).
  ('confirmation_chain','class_session',NULL,'{"stages":[{"role":"faculty"}]}', '00000000-0000-4000-8000-000000000001'),
  ('confirmation_chain','gate_pass_resident',NULL,'{"stages":[{"role":"guardian"},{"role":"deputy_warden"},{"role":"supervisor"}]}', '00000000-0000-4000-8000-000000000001'),
  ('confirmation_chain','gate_pass_day',NULL,'{"stages":[{"role":"guardian"},{"role":"admin"}]}', '00000000-0000-4000-8000-000000000001'),
  ('confirmation_chain','exam_result',NULL,'{"stages":[{"role":"exam_branch"},{"role":"controller_examinations"}],"two_person":true}', '00000000-0000-4000-8000-000000000001'),
  ('confirmation_chain','mess_bill',NULL,'{"stages":[{"role":"mess_incharge"},{"role":"hostel_manager"},{"role":"admin"}]}', '00000000-0000-4000-8000-000000000001'),
  ('confirmation_chain','marks_entry',NULL,'{"stages":[{"role":"faculty"},{"role":"hod"}]}', '00000000-0000-4000-8000-000000000001'),
  ('confirmation_chain','hostel_room_allot',NULL,'{"stages":[{"role":"hostel_manager"}]}', '00000000-0000-4000-8000-000000000001'),
  -- Notification scope → broadcast-role grants
  ('notification_scope','global',NULL,'{"roles":["principal","admin"]}', '00000000-0000-4000-8000-000000000001'),
  ('notification_scope','dept',NULL,'{"roles":["hod","dean"]}', '00000000-0000-4000-8000-000000000001'),
  ('notification_scope','hostel',NULL,'{"roles":["hostel_manager","chief_warden","deputy_warden"],"own_block_only":true}', '00000000-0000-4000-8000-000000000001'),
  ('notification_scope','class',NULL,'{"roles":["faculty","hod"],"own_class_only":true}', '00000000-0000-4000-8000-000000000001'),
  ('notification_scope','mess',NULL,'{"roles":["mess_incharge","hostel_manager","admin"]}', '00000000-0000-4000-8000-000000000001')
ON CONFLICT (domain, rule_key, scope, effective_from) DO NOTHING;

COMMIT;
