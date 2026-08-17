-- Migration 0008: Change gates table ID from UUID to TEXT
-- The app uses string IDs like "gate-1" but schema expects UUIDs
-- Step 1: Drop RLS policies on gates (required before column type change)
ALTER TABLE gates DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Operators can view their assigned gates" ON gates;
DROP POLICY IF EXISTS "Admins can view all gates" ON gates;

-- Step 2: Drop foreign key constraints referencing gates.id
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_gate_id_fkey;
ALTER TABLE gate_logs DROP CONSTRAINT IF EXISTS gate_logs_gate_id_fkey;

-- Step 3: Change column types from UUID to TEXT
ALTER TABLE gates ALTER COLUMN id TYPE TEXT;
ALTER TABLE users ALTER COLUMN gate_id TYPE TEXT;
ALTER TABLE gate_logs ALTER COLUMN gate_id TYPE TEXT;

-- Step 4: Recreate foreign key constraints
ALTER TABLE users ADD CONSTRAINT users_gate_id_fkey FOREIGN KEY (gate_id) REFERENCES gates(id);
ALTER TABLE gate_logs ADD CONSTRAINT gate_logs_gate_id_fkey FOREIGN KEY (gate_id) REFERENCES gates(id);

-- Step 5: Re-enable RLS and recreate basic policies
ALTER TABLE gates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gates_select_auth" ON gates FOR SELECT TO authenticated USING (true);
CREATE POLICY "gates_all_service" ON gates FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Step 6: Insert default gates
INSERT INTO gates (id, name, location, type, is_active)
VALUES
  ('gate-1', 'Gate 1 (Main)', 'Main Entrance', 'main', true),
  ('gate-2', 'Gate 2 (Hostel)', 'Hostel Side', 'hostel', true),
  ('gate-3', 'Gate 3 (Back Gate)', 'Back Side', 'back', false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  location = EXCLUDED.location,
  type = EXCLUDED.type,
  is_active = EXCLUDED.is_active;