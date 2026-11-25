-- 20270131000004_gate_records_seeds.sql
--
-- Seeds the two control-plane tables created by 20270131000003:
--   * ref_categories        — the full premade taxonomy (all domains).
--   * gate_field_blueprints — the full role × gate_type × event_type matrix,
--                             each row carrying a record_target (the table the
--                             dispatcher writes to).
--
-- Idempotent: ON CONFLICT DO NOTHING. Safe to re-run on every migrate.
--
-- record_target map (event_type → target table):
--   movement / hostel_gate → movement_logs (universal person-scan log)
--   visitor                → visitor_logs
--   pass                   → gate_passes
--   exception              → gate_exceptions
--   security               → emergency_alerts  (fold, not a new table)
--   device                 → gate_device_events
--   shift                  → shift_handovers
--   vehicle                → vehicle_entries
--   exam_access            → exam_access_log

BEGIN;

-- ============================================================
-- ref_categories — the "premade, long-term scope" taxonomy
-- ============================================================
INSERT INTO public.ref_categories (domain, code, label, sort_order) VALUES
  ('visitor_category','parent','Parent',10),
  ('visitor_category','guardian','Local Guardian',20),
  ('visitor_category','vendor','Vendor',30),
  ('visitor_category','contractor','Contractor',40),
  ('visitor_category','government','Government Official',50),
  ('visitor_category','alumnus','Alumnus',60),
  ('visitor_category','guest','Guest',70),
  ('visitor_category','delivery','Delivery',80),
  ('id_document_type','aadhaar','Aadhaar',10),
  ('id_document_type','dl','Driving Licence',20),
  ('id_document_type','passport','Passport',30),
  ('id_document_type','pan','PAN',40),
  ('id_document_type','voter_id','Voter ID',50),
  ('id_document_type','employee_id','Employee ID',60),
  ('id_document_type','student_id','Student ID',70),
  ('id_document_type','other','Other',99),
  ('purpose_code','meet_student','Meet Student',10),
  ('purpose_code','meet_faculty','Meet Faculty',20),
  ('purpose_code','delivery','Delivery',30),
  ('purpose_code','maintenance','Maintenance',40),
  ('purpose_code','official','Official',50),
  ('purpose_code','event','Event',60),
  ('purpose_code','medical','Medical',70),
  ('purpose_code','emergency','Emergency',80),
  ('purpose_code','other','Other',90),
  ('verification_method','qr_scan','QR Scan',10),
  ('verification_method','rfid_card','RFID Card',20),
  ('verification_method','face_match','Face Match',30),
  ('verification_method','manual_entry','Manual Entry',40),
  ('verification_method','pass_qr','Pass QR',50),
  ('verification_method','biometric','Biometric',60),
  ('direction','IN','IN',10), ('direction','OUT','OUT',20), ('direction','NA','NA',30),
  ('exception_category','watchlist_hit','Watchlist Hit',10),
  ('exception_category','overstay','Overstay',20),
  ('exception_category','expired_pass','Expired Pass',30),
  ('exception_category','no_pass','No Pass',40),
  ('exception_category','curfew_breach','Curfew Breach',50),
  ('exception_category','duplicate_scan','Duplicate Scan',60),
  ('exception_category','device_error','Device Error',70),
  ('exception_category','wrong_gate','Wrong Gate',80),
  ('exception_category','unverified_person','Unverified Person',90),
  ('exception_category','unregistered_candidate','Unregistered Candidate',100),
  ('severity','low','Low',10), ('severity','medium','Medium',20),
  ('severity','high','High',30), ('severity','critical','Critical',40),
  ('resolution_action','allow','Allow',10), ('resolution_action','deny','Deny',20),
  ('resolution_action','hold','Hold',30), ('resolution_action','escalate','Escalate',40),
  ('resolution_action','correct','Correct',50), ('resolution_action','override','Override',60),
  ('security_event_type','lockdown_initiated','Lockdown Initiated',10),
  ('security_event_type','lockdown_cleared','Lockdown Cleared',20),
  ('security_event_type','emergency_alert','Emergency Alert',30),
  ('security_event_type','bomb_threat','Bomb Threat',40),
  ('security_event_type','fire','Fire',50),
  ('security_event_type','medical','Medical',60),
  ('security_event_type','evacuation','Evacuation',70),
  ('security_event_type','drill','Drill',80),
  ('scope','gate','Gate',10), ('scope','campus','Campus',20), ('scope','block','Block',30),
  ('fault_code','offline','Offline',10), ('fault_code','sensor_fault','Sensor Fault',20),
  ('fault_code','camera_fault','Camera Fault',30), ('fault_code','network_fault','Network Fault',40),
  ('fault_code','firmware_mismatch','Firmware Mismatch',50), ('fault_code','power_loss','Power Loss',60),
  ('vehicle_type','two_wheeler','Two Wheeler',10), ('vehicle_type','four_wheeler','Four Wheeler',20),
  ('vehicle_type','heavy','Heavy',30), ('vehicle_type','emergency','Emergency',40),
  ('vehicle_type','service','Service',50),
  ('leave_type','outpass','Outpass',10), ('leave_type','night_out','Night Out',20),
  ('leave_type','late_return','Late Return',30), ('leave_type','emergency_exit','Emergency Exit',40),
  ('handover_reason','regular','Regular',10), ('handover_reason','emergency','Emergency',20),
  ('handover_reason','relief','Relief',30), ('handover_reason','shift_change','Shift Change',40),
  ('gate_type','main','Main Gate',10), ('gate_type','hostel','Hostel Gate',20),
  ('gate_type','exam','Exam Hall Gate',30), ('gate_type','vehicle','Vehicle Gate',40),
  ('gate_type','service','Service Gate',50),
  ('exam_session_type','theory','Theory',10), ('exam_session_type','practical','Practical',20),
  ('exam_session_type','cbt','CBT',30), ('exam_session_type','viva','Viva',40),
  ('escalation_target','supervisor','Supervisor',10), ('escalation_target','admin','Admin',20),
  ('escalation_target','principal','Principal',30), ('escalation_target','oie','OIE',40),
  ('escalation_target','exam_superintendent','Exam Superintendent',50),
  ('escalation_target','chief_warden','Chief Warden',60)
