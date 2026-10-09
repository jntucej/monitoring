-- Insert the SysAdmin user
INSERT INTO users (id, unique_id, name, role, email, status, initial_pin_hash)
VALUES (
  gen_random_uuid(),
  'nf61',
  'Junaid',
  'sysadmin',
  'sysadmin@college.edu',
  'ACTIVE',
  '$2b$10$e2CvPB3q0r2re6csXTCnXOIbA9vhphjD5wfvq5R4RSPHeXUur7cqS'
);
