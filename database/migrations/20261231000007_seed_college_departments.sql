-- ============================================================================
-- Seed standard institutional departments for JNTUH UCEJ
-- Ensures all 9 degree-granting academic departments exist in public.departments
-- ============================================================================

INSERT INTO public.departments (id, name, code, numeric_code, short_name)
VALUES
  (gen_random_uuid(), 'Computer Science and Engineering', 'CSE', '05', 'CSE'),
  (gen_random_uuid(), 'Electronics and Communication Engineering', 'ECE', '04', 'ECE'),
  (gen_random_uuid(), 'Electrical and Electronics Engineering', 'EEE', '02', 'EEE'),
  (gen_random_uuid(), 'Mechanical Engineering', 'ME', '03', 'MECH'),
  (gen_random_uuid(), 'Information Technology', 'IT', '12', 'IT'),
  (gen_random_uuid(), 'Data Science and AI', 'DSCE', '06', 'DSCE'),
  (gen_random_uuid(), 'Cyber Security', 'CYS', 'A3', 'CYS'),
  (gen_random_uuid(), 'Electrical Power Systems', 'EPS', '07', 'EPS'),
  (gen_random_uuid(), 'Engineering Design', 'ED', '95', 'ED')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  numeric_code = EXCLUDED.numeric_code,
  short_name = EXCLUDED.short_name;
