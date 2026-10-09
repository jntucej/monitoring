const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { loadLocalEnv } = require('./lib/env-loader');

loadLocalEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_SEED_PIN = process.env.SEED_DEFAULT_PIN;

if (!DEFAULT_SEED_PIN || DEFAULT_SEED_PIN.length < 6) {
  console.error("Error: SEED_DEFAULT_PIN must be set and at least 6 digits.");
  process.exit(1);
}

if (!url || !key) {
  console.error("Error: Supabase credentials missing.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const ROLES_TO_SEED = [
  { role: 'sysadmin', name: 'System Admin' },
  { role: 'admin', name: 'Campus Admin' },
  { role: 'operator', name: 'Gate Operator' },
  { role: 'supervisor', name: 'Gate Supervisor' },
  { role: 'warden', name: 'Hostel Warden' },
  { role: 'hod', name: 'Head of Department' },
  { role: 'faculty', name: 'Faculty Member' },
  { role: 'staff', name: 'Office Staff' },
  { role: 'worker', name: 'Support Worker' },
  { role: 'guardian', name: 'Parent Guardian' },
  { role: 'student', name: 'Demo Student' },
  { role: 'visitor', name: 'Demo Visitor' },
];

async function main() {
  console.log('🌱 Seeding roles...');
  const pinHash = bcrypt.hashSync(DEFAULT_SEED_PIN, 10);
  
  // Note: Assuming users table exists and has these columns.
  // Using 'pin_hash' instead of 'password_hash' based on seed-data.js convention.
  const users = ROLES_TO_SEED.map(r => ({
    id: crypto.randomUUID(),
    unique_id: `DEMO-${r.role.toUpperCase()}`,
    name: r.name,
    role: r.role,
    email: `${r.role.toLowerCase()}@college.edu`,
    status: 'ACTIVE',
    initial_pin_hash: pinHash, 
  }));

  const { error } = await supabase.from('users').insert(users);
  if (error) {
    console.error('Error inserting users:', error);
  } else {
    console.log('✅ Roles seeded successfully.');
  }
}

main().catch(console.error);
