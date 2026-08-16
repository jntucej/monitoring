-- Gate Monitoring System - Initial Schema Migration
-- This migration creates the foundational schema for the Gate Monitoring System

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- Create users table (base table for other relationships)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('operator', 'supervisor', 'admin', 'sysadmin', 'parent', 'student', 'warden')),
  employee_id TEXT,
  email TEXT,
  phone TEXT,
  gate_id UUID REFERENCES gates(id),
  pin TEXT,
  parent_id UUID REFERENCES users(id),
  supervised_gates TEXT[],
  assigned_hostel TEXT,
  is_hod BOOLEAN,
  department_id TEXT,
  can_view_gender TEXT[],
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LOCKED', 'SUSPENDED', 'DISABLED', 'DEPROVISIONED')),
  password_hash TEXT NOT NULL,
  pin_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create gates table (needed for user assignments)
CREATE TABLE gates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  type TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Create students table (needs users for parent relationships)
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  roll TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  year INTEGER NOT NULL,
  section TEXT NOT NULL,
  batch TEXT NOT NULL,
  photo TEXT,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  parent_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  parent_id UUID REFERENCES users(id),
  qr_code TEXT NOT NULL,
  id_valid_until TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL,
  student_type TEXT CHECK (student_type IN ('HM', 'HF', 'DM', 'DF')),
  gender TEXT CHECK (gender IN ('male', 'female')),
  hostel_block TEXT,
  room_number TEXT,
  hostel_curfew_time TEXT,
  warden_id UUID REFERENCES users(id)
);

-- Create campus_occupancy table (needs students)
CREATE TABLE campus_occupancy (
  student_id UUID PRIMARY KEY REFERENCES students(id),
  current_status TEXT NOT NULL CHECK (current_status IN ('IN', 'OUT')),
  last_gate_id UUID REFERENCES gates(id),
  last_log_id UUID REFERENCES gate_logs(id),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create gate_passes table (needs students and users)
CREATE TABLE gate_passes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id),
  roll TEXT NOT NULL,
  student_name TEXT NOT NULL,
  department TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('Home Out', 'Day Out', 'Leave', 'Regular')),
  from_datetime TIMESTAMPTZ NOT NULL,
  to_datetime TIMESTAMPTZ NOT NULL,
  description TEXT,
  requested_by_id UUID REFERENCES users(id),
  requested_by_name TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  parent_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (parent_status IN ('PENDING', 'APPROVED', 'REJECTED', 'APPROVED_PARENT', 'APPROVED_ADMIN', 'COMPLETED')),
  admin_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (admin_status IN ('PENDING', 'APPROVED', 'REJECTED', 'APPROVED_PARENT', 'APPROVED_ADMIN', 'COMPLETED')),
  final_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (final_status IN ('PENDING', 'APPROVED', 'REJECTED', 'APPROVED_PARENT', 'APPROVED_ADMIN', 'COMPLETED')),
  parent_comment TEXT,
  admin_comment TEXT,
  parent_approver_id UUID REFERENCES users(id),
  admin_approver_id UUID REFERENCES users(id),
  qr_code TEXT NOT NULL
);

-- Create gate_logs table (needs students, gates, users)
CREATE TABLE gate_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id),
  roll TEXT NOT NULL,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  year INTEGER NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('IN', 'OUT')),
  reason TEXT CHECK (reason IN ('Home Out', 'Day Out', 'Leave', 'Regular')),
  gate_id UUID NOT NULL REFERENCES gates(id),
  gate_name TEXT NOT NULL,
  operator_id UUID NOT NULL REFERENCES users(id),
  operator_name TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_manual BOOLEAN NOT NULL DEFAULT FALSE,
  is_correction BOOLEAN NOT NULL DEFAULT FALSE,
  original_scan_id UUID REFERENCES gate_logs(id),
  correction_reason TEXT
);

-- Create alerts table (needs gates, students)
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  gate_id UUID REFERENCES gates(id),
  student_roll TEXT REFERENCES students(roll),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id)
);

-- Create audit_logs table (needs users, gates)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  user_name TEXT NOT NULL,
  role TEXT NOT NULL,
  details TEXT NOT NULL,
  gate_id UUID REFERENCES gates(id),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_type TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create sessions table (needs users)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invalidated_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX idx_students_roll ON students(roll);
CREATE INDEX idx_gate_logs_timestamp ON gate_logs(timestamp);
CREATE INDEX idx_gate_logs_direction ON gate_logs(direction);
CREATE INDEX idx_gate_logs_gate_id ON gate_logs(gate_id);
CREATE INDEX idx_gate_logs_student_id ON gate_logs(student_id);
CREATE INDEX idx_gate_passes_student_id ON gate_passes(student_id);
CREATE INDEX idx_gate_passes_final_status ON gate_passes(final_status);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_employee_id ON users(employee_id);
CREATE INDEX idx_campus_occupancy_status ON campus_occupancy(current_status);