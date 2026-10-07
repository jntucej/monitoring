const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { loadLocalEnv } = require('./lib/env-loader');

loadLocalEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_SEED_PIN = process.env.SEED_DEFAULT_PIN || crypto.randomBytes(4).toString('hex');
if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") { console.error("Refusing to seed in prod"); process.exit(1); }

if (!url || !key) {
  console.error("Required NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const NM = ['Amit', 'Raj', 'Vijay', 'Suresh', 'Ramesh', 'Dinesh', 'Mahesh', 'Arun', 'Kumar', 'Mani', 'Srinivas', 'Karthik', 'Nikhil', 'Rahul'];
const SUR = ['Kumar', 'Reddy', 'Rao', 'Naidu', 'Singh', 'Devi', 'Yadav', 'Pillai', 'Sharma', 'Verma', 'Patel', 'Gupta'];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function genUUID(seed) {
  const hash = crypto.createHash('md5').update(seed).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

async function main() {
  console.log('🌱 Seeding initial campus database records...');
  const pinHash = bcrypt.hashSync(DEFAULT_SEED_PIN, 10);

  const STAFF_RANGES = [
    { start: 1, end: 20, type: 'faculty', designation: 'Regular Faculty', dept: 'CSE' },
    { start: 21, end: 40, type: 'faculty', designation: 'Assistant Professor', dept: 'ECE' },
    { start: 41, end: 60, type: 'staff', designation: 'Technical Assistant', dept: 'IT' },
    { start: 61, end: 80, type: 'worker', designation: 'Gate Security Guard', dept: 'SEC' },
  ];

  const usersToUpsert = [];
  const employeesToUpsert = [];

  for (const range of STAFF_RANGES) {
    for (let i = range.start; i <= range.end; i++) {
      const staffId = `EMP${String(i).padStart(4, '0')}`;
      const userId = genUUID(`emp_${staffId}`);
      const userName = `${pick(NM)} ${pick(SUR)}`;

      usersToUpsert.push({
        id: userId,
        unique_id: staffId,
        name: userName,
        role: range.type,
        email: `${staffId.toLowerCase()}@college.edu`,
        status: 'ACTIVE',
        department_id: range.dept,
        initial_pin_hash: pinHash,
      });

      employeesToUpsert.push({
        user_id: userId,
        employee_id: staffId,
        designation: range.designation,
        joining_date: '2021-01-10',
        is_hod: (i === 1),
        department_id: range.dept,
      });
    }
  }

  const { error: uErr } = await supabase.from('users').upsert(usersToUpsert, { onConflict: 'id' });
  if (uErr) console.error('Error seeding staff users:', uErr);

  const { error: eErr } = await supabase.from('employee_details').upsert(employeesToUpsert, { onConflict: 'user_id' });
  if (eErr) console.error('Error seeding employee details:', eErr);

  console.log('✅ Seeding completed successfully.');
}

main().catch(console.error);
