-- Migration 0008: Change gates table ID from UUID to TEXT
-- The application uses string IDs like "gate-1", "gate-2" but schema expects UUIDs

-- Step 1: Drop foreign key constraints that reference gates.id
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_gate_id_fkey;
ALTER TABLE gate_logs DROP CONSTRAINT IF EXISTS gate_logs_gate_id_fkey;

-- Step 2: Change gates.id column type from UUID to TEXT
ALTER TABLE gates ALTER COLUMN id TYPE TEXT;

-- Step 3: Change referencing columns to TEXT
ALTER TABLE users ALTER COLUMN gate_id TYPE TEXT;
ALTER TABLE gate_logs ALTER COLUMN gate_id TYPE TEXT;

-- Step 4: Recreate foreign key constraints
ALTER TABLE users ADD CONSTRAINT users_gate_id_fkey FOREIGN KEY (gate_id) REFERENCES gates(id);
ALTER TABLE gate_logs ADD CONSTRAINT gate_logs_gate_id_fkey FOREIGN KEY (gate_id) REFERENCES gates(id);

-- Step 5: Ensure gates table has proper data
INSERT INTO gatINSERT INTO gatINSERT INTO gatINSERT INTO gatINSERT INTO gatINSERT INTO gatINSERT INTO gatINSERT INTO gatINSERT INTO ('INSERT INTO gatINSERT INTO gatINSERT INTO gatINSERT Idary',INSERT INTO gatINSERT INTO gatINSERT INTO gatINSERT INTO gatINSERT INTO gatINSERT ONFINSERT INTO gatINSERT INTO gatINSERT INTO gatINSERT INTO gatINXCLUDED.location,
  type = EXCLUDED.type,
  is_active = EXCLUDED.is_active;