ON CONFLICT (domain, code) DO NOTHING;

-- curfew_window rows carry metadata ({start,end} time windows the automation
-- reads), so they use the 5-column form.
INSERT INTO public.ref_categories (domain, code, label, sort_order, metadata) VALUES
  ('curfew_window','in_time','In Time',10, '{"start":"08:00","end":"09:30"}'),
  ('curfew_window','grace','Grace Period',20, '{"start":"09:30","end":"10:00"}'),
  ('curfew_window','breach','Breach',30, '{}')
ON CONFLICT (domain, code) DO UPDATE SET
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order,
  metadata = CASE
    WHEN ref_categories.metadata IS NULL OR ref_categories.metadata = '{}'::jsonb
    THEN EXCLUDED.metadata
    ELSE ref_categories.metadata
  END;

-- ============================================================
-- gate_field_blueprints — full role × gate_type × event_type matrix
--
-- Each row: (role, gate_type, event_type, context, field_key, label,
--           fill_mode, ref_domain, record_target, required, sort_order)
--
-- fill_mode legend:
--   auto     server-derived; client never supplies (UI shows read-only lock)
--   scan     operator scans/types an ID (subject, plate, candidate, pass QR)
--   premade  dropdown sourced from ref_categories(ref_domain)
--   capture  operator uses a widget (photo/signature/ID scan/plate)
--   required free-text the operator must fill
--   optional free-text, may be blank
--   derived  computed server-side from other fields
-- ============================================================

