-- ============================================================================
-- db/migrations/seed_demo_operations.sql
-- Idempotent demo operations seed: permissions + alerts that populate the
-- console stage-queues (oie, exam_branch, vice_principal, principal, hod,
-- deputy_warden, hostel_manager, caretaker) so the dashboards render content.
--
-- DESIGN (per 2026-10-16 correction):
--   * Every permission row uses the DUMMY student (unique_id='STUDENT') for
--     both student_user_id and requester_user_id.
--   * The seeded role users (PRINCIPAL, VICE_PRINCIPAL, HOD, OIE,
--     EXAM_BRANCH, DEPUTY_WARDEN, HOSTEL_MANAGER, WARDEN, CARETAKER,
--     SUPERVISOR, ADMIN, SYSADMIN) appear ONLY inside stage_history JSONB
--     (who routed a ticket to which stage) and in alerts.raised_by.
--
-- IDEMPOTENT: permissions keyed by ticket_number (ON CONFLICT DO NOTHING).
--             alerts guarded by a NOT EXISTS on (title, message, gate_id).
-- Safe to re-run.
-- ============================================================================

-- Resolve genuine ids up front (no hard-coded UUIDs; re-run-proof).
DO $$
DECLARE
  v_student uuid;
  v_principal uuid;
  v_vp uuid;
  v_hod uuid;
  v_oie uuid;
  v_exam_branch uuid;
  v_deputy_warden uuid;
  v_hostel_manager uuid;
  v_warden uuid;
  v_caretaker uuid;
  v_supervisor uuid;
  v_admin uuid;
