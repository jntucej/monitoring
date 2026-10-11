-- Seed default reasons per workflow
INSERT INTO public.custom_reasons (code, label, workflow_type) VALUES
-- Hostel
('hostel_medical',       'Medical Emergency',      'hostel'),
('hostel_family',        'Family Emergency',       'hostel'),
('hostel_personal',      'Personal Work',          'hostel'),
('hostel_sports',        'Sports / Tournament',    'hostel'),
('hostel_academic',      'Academic Event',         'hostel'),
('hostel_festival',      'Festival / Home Visit',  'hostel'),
-- Exam
('exam_internship',      'Internship Letter',      'exam'),
('exam_bonafide',        'Bonafide Certificate',   'exam'),
('exam_transcript',      'Transcript Request',     'exam'),
('exam_memo',            'Memo Request',           'exam'),
('exam_leave',           'Exam Leave',             'exam'),
('exam_duplicate',       'Duplicate Marks Memo',   'exam'),
-- Memo (department)
('memo_leave',           'Leave Memo',             'memo'),
('memo_no_objection',    'No Objection Certificate','memo'),
('memo_recommendation',  'Recommendation Letter',  'memo'),
-- Staff leave
('staff_casual',         'Casual Leave',           'staff_leave'),
('staff_sick',           'Sick Leave',             'staff_leave'),
('staff_earned',         'Earned Leave',           'staff_leave'),
('staff_maternity',      'Maternity Leave',        'staff_leave'),
('staff_paternity',      'Paternity Leave',        'staff_leave'),
('staff_comp_off',       'Compensatory Off',       'staff_leave')
ON CONFLICT (code, workflow_type) DO NOTHING;