-- operator · main · movement  (record_target: movement_logs)
INSERT INTO public.gate_field_blueprints
  (role, gate_type, event_type, context, field_key, label, fill_mode, ref_domain, record_target, required, sort_order) VALUES
  ('operator','main','movement','default','subject_scan','Subject','scan',NULL,'movement_logs',true,10),
  ('operator','main','movement','default','verification_method','Verification','premade','verification_method','movement_logs',false,20),
  ('operator','main','movement','default','direction','Direction','auto',NULL,'movement_logs',false,30),
  ('operator','main','movement','default','purpose_code','Purpose','premade','purpose_code','movement_logs',false,40),
  ('operator','main','movement','default','photo_url','Photo','capture',NULL,'movement_logs',false,50),
  ('operator','main','movement','default','watchlist_hit','Watchlist Hit','derived',NULL,'movement_logs',false,60),
  ('operator','main','movement','default','curfew_violation','Curfew Violation','derived',NULL,'movement_logs',false,70),
  ('operator','main','movement','default','notes','Notes','optional',NULL,'movement_logs',false,80)
ON CONFLICT (role,gate_type,event_type,context,field_key,version) DO NOTHING;

-- operator · main · visitor  (record_target: visitor_logs)
INSERT INTO public.gate_field_blueprints
  (role, gate_type, event_type, context, field_key, label, fill_mode, ref_domain, record_target, required, sort_order) VALUES
  ('operator','main','visitor','default','visitor_name','Visitor Name','required',NULL,'visitor_logs',true,10),
  ('operator','main','visitor','default','visitor_phone','Phone','required',NULL,'visitor_logs',true,20),
  ('operator','main','visitor','default','visitor_category','Category','premade','visitor_category','visitor_logs',true,30),
  ('operator','main','visitor','default','id_document_type','ID Type','premade','id_document_type','visitor_logs',true,40),
  ('operator','main','visitor','default','id_number','ID Number','required',NULL,'visitor_logs',true,50),
  ('operator','main','visitor','default','host_lookup','Host','required',NULL,'visitor_logs',true,60),
  ('operator','main','visitor','default','purpose_code','Purpose','premade','purpose_code','visitor_logs',true,70),
  ('operator','main','visitor','default','expected_duration','Duration','premade',NULL,'visitor_logs',false,80),
  ('operator','main','visitor','default','vehicle_type','Vehicle','premade','vehicle_type','visitor_logs',false,90),
  ('operator','main','visitor','default','photo_url','Photo','capture',NULL,'visitor_logs',false,100),
  ('operator','main','visitor','default','badge_no','Badge #','auto',NULL,'visitor_logs',false,110),
  ('operator','main','visitor','default','host_ack_pending','Host ACK','derived',NULL,'visitor_logs',false,120)
ON CONFLICT (role,gate_type,event_type,context,field_key,version) DO NOTHING;

-- operator · main · pass  (record_target: gate_passes)
INSERT INTO public.gate_field_blueprints
  (role, gate_type, event_type, context, field_key, label, fill_mode, ref_domain, record_target, required, sort_order) VALUES
  ('operator','main','pass','default','pass_qr','Pass QR','scan',NULL,'gate_passes',true,10),
  ('operator','main','pass','default','pass_type','Pass Type','derived',NULL,'gate_passes',false,20),
  ('operator','main','pass','default','valid_from','Valid From','derived',NULL,'gate_passes',false,30),
  ('operator','main','pass','default','valid_to','Valid To','derived',NULL,'gate_passes',false,40),
  ('operator','main','pass','default','pass_status','Status','derived',NULL,'gate_passes',false,50),
  ('operator','main','pass','default','verification_result','Verification','premade','verification_method','gate_passes',false,60),
  ('operator','main','pass','default','override_reason','Override Reason','optional',NULL,'gate_passes',false,70)
ON CONFLICT (role,gate_type,event_type,context,field_key,version) DO NOTHING;

