-- Migration: Centralized Departments Table Enhancement
ALTER TABLE departments ADD COLUMN IF NOT EXISTS numeric_code TEXT UNIQUE;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS hod TEXT DEFAULT 'Not Assigned';

INSERT INTO departments (code, numeric_code, short_name, name, hod) VALUES
  ('CSE',   '01', 'CSE',   'Computer Science & Engineering',          'Dr. K. Sridhar'),
  ('EEE',   '02', 'EEE',   'Electrical & Electronics Engineering',    'Dr. K. Ramesh'),
  ('ME',    '03', 'ME',    'Mechanical Engineering',                  'Dr. R. Mahesh'),
  ('ECE',   '04', 'ECE',   'Electronics & Communication Engineering', 'Dr. M. Srinivas'),
  ('IT',    '12', 'IT',    'Information Technology',                  'Dr. P. Sreedhar'),
  ('CIVIL', '06', 'CIVIL', 'Civil Engineering',                       'Dr. A. Kumar')
ON CONFLICT (code) DO UPDATE
SET numeric_code = EXCLUDED.numeric_code,
    short_name   = EXCLUDED.short_name,
    name         = EXCLUDED.name,
    hod          = EXCLUDED.hod;

