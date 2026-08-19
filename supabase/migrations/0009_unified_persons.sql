-- Migration: 0009_unified_persons.sql
-- Description: Unified Campus Access Management System schema transformation
-- Transforms student-only schema into unified `persons` schema supporting
-- students, faculty, staff, workers, visitors, and parents.

-- 1. Create person_type enum or check constraint
DO $$ BEGIN
    CREATE TYPE person_type_enum AS ENUM ('student', 'faculty', 'staff', 'worker', 'visitor', 'parent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Rename `students` table to `persons` table if students table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'students') AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'persons') THEN
        ALTER TABLE students RENAME TO persons;
    END IF;
END $$;

-- If persons table doesn't exist yet, create it
CREATE TABLE IF NOT EXISTS persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unique_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    person_type VARCHAR(20) NOT NULL DEFAULT 'student',
    department VARCHAR(50),
    designation VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(15),
    photo_url TEXT,
    qr_code TEXT,
    id_valid_until TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'active',
    visitor_host VARCHAR(100),
    visitor_purpose VARCHAR(200),
    checked_in_at TIMESTAMPTZ,
    checked_out_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist in persons table (if migrated from students table)
DO $$ 
BEGIN
    -- Add unique_id column if missing, copy roll to unique_id if roll exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='persons' AND column_name='unique_id') THEN
        ALTER TABLE persons ADD COLUMN unique_id VARCHAR(50);
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='persons' AND column_name='roll') THEN
            UPDATE persons SET unique_id = roll WHERE unique_id IS NULL;
        END IF;
        ALTER TABLE persons ALTER COLUMN unique_id SET NOT NULL;
        ALTER TABLE persons ADD CONSTRAINT persons_unique_id_key UNIQUE (unique_id);
    END IF;

    -- Add full_name column if missing, copy name to full_name if name exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='persons' AND column_name='full_name') THEN
        ALTER TABLE persons ADD COLUMN full_name VARCHAR(100);
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='persons' AND column_name='name') THEN
            UPDATE persons SET full_name = name WHERE full_name IS NULL;
        END IF;
        ALTER TABLE persons ALTER COLUMN full_name SET NOT NULL;
    END IF;

    -- Add person_type column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='persons' AND column_name='person_type') THEN
        ALTER TABLE persons ADD COLUMN person_type VARCHAR(20) NOT NULL DEFAULT 'student';
    END IF;

    -- Add photo_url column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='persons' AND column_name='photo_url') THEN
        ALTER TABLE persons ADD COLUMN photo_url TEXT;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='persons' AND column_name='photo') THEN
            UPDATE persons SET photo_url = photo WHERE photo_url IS NULL;
        END IF;
    END IF;

    -- Add designation column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='persons' AND column_name='designation') THEN
        ALTER TABLE persons ADD COLUMN designation VARCHAR(100);
    END IF;

    -- Add visitor fields if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='persons' AND column_name='visitor_host') THEN
        ALTER TABLE persons ADD COLUMN visitor_host VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='persons' AND column_name='visitor_purpose') THEN
        ALTER TABLE persons ADD COLUMN visitor_purpose VARCHAR(200);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='persons' AND column_name='checked_in_at') THEN
        ALTER TABLE persons ADD COLUMN checked_in_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='persons' AND column_name='checked_out_at') THEN
        ALTER TABLE persons ADD COLUMN checked_out_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='persons' AND column_name='created_at') THEN
        ALTER TABLE persons ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='persons' AND column_name='updated_at') THEN
        ALTER TABLE persons ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 3. Create `student_details` table
CREATE TABLE IF NOT EXISTS student_details (
    person_id UUID PRIMARY KEY REFERENCES persons(id) ON DELETE CASCADE,
    roll VARCHAR(20) UNIQUE NOT NULL,
    year INTEGER,
    section VARCHAR(5),
    batch VARCHAR(10),
    parent_id UUID REFERENCES persons(id) ON DELETE SET NULL,
    student_type VARCHAR(5),
    hostel_block VARCHAR(10),
    room_number VARCHAR(10),
    hostel_curfew_time VARCHAR(10) DEFAULT '21:00',
    gender VARCHAR(10),
    warden_id UUID
);

