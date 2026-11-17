-- 20270116000001_marks_exams_fees_library.sql
-- Phase 1 entity foundation for STEP 3 operations:
-- faculty marks entry + exam branch processing + student/parent views,
-- plus fee dues and library account tables.

BEGIN;

-- 1. Marks: faculty enter internal/external marks per student per subject.
CREATE TABLE IF NOT EXISTS public.marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id),
  class_id UUID,
  subject_code TEXT,
  exam_type TEXT NOT NULL CHECK (exam_type IN ('INTERNAL','EXTERNAL','CONTINUOUS')),
  academic_year INT NOT NULL,
  term TEXT,
  max_marks NUMERIC(6,2) NOT NULL DEFAULT 100,
  score NUMERIC(6,2),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SUBMITTED','LOCKED','PUBLISHED')),
  entered_by UUID REFERENCES public.users(id),
  submitted_at TIMESTAMPTZ,
  locked_by UUID,
  locked_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  correction_reason TEXT,
  corrected_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, subject_code, exam_type, academic_year, term)
);
CREATE INDEX IF NOT EXISTS idx_marks_student ON public.marks (student_id);
CREATE INDEX IF NOT EXISTS idx_marks_class ON public.marks (class_id, exam_type);
CREATE INDEX IF NOT EXISTS idx_marks_status ON public.marks (status);

GRANT SELECT, INSERT, UPDATE ON public.marks TO gate_app, admin, authenticated;
GRANT DELETE ON public.marks TO admin;

-- 2. Assignments: faculty create, students submit, faculty grade.
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL,
  faculty_id UUID NOT NULL REFERENCES public.users(id),
  title TEXT NOT NULL,
  description TEXT,
  due_at TIMESTAMPTZ,
  max_score NUMERIC(6,2) DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED','GRADED','CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_assignments_class ON public.assignments (class_id, status);

CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id),
  student_id UUID NOT NULL REFERENCES public.users(id),
  content TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  grade NUMERIC(6,2),
  feedback TEXT,
  graded_by UUID,
  graded_at TIMESTAMPTZ,
  UNIQUE (assignment_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON public.assignment_submissions (student_id);

GRANT SELECT, INSERT, UPDATE ON public.assignments, public.assignment_submissions TO gate_app, admin, authenticated;

-- 3. Study materials: faculty upload notes.
CREATE TABLE IF NOT EXISTS public.study_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL,
  faculty_id UUID NOT NULL REFERENCES public.users(id),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'PDF' CHECK (kind IN ('PDF','VIDEO','LINK','FOLDER','OTHER')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_materials_class ON public.study_materials (class_id, kind);
GRANT SELECT, INSERT ON public.study_materials TO gate_app, admin, authenticated;

-- 4. Mentoring: faculty mentor lists.
CREATE TABLE IF NOT EXISTS public.mentee_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES public.users(id),
  mentee_id UUID NOT NULL REFERENCES public.users(id),
  academic_year INT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','COMPLETED','TERMINATED')),
  assigned_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mentor_id, mentee_id, academic_year)
);
CREATE INDEX IF NOT EXISTS idx_mentees_mentor ON public.mentee_assignments (mentor_id, status);
GRANT SELECT, INSERT, UPDATE ON public.mentee_assignments TO gate_app, admin, authenticated;

-- 5. Exam scheduling: faculty propose internal exam dates, HOD approves.
CREATE TABLE IF NOT EXISTS public.internal_exam_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES public.users(id),
  class_id UUID,
  subject_code TEXT,
  proposed_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'PROPOSED' CHECK (status IN ('PROPOSED','APPROVED','REJECTED','SCHEDULED')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_iep_class ON public.internal_exam_proposals (class_id, status);
GRANT SELECT, INSERT, UPDATE ON public.internal_exam_proposals TO gate_app, admin, authenticated;

-- 6. Hall tickets: exam branch bulk generation (addl_controller_automation).
CREATE TABLE IF NOT EXISTS public.hall_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id TEXT NOT NULL,
  student_id UUID NOT NULL REFERENCES public.users(id),
  hall TEXT,
  seat_no TEXT,
  generated_by UUID,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('ISSUED','REPORTED','ABSENT','CANCELLED')),
  UNIQUE (exam_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_hall_tickets_exam ON public.hall_tickets (exam_id, hall);
GRANT SELECT, INSERT, UPDATE ON public.hall_tickets TO gate_app, admin, authenticated;

-- 7. Fee dues: student fee lifecycle (student + parent view).
CREATE TABLE IF NOT EXISTS public.fee_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id),
  fee_type TEXT NOT NULL,   -- SEMESTER, EXAM, LIBRARY, HOSTEL, OTHER
  amount NUMERIC(10,2) NOT NULL,
  paid NUMERIC(10,2) NOT NULL DEFAULT 0,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'DUE' CHECK (status IN ('DUE','PARTIAL','PAID','WAIVED')),
  receipt_no TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fees_student ON public.fee_items (student_id, status);
GRANT SELECT, INSERT, UPDATE ON public.fee_items TO gate_app, admin, authenticated;

-- 8. Library account: issue/return history per student.
CREATE TABLE IF NOT EXISTS public.library_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT,
  isbn TEXT,
  copies INT NOT NULL DEFAULT 1,
  shelf TEXT
);

CREATE TABLE IF NOT EXISTS public.library_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id),
  book_id UUID NOT NULL REFERENCES public.library_books(id),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  fine NUMERIC(8,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('ISSUED','RETURNED','OVERDUE','LOST'))
);
CREATE INDEX IF NOT EXISTS idx_lib_issues_student ON public.library_issues (student_id, status);
GRANT SELECT, INSERT, UPDATE ON public.library_books, public.library_issues TO gate_app, admin, authenticated;

-- 9. Scholarship status.
CREATE TABLE IF NOT EXISTS public.scholarships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id),
  scheme TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'APPLIED' CHECK (status IN ('APPLIED','APPROVED','DISBURSED','REJECTED','EXPIRED')),
  amount NUMERIC(10,2),
  academic_year INT,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scholarships_student ON public.scholarships (student_id, status);
GRANT SELECT, INSERT, UPDATE ON public.scholarships TO gate_app, admin, authenticated;

-- 10. Faculty leave / substitution requests.
CREATE TABLE IF NOT EXISTS public.faculty_leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES public.users(id),
  class_id UUID,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  reason TEXT,
  substitute_id UUID REFERENCES public.users(id),
  status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED','APPROVED','REJECTED','SUBSTITUTED','COMPLETED')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_flr_faculty ON public.faculty_leave_requests (faculty_id, status);
GRANT SELECT, INSERT, UPDATE ON public.faculty_leave_requests TO gate_app, admin, authenticated;

COMMIT;