-- operator · main · exception  (record_target: gate_exceptions)
INSERT INTO public.gate_field_blueprints
  (role, gate_type, event_type, context, field_key, label, fill_mode, ref_domain, record_target, required, sort_order) VALUES
  ('operator','main','exception','default','exception_category','Category','premade','exception_category','gate_exceptions',true,10),
  ('operator','main','exception','default','severity','Severity','premade','severity','gate_exceptions',true,20),
  ('operator','main','exception','default','subject_ref','Subject','scan',NULL,'gate_exceptions',false,30),
  ('operator','main','exception','default','resolution_action','Resolution','premade','resolution_action','gate_exceptions',false,40),
  ('operator','main','exception','default','notes','Notes','optional',NULL,'gate_exceptions',false,50),
  ('operator','main','exception','default','escalate_to','Escalate To','derived',NULL,'gate_exceptions',false,60)
ON CONFLICT (role,gate_type,event_type,context,field_key,version) DO NOTHING;

-- operator · main · vehicle  (record_target: vehicle_entries)
INSERT INTO public.gate_field_blueprints
  (role, gate_type, event_type, context, field_key, label, fill_mode, ref_domain, record_target, required, sort_order) VALUES
  ('operator','main','vehicle','default','plate','Plate','scan',NULL,'vehicle_entries',true,10),
  ('operator','main','vehicle','default','vehicle_type','Type','premade','vehicle_type','vehicle_entries',true,20),
  ('operator','main','vehicle','default','purpose_code','Purpose','premade','purpose_code','vehicle_entries',false,30),
  ('operator','main','vehicle','default','photo_url','Photo','capture',NULL,'vehicle_entries',false,40),
  ('operator','main','vehicle','default','parking_slot','Parking Slot','derived',NULL,'vehicle_entries',false,50)
ON CONFLICT (role,gate_type,event_type,context,field_key,version) DO NOTHING;

-- operator · main · device  (record_target: gate_device_events)
INSERT INTO public.gate_field_blueprints
  (role, gate_type, event_type, context, field_key, label, fill_mode, ref_domain, record_target, required, sort_order) VALUES
  ('operator','main','device','default','device_id','Device','auto',NULL,'gate_device_events',false,10),
  ('operator','main','device','default','status','Status','auto',NULL,'gate_device_events',false,20),
  ('operator','main','device','default','fault_code','Fault','premade','fault_code','gate_device_events',true,30),
  ('operator','main','device','default','notes','Notes','optional',NULL,'gate_device_events',false,40)
ON CONFLICT (role,gate_type,event_type,context,field_key,version) DO NOTHING;

-- operator · main · shift  (record_target: shift_handovers)
INSERT INTO public.gate_field_blueprints
  (role, gate_type, event_type, context, field_key, label, fill_mode, ref_domain, record_target, required, sort_order) VALUES
  ('operator','main','shift','default','shift_id','Shift','auto',NULL,'shift_handovers',false,10),
  ('operator','main','shift','default','handover_to','Handover To','required',NULL,'shift_handovers',true,20),
  ('operator','main','shift','default','handover_reason','Reason','premade','handover_reason','shift_handovers',false,30),
  ('operator','main','shift','default','open_issues','Open Issues','required',NULL,'shift_handovers',true,40),
  ('operator','main','shift','default','scan_count','Scans','derived',NULL,'shift_handovers',false,50),
  ('operator','main','shift','default','exception_count','Exceptions','derived',NULL,'shift_handovers',false,60)
ON CONFLICT (role,gate_type,event_type,context,field_key,version) DO NOTHING;

