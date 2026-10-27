#!/usr/bin/env psql
-- Re-seed test users for migration 20261227000002 testing.
-- Run: docker exec -i gate_postgres psql -U postgres -d gate_monitor < scripts/seed-test-users.sql

BEGIN;

INSERT INTO users (id, name, email, role, unique_id, status,
                   password_hash, pin_hash, initial_pin_hash,
                   created_at, updated_at)
VALUES
  (gen_random_uuid(), 'Seed Student A', 'seed.a@example.com',   'student', '23JJ1A0201', 'ACTIVE',
   '$2b$10$seeded', '$2b$10$seeded', '$2b$10$seeded', NOW(), NOW()),
  (gen_random_uuid(), 'Seed Student B', 'seed.b@example.com',   'student', '24JJ1A0501', 'ACTIVE',
   '$2b$10$seeded', '$2b$10$seeded', '$2b$10$seeded', NOW(), NOW()),
  (gen_random_uuid(), 'Seed Student C', 'seed.c@example.com',   'student', '24JJ1D0501', 'ACTIVE',
   '$2b$10$seeded', '$2b$10$seeded', '$2b$10$seeded', NOW(), NOW()),
  (gen_random_uuid(), 'Seed Student D', 'seed.d@example.com',   'student', '25JJ5A1201', 'ACTIVE',
   '$2b$10$seeded', '$2b$10$seeded', '$2b$10$seeded', NOW(), NOW()),
  (gen_random_uuid(), 'Seed Student E', 'seed.e@example.com',   'student', '26JJ1A0501', 'ACTIVE',
   '$2b$10$seeded', '$2b$10$seeded', '$2b$10$seeded', NOW(), NOW())
ON CONFLICT (unique_id) DO NOTHING;

COMMIT;
SELECT 'seeded ' || count(*) || ' test users' FROM users WHERE email LIKE 'seed.%@example.com';