BEGIN
  SELECT id INTO v_student        FROM public.users WHERE unique_id='STUDENT';
  SELECT id INTO v_principal      FROM public.users WHERE unique_id='PRINCIPAL';
  SELECT id INTO v_vp             FROM public.users WHERE unique_id='VICE_PRINCIPAL';
  SELECT id INTO v_hod            FROM public.users WHERE unique_id='HOD';
  SELECT id INTO v_oie            FROM public.users WHERE unique_id='OIE';
  SELECT id INTO v_exam_branch    FROM public.users WHERE unique_id='EXAM_BRANCH';
  SELECT id INTO v_deputy_warden FROM public.users WHERE unique_id='DEPUTY_WARDEN';
  SELECT id INTO v_hostel_manager FROM public.users WHERE unique_id='HOSTEL_MANAGER';
  SELECT id INTO v_warden        FROM public.users WHERE unique_id='WARDEN';
  SELECT id INTO v_caretaker     FROM public.users WHERE unique_id='CARETAKER';
  SELECT id INTO v_supervisor    FROM public.users WHERE unique_id='SUPERVISOR';
  SELECT id INTO v_admin         FROM public.users WHERE unique_id='ADMIN';

  -- ──────────────────────────────────────────────────────────────────────
  -- PERMISSIONS — exam workflow
  -- student = dummy STUDENT for every row; stage_history = role users.
  -- ──────────────────────────────────────────────────────────────────────
  INSERT INTO public.permissions
    (id, ticket_number, workflow_type, requester_user_id, student_user_id,
     current_stage, status, priority, stage_history,
     branch, sla_deadline, from_date, to_date, reason, description)
  VALUES
    (gen_random_uuid(), 'EXAM-2026-0001', 'exam',
     v_student, v_student,
     'oie', 'PENDING', 'medium',
     jsonb_build_array(
       jsonb_build_object('stage','hod','at','2026-10-14T09:00:00Z','by',v_hod)
     ),
     'CSE', NOW() + INTERVAL '48 hours',
     '2026-11-02T00:00:00Z','2026-11-15T23:59:59Z',
     'exam_fee_payment', 'Regular exam fee challan submission'),

    (gen_random_uuid(), 'EXAM-2026-0002', 'exam',
     v_student, v_student,
     'oie', 'PENDING', 'high',
     jsonb_build_array(
       jsonb_build_object('stage','hod','at','2026-10-14T10:15:00Z','by',v_hod)
     ),
     'ECE', NOW() + INTERVAL '24 hours',
     '2026-11-02T00:00:00Z','2026-11-15T23:59:59Z',
     'certificate_request', 'Pass certificate issuance request'),

    (gen_random_uuid(), 'EXAM-2026-0003', 'exam',
     v_student, v_student,
     'exam_branch', 'PENDING', 'medium',
     jsonb_build_array(
       jsonb_build_object('stage','oie','at','2026-10-15T08:30:00Z','by',v_oie)
     ),
     'CSE', NOW() + INTERVAL '72 hours',
     '2026-11-02T00:00:00Z','2026-11-15T23:59:59Z',
     'transcript_request', 'Official transcript request for higher studies'),

    (gen_random_uuid(), 'EXAM-2026-0004', 'exam',
     v_student, v_student,
     'vice_principal', 'PENDING', 'medium',
     jsonb_build_array(
       jsonb_build_object('stage','exam_branch','at','2026-10-15T12:00:00Z','by',v_exam_branch)
     ),
     'CSE', NOW() + INTERVAL '36 hours',
     '2026-11-02T00:00:00Z','2026-11-15T23:59:59Z',
     'revaluation', 'Re-evaluation request for B.Tech core paper'),

    (gen_random_uuid(), 'EXAM-2026-0005', 'exam',
     v_student, v_student,
     'vice_principal', 'ESCALATED', 'high',
     jsonb_build_array(
       jsonb_build_object('stage','exam_branch','at','2026-10-15T14:20:00Z','by',v_exam_branch),
       jsonb_build_object('stage','vice_principal','at','2026-10-15T16:00:00Z','by',v_exam_branch)
     ),
     'ECE', NOW() + INTERVAL '12 hours',
     '2026-11-02T00:00:00Z','2026-11-15T23:59:59Z',
     'backlog_exam', 'Supplementary / backlog exam registration (urgent)'),

    (gen_random_uuid(), 'EXAM-2026-0006', 'exam',
     v_student, v_student,
     'principal', 'APPROVED', 'medium',
     jsonb_build_array(
       jsonb_build_object('stage','vice_principal','at','2026-10-13T09:00:00Z','by',v_vp)
     ),
     'CSE', NOW() - INTERVAL '48 hours',
     '2026-11-02T00:00:00Z','2026-11-15T23:59:59Z',
     'migration_cert', 'Migration certificate application'),

    (gen_random_uuid(), 'EXAM-2026-0007', 'exam',
     v_student, v_student,
     'principal', 'APPROVED', 'low',
     jsonb_build_array(
       jsonb_build_object('stage','vice_principal','at','2026-10-12T11:00:00Z','by',v_vp)
     ),
     'ECE', NOW() - INTERVAL '72 hours',
     '2026-11-02T00:00:00Z','2026-11-15T23:59:59Z',
     'exam_fee_payment', 'Exam fee payment clearance'),

    (gen_random_uuid(), 'EXAM-2026-0008', 'exam',
     v_student, v_student,
     'principal', 'REJECTED', 'medium',
     jsonb_build_array(
       jsonb_build_object('stage','vice_principal','at','2026-10-11T13:00:00Z','by',v_vp)
     ),
     'CSE', NOW() - INTERVAL '96 hours',
     '2026-11-02T00:00:00Z','2026-11-15T23:59:59Z',
     'certificate_request', 'Certificate request (documents incomplete)'),

    (gen_random_uuid(), 'EXAM-2026-0009', 'exam',
     v_student, v_student,
     'hod', 'PENDING', 'medium',
     '[]'::jsonb,
     'CSE', NOW() + INTERVAL '24 hours',
     '2026-11-02T00:00:00Z','2026-11-15T23:59:59Z',
     'revaluation', 'Re-evaluation request pending HOD review')
  ON CONFLICT (ticket_number) DO NOTHING;

  -- ──────────────────────────────────────────────────────────────────────
  -- PERMISSIONS — staff_leave workflow
  -- ──────────────────────────────────────────────────────────────────────
  INSERT INTO public.permissions
    (id, ticket_number, workflow_type, requester_user_id, student_user_id,
     current_stage, status, priority, stage_history,
     branch, sla_deadline, from_date, to_date, reason, description)
  VALUES
    (gen_random_uuid(), 'LEAVE-2026-0001', 'staff_leave',
     v_student, v_student,
     'hod', 'PENDING', 'medium',
     '[]'::jsonb,
     NULL, NOW() + INTERVAL '48 hours',
     '2026-10-20T09:00:00Z','2026-10-24T17:00:00Z',
     'casual_leave', 'Casual leave (family event)'),

    (gen_random_uuid(), 'LEAVE-2026-0002', 'staff_leave',
     v_student, v_student,
     'principal', 'PENDING', 'low',
     jsonb_build_array(
       jsonb_build_object('stage','hod','at','2026-10-14T15:00:00Z','by',v_hod)
     ),
     'CSE', NOW() + INTERVAL '96 hours',
     '2026-10-28T09:00:00Z','2026-10-30T17:00:00Z',
     'study_leave', 'Higher-studies conference leave'),

    (gen_random_uuid(), 'LEAVE-2026-0003', 'staff_leave',
     v_student, v_student,
     'principal', 'ESCALATED', 'high',
     jsonb_build_array(
       jsonb_build_object('stage','hod','at','2026-10-10T10:00:00Z','by',v_hod),
       jsonb_build_object('stage','principal','at','2026-10-12T09:00:00Z','by',v_hod)
     ),
     'ECE', NOW() + INTERVAL '24 hours',
     '2026-11-01T09:00:00Z','2026-11-05T17:00:00Z',
     'medical_leave', 'Extended medical leave (escalated for VP review)')
  ON CONFLICT (ticket_number) DO NOTHING;

  -- ──────────────────────────────────────────────────────────────────────
  -- PERMISSIONS — hostel workflow
  -- ──────────────────────────────────────────────────────────────────────
  INSERT INTO public.permissions
    (id, ticket_number, workflow_type, requester_user_id, student_user_id,
     current_stage, status, priority, stage_history,
     branch, sla_deadline, from_date, to_date, reason, description, hostel_scope)
  VALUES
    (gen_random_uuid(), 'HP-2026-0001', 'hostel',
     v_student, v_student,
     'deputy_warden', 'PENDING', 'medium',
     jsonb_build_array(
       jsonb_build_object('stage','caretaker','at','2026-10-15T09:00:00Z','by',v_caretaker)
     ),
     NULL, NOW() + INTERVAL '36 hours',
     '2026-10-17T18:00:00Z','2026-10-22T09:00:00Z',
     'home_visit', 'Home visit for 5 days', 'boys'),

    (gen_random_uuid(), 'HP-2026-0002', 'hostel',
     v_student, v_student,
     'hostel_manager', 'PENDING', 'medium',
     jsonb_build_array(
       jsonb_build_object('stage','deputy_warden','at','2026-10-15T10:30:00Z','by',v_deputy_warden)
     ),
     NULL, NOW() + INTERVAL '48 hours',
     '2026-10-18T18:00:00Z','2026-10-20T09:00:00Z',
     'medical_emergency', 'Medical-emergency outpass', 'boys'),

    (gen_random_uuid(), 'HP-2026-0003', 'hostel',
     v_student, v_student,
     'caretaker', 'PENDING', 'low',
     '[]'::jsonb,
     NULL, NOW() + INTERVAL '72 hours',
     '2026-10-19T18:00:00Z','2026-10-25T09:00:00Z',
     'family_emergency', 'Family-emergency outpass', 'girls'),

    (gen_random_uuid(), 'HP-2026-0004', 'hostel',
     v_student, v_student,
     'warden_or_principal', 'APPROVED', 'medium',
     jsonb_build_array(
       jsonb_build_object('stage','hostel_manager','at','2026-10-12T09:00:00Z','by',v_hostel_manager)
     ),
     NULL, NOW() - INTERVAL '24 hours',
     '2026-10-10T18:00:00Z','2026-10-14T09:00:00Z',
     'religious_event', 'Festival home visit', 'boys')
  ON CONFLICT (ticket_number) DO NOTHING;

  -- ──────────────────────────────────────────────────────────────────────
  -- PERMISSIONS — memo workflow (outpass-equivalent, feeds HOD queue)
  -- ──────────────────────────────────────────────────────────────────────
  INSERT INTO public.permissions
    (id, ticket_number, workflow_type, requester_user_id, student_user_id,
     current_stage, status, priority, stage_history,
     branch, sla_deadline, from_date, to_date, reason, description)
  VALUES
    (gen_random_uuid(), 'MEMO-2026-0001', 'memo',
     v_student, v_student,
     'hod', 'PENDING', 'low',
     '[]'::jsonb,
     NULL, NOW() + INTERVAL '48 hours',
     '2026-10-18T00:00:00Z','2026-10-18T00:00:00Z',
     'bonafide_cert', 'Bonafide certificate request'),

    (gen_random_uuid(), 'MEMO-2026-0002', 'memo',
     v_student, v_student,
     'principal', 'APPROVED', 'medium',
     jsonb_build_array(
       jsonb_build_object('stage','hod','at','2026-10-10T08:00:00Z','by',v_hod)
     ),
     NULL, NOW() - INTERVAL '48 hours',
     '2026-10-08T00:00:00Z','2026-10-08T00:00:00Z',
     'noc_request', 'No-Objection Certificate (internship)')
  ON CONFLICT (ticket_number) DO NOTHING;

  -- ──────────────────────────────────────────────────────────────────────
  -- ALERTS — 8 rows, mixed severity, real gate ids.  The raising role user
  -- is recorded in user_unique_id (the alerts table has no raised_by column;
  -- resolved_by is reserved for resolution).  Guarded by
  -- (title, message, gate_id) so re-runs do not duplicate.
  -- ──────────────────────────────────────────────────────────────────────
  INSERT INTO public.alerts (severity, title, message, gate_id, user_unique_id)
  SELECT v.severity, v.title, v.message, v.gate_id, v.raised_by
  FROM (VALUES
    ('critical', 'Main Gate Camera Offline',
     'Camera CAM-03 at Main Gate - Boys offline for 45 minutes.',
     (SELECT id FROM public.gates WHERE name='Main Gate - Boys' LIMIT 1)::uuid,
     'ADMIN'::text),
    ('critical', 'Unauthorised Exit at Girls Gate',
     'Exit scan at Girls Hostel Gate 1 with no valid pass on file.',
     (SELECT id FROM public.gates WHERE name='Girls Hostel Gate 1' LIMIT 1)::uuid,
     'SUPERVISOR'::text),
    ('high', 'Hostel Biometric Sensor Fault',
     'Biometric reader at Boys Hostel Gate 1 reporting intermittent faults.',
     (SELECT id FROM public.gates WHERE name='Boys Hostel Gate 1' LIMIT 1)::uuid,
     'CARETAKER'::text),
    ('medium', 'Exam Queue SLA Breach Imminent',
     'EXAM-2026-0005 at vice_principal stage is 4h from SLA breach.',
     NULL::uuid,
     'VICE_PRINCIPAL'::text),
    ('medium', 'Backlog Exam Registration Due',
     'Supplementary / backlog exam window closes in 3 days.',
     NULL::uuid,
     'OIE'::text),
    ('low', 'Scheduled Gate Maintenance',
     'Backup Gate scheduled for maintenance 02:00-04:00 tomorrow.',
     (SELECT id FROM public.gates WHERE name='Backup Gate' LIMIT 1)::uuid,
     'ADMIN'::text),
    ('low', 'Staff Clock-in Window',
     'Shift A staff clock-in window closes in 30 minutes.',
     NULL::uuid,
     'ADMIN'::text),
    ('low', 'Outpass Queue Backlog',
     '4 hostel outpass tickets pending at caretaker stage.',
     (SELECT id FROM public.gates WHERE name='Main Gate - Boys' LIMIT 1)::uuid,
     'CARETAKER'::text)
  ) AS v(severity, title, message, gate_id, raised_by)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.alerts a
    WHERE a.title = v.title
      AND a.message = v.message
      AND a.gate_id IS NOT DISTINCT FROM v.gate_id
  );

END $$;

-- ============================================================================
-- SUMMARY — verify row counts
-- ============================================================================
SELECT 'permissions' AS tbl, count(*) AS rows FROM public.permissions
UNION ALL
SELECT 'permissions_exam_pending', count(*) FROM public.permissions
  WHERE workflow_type='exam' AND status IN ('PENDING','ESCALATED')
UNION ALL
SELECT 'alerts', count(*) FROM public.alerts;