-- operator · hostel · movement  (record_target: movement_logs)
INSERT INTO public.gate_field_blueprints
  (role, gate_type, event_type, context, field_key, label, fill_mode, ref_domain, record_target, required, sort_order) VALUES
  ('operator','hostel','movement','default','subject_scan','Subject','scan',NULL,'movement_logs',true,10),
  ('operator','hostel','movement','default','direction','Direction','auto',NULL,'movement_logs',false,20),
  ('operator','hostel','movement','default','curfew_window','Curfew Window','derived',NULL,'movement_logs',false,30),
  ('operator','hostel','movement','default','curfew_violation','Curfew Violation','derived',NULL,'movement_logs',false,40),
  ('operator','hostel','movement','default','photo_url','Photo','capture',NULL,'movement_logs',false,50)
ON CONFLICT (role,gate_type,event_type,context,field_key,version) DO NOTHING;

-- supervisor · main · exception  (record_target: gate_exceptions)
INSERT INTO public.gate_field_blueprints
  (role, gate_type, event_type, context, field_key, label, fill_mode, ref_domain, record_target, required, sort_order) VALUES
  ('supervisor','main','exception','default','exception_category','Category','premade','exception_category','gate_exceptions',true,10),
  ('supervisor','main','exception','default','severity','Severity','premade','severity','gate_exceptions',true,20),
  ('supervisor','main','exception','default','resolution_action','Resolution','premade','resolution_action','gate_exceptions',false,30),
  ('supervisor','main','exception','default','override_reason','Override','optional',NULL,'gate_exceptions',false,40),
  ('supervisor','main','exception','default','escalate_to','Escalate To','derived',NULL,'gate_exceptions',false,50)
ON CONFLICT (role,gate_type,event_type,context,field_key,version) DO NOTHING;

-- supervisor · main · security  (record_target: emergency_alerts — fold)
INSERT INTO public.gate_field_blueprints
  (role, gate_type, event_type, context, field_key, label, fill_mode, ref_domain, record_target, required, sort_order) VALUES
  ('supervisor','main','security','default','security_event_type','Type','premade','security_event_type','emergency_alerts',true,10),
  ('supervisor','main','security','default','scope','Scope','premade','scope','emergency_alerts',true,20),
  ('supervisor','main','security','default','authority','Authority','premade','escalation_target','emergency_alerts',false,30),
  ('supervisor','main','security','default','notes','Notes','required',NULL,'emergency_alerts',true,40),
  ('supervisor','main','security','default','initiated_at','Initiated','auto',NULL,'emergency_alerts',false,50)
ON CONFLICT (role,gate_type,event_type,context,field_key,version) DO NOTHING;

-- supervisor · main · shift  (record_target: shift_handovers)
INSERT INTO public.gate_field_blueprints
  (role, gate_type, event_type, context, field_key, label, fill_mode, ref_domain, record_target, required, sort_order) VALUES
  ('supervisor','main','shift','default','handover_to','Handover To','required',NULL,'shift_handovers',true,10),
  ('supervisor','main','shift','default','handover_reason','Reason','premade','handover_reason','shift_handovers',false,20),
  ('supervisor','main','shift','default','open_issues','Open Issues','required',NULL,'shift_handovers',true,30),
  ('supervisor','main','shift','default','open_exception_count','Open Exceptions','derived',NULL,'shift_handovers',false,40)
ON CONFLICT (role,gate_type,event_type,context,field_key,version) DO NOTHING;

-- deputy_warden · hostel · hostel_gate  (record_target: movement_logs)
INSERT INTO public.gate_field_blueprints
  (role, gate_type, event_type, context, field_key, label, fill_mode, ref_domain, record_target, required, sort_order) VALUES
  ('deputy_warden','hostel','hostel_gate','default','resident_id','Resident','scan',NULL,'movement_logs',true,10),
  ('deputy_warden','hostel','hostel_gate','default','block_id','Block','auto',NULL,'movement_logs',false,20),
  ('deputy_warden','hostel','hostel_gate','default','leave_type','Leave Type','premade','leave_type','movement_logs',false,30),
  ('deputy_warden','hostel','hostel_gate','default','purpose_code','Purpose','premade','purpose_code','movement_logs',false,40),
  ('deputy_warden','hostel','hostel_gate','default','expected_return','Expected Return','required',NULL,'movement_logs',true,50),
  ('deputy_warden','hostel','hostel_gate','default','curfew_compliance','Compliance','derived',NULL,'movement_logs',false,60),
  ('deputy_warden','hostel','hostel_gate','default','warden_notified','Warden Notified','derived',NULL,'movement_logs',false,70)