-- Populate `student_details` from existing student rows in `persons` table if migrated
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='persons' AND column_name='roll') THEN
        INSERT INTO student_details (person_id, roll, year, section, batch, student_type, hostel_block, room_number, hostel_curfew_time, gender)
        SELECT 
            p.id, 
            p.roll, 
            p.year, 
            p.section, 
            p.batch, 
            p.student_type, 
            p.hostel_block, 
            p.room_number, 
            COALESCE(p.hostel_curfew_time, '21:00'),
            p.gender
        FROM persons p
        WHERE p.person_type = 'student' OR p.person_type IS NULL
        ON CONFLICT (person_id) DO NOTHING;
    END IF;
END $$;

-- 4. Create `employee_details` table
CREATE TABLE IF NOT EXISTS employee_details (
    person_id UUID PRIMARY KEY REFERENCES persons(id) ON DELETE CASCADE,
    employee_id VARCHAR(20) UNIQUE NOT NULL,
    designation VARCHAR(100),
    joining_date DATE,
    is_hod BOOLEAN DEFAULT FALSE,
    department_id VARCHAR(20)
);

-- 5. Create `visitor_logs` table
CREATE TABLE IF NOT EXISTS visitor_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    check_in_at TIMESTAMPTZ DEFAULT NOW(),
    check_out_at TIMESTAMPTZ,
    host_person_id UUID REFERENCES persons(id) ON DELETE SET NULL,
    purpose VARCHAR(200),
    status VARCHAR(20) DEFAULT 'active'
);

-- 6. Add person_id column to gate_logs if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gate_logs' AND column_name='person_id') THEN
        ALTER TABLE gate_logs ADD COLUMN person_id UUID REFERENCES persons(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gate_logs' AND column_name='person_type') THEN
        ALTER TABLE gate_logs ADD COLUMN person_type VARCHAR(20) DEFAULT 'student';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gate_logs' AND column_name='unique_id') THEN
        ALTER TABLE gate_logs ADD COLUMN unique_id VARCHAR(50);
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gate_logs' AND column_name='roll') THEN
            UPDATE gate_logs SET unique_id = roll WHERE unique_id IS NULL;
        END IF;
    END IF;
END $$;

-- 7. Create Indexes
CREATE INDEX IF NOT EXISTS idx_persons_unique_id ON persons(unique_id);
CREATE INDEX IF NOT EXISTS idx_persons_person_type ON persons(person_type);
CREATE INDEX IF NOT EXISTS idx_persons_status ON persons(status);
CREATE INDEX IF NOT EXISTS idx_persons_department ON persons(department);
CREATE INDEX IF NOT EXISTS idx_student_details_roll ON student_details(roll);
CREATE INDEX IF NOT EXISTS idx_employee_details_employee_id ON employee_details(employee_id);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_person_id ON visitor_logs(person_id);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_status ON visitor_logs(status);
CREATE INDEX IF NOT EXISTS idx_gate_logs_person_id ON gate_logs(person_id);
CREATE INDEX IF NOT EXISTS idx_gate_logs_unique_id ON gate_logs(unique_id);

-- 8. Enable Row Level Security
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_logs ENABLE ROW LEVEL SECURITY;

-- 9. Basic RLS Policies (Allow read/write for authenticated users)
CREATE POLICY "Allow public read persons" ON persons FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert persons" ON persons FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update persons" ON persons FOR UPDATE USING (true);

CREATE POLICY "Allow public read student_details" ON student_details FOR SELECT USING (true);
CREATE POLICY "Allow authenticated manage student_details" ON student_details FOR ALL USING (true);

CREATE POLICY "Allow public read employee_details" ON employee_details FOR SELECT USING (true);
CREATE POLICY "Allow authenticated manage employee_details" ON employee_details FOR ALL USING (true);

CREATE POLICY "Allow public read visitor_logs" ON visitor_logs FOR SELECT USING (true);
CREATE POLICY "Allow authenticated manage visitor_logs" ON visitor_logs FOR ALL USING (true);