ON CONFLICT (role,gate_type,event_type,context,field_key,version) DO NOTHING;

-- deputy_warden · hostel · exception  (record_target: gate_exceptions)
INSERT INTO public.gate_field_blueprints
  (role, gate_type, event_type, context, field_key, label, fill_mode, ref_domain, record_target, required, sort_order) VALUES
  ('deputy_warden','hostel','exception','default','exception_category','Category','premade','exception_category','gate_exceptions',true,10),
  ('deputy_warden','hostel','exception','default','resolution_action','Resolution','premade','resolution_action','gate_exceptions',false,20),
  ('deputy_warden','hostel','exception','default','notes','Notes','optional',NULL,'gate_exceptions',false,30)
ON CONFLICT (role,gate_type,event_type,context,field_key,version) DO NOTHING;

-- exam_superintendent · exam · exam_access  (record_target: exam_access_log)
INSERT INTO public.gate_field_blueprints
  (role, gate_type, event_type, context, field_key, label, fill_mode, ref_domain, record_target, required, sort_order) VALUES
  ('exam_superintendent','exam','exam_access','default','candidate_id','Candidate','scan',NULL,'exam_access_log',true,10),
  ('exam_superintendent','exam','exam_access','default','session_id','Session','auto',NULL,'exam_access_log',false,20),
  ('exam_superintendent','exam','exam_access','default','hall_ticket_status','Hall Ticket','derived',NULL,'exam_access_log',false,30),
  ('exam_superintendent','exam','exam_access','default','eligibility_status','Eligibility','derived',NULL,'exam_access_log',false,40),
  ('exam_superintendent','exam','exam_access','default','exception_reason','Exception Reason','premade','exception_category','exam_access_log',false,50),
  ('exam_superintendent','exam','exam_access','default','allowed','Allowed','derived',NULL,'exam_access_log',false,60),
  ('exam_superintendent','exam','exam_access','default','exception_granted_by','Granted By','derived',NULL,'exam_access_log',false,70)
ON CONFLICT (role,gate_type,event_type,context,field_key,version) DO NOTHING;

-- oie · exam · exam_access  (record_target: exam_access_log)
INSERT INTO public.gate_field_blueprints
  (role, gate_type, event_type, context, field_key, label, fill_mode, ref_domain, record_target, required, sort_order) VALUES
  ('oie','exam','exam_access','default','candidate_id','Candidate','scan',NULL,'exam_access_log',true,10),
  ('oie','exam','exam_access','default','resolution_action','Resolution','premade','resolution_action','exam_access_log',false,20),
  ('oie','exam','exam_access','default','notes','Notes','optional',NULL,'exam_access_log',false,30)
ON CONFLICT (role,gate_type,event_type,context,field_key,version) DO NOTHING;

-- admin · main · security  (record_target: emergency_alerts; UUIDs masked by serializer)
INSERT INTO public.gate_field_blueprints
  (role, gate_type, event_type, context, field_key, label, fill_mode, ref_domain, record_target, required, sort_order) VALUES
  ('admin','main','security','default','security_event_type','Type','premade','security_event_type','emergency_alerts',true,10),
  ('admin','main','security','default','scope','Scope','premade','scope','emergency_alerts',true,20),
  ('admin','main','security','default','notes','Notes','required',NULL,'emergency_alerts',true,30)
ON CONFLICT (role,gate_type,event_type,context,field_key,version) DO NOTHING;

COMMIT;
