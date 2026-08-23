/**
 * Seed Script: Generate Dummy Unified Users Data for Gate Monitor
 */
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hgdlaghzerrrgkhqpdvz.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnZGxhZ2h6ZXJycmdraHFwZHZ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc5NTA0MiwiZXhwIjoyMTAyMzcxMDQyfQ.U6OPFP84AmFIb2MgKHdCRAQo2cXRC5OAheVIm7OOkvk';

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const DEPARTMENTS = ['02', '03', '04', '05', '12'];
const NAMES_M = ['Amit', 'Raj', 'Vijay', 'Suresh', 'Ramesh', 'Dinesh', 'Mahesh', 'Arun'];
const NAMES_F = ['Priya', 'Sneha', 'Pooja', 'Divya', 'Anjali', 'Kavitha', 'Lakshmi'];
const SURNAMES = ['Kumar', 'Reddy', 'Rao', 'Naidu', 'Singh', 'Sharma', 'Patel'];

const uuid = () => require('crypto').randomUUID();
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const phone = () => '9' + String(randInt(100000000, 99999999)).padStart(9, '0');

async function seed() {
  console.log('=== Seeding Gate Monitor Dummy Data ===');
  const defaultPinHash = await bcrypt.hash('12345678', 10);
  
  const gates = [
    { gate_code: 'MAIN', name: 'Main Gate', location: 'Main Entrance', type: 'main', is_active: true },
    { gate_code: 'HOSTEL', name: 'Hostel Gate', location: 'Hostel Side', type: 'hostel', is_active: true },
    { gate_code: 'BACK', name: 'Back Gate', location: 'Back Side', type: 'back', is_active: false },
  ];

  const users = [
    { id: uuid(), unique_id: 'ADM-001', name: 'Admin User', role: 'admin' },
    { id: uuid(), unique_id: 'SUP-001', name: 'Supervisor User', role: 'supervisor' },
    { id: uuid(), unique_id: 'OP-001', name: 'Gate Operator', role: 'operator' },
  ].map(u => ({
    ...u, status: 'active', email: `${u.role}@jntuhcej.ac.in`, phone: phone(),
    photo_url: `https://api.dicebear.com/7.x/initials/svg?seed=${u.name}`,
    qr_code: JSON.stringify({ uniqueId: u.unique_id, role: u.role }), initial_pin_hash: defaultPinHash
  }));

  const studentDetails = [];
  for (let i = 1; i <= 30; i++) {
    const uId = uuid();
    const isMale = i % 2 === 0;
    const name = `${pick(isMale ? NAMES_M : NAMES_F)} ${pick(SURNAMES)}`;
    const roll = `24JJ1A${pick(DEPARTMENTS)}${String(i).padStart(2, '0')}`;
    
    users.push({
      id: uId, unique_id: roll, name, role: 'student', status: 'active',
      email: `${roll.toLowerCase()}@student.jntuhcej.ac.in`, phone: phone(),
      photo_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      qr_code: JSON.stringify({ uniqueId: roll, role: 'student' }), initial_pin_hash: defaultPinHash
    });

    const isHostel = i % 3 !== 0;
    studentDetails.push({
      user_id: uId, roll, year: randInt(1, 4), section: pick(['A', 'B']), batch: '2024-2028',
      student_type: isHostel ? (isMale ? 'HM' : 'HF') : (isMale ? 'DM' : 'DF'),
      hostel_block: isHostel ? (isMale ? 'Boys-A' : 'Girls-A') : null,
      room_number: isHostel ? String(randInt(101, 400)) : null,
      hostel_curfew_time: isHostel ? (isMale ? '21:00' : '18:30') : null
    });
  }

  const employeeDetails = [];
  for (let i = 1; i <= 10; i++) {
    const uId = uuid();
    const name = `Dr. ${pick(NAMES_M)} ${pick(SURNAMES)}`;
    const empId = `FAC-${String(i).padStart(3, '0')}`;

    users.push({
      id: uId, unique_id: empId, name, role: 'faculty', status: 'active',
      email: `faculty.${empId.toLowerCase()}@jntuhcej.ac.in`, phone: phone(),
      photo_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      qr_code: JSON.stringify({ uniqueId: empId, role: 'faculty' }), initial_pin_hash: defaultPinHash
    });

    employeeDetails.push({
      user_id: uId, employee_id: empId, designation: i <= 2 ? 'Professor & HOD' : 'Assistant Professor',
      joining_date: '2020-01-15', is_hod: i <= 2, department_id: pick(DEPARTMENTS)
    });
  }

  console.log(`Generated ${users.length} dummy users.`);

  await supabase.from('gates').upsert(gates, { onConflict: 'gate_code' });
  console.log('✅ Gates seeded');

  const { error: uErr } = await supabase.from('users').upsert(users, { onConflict: 'unique_id' });
  if (uErr) console.error('❌ Users error:', uErr.message);
  else console.log('✅ Users seeded');

  const { error: sErr } = await supabase.from('student_details').upsert(studentDetails, { onConflict: 'user_id' });
  if (sErr) console.error('❌ Student details error:', sErr.message);
  else console.log('✅ Student details seeded');

  const { error: eErr } = await supabase.from('employee_details').upsert(employeeDetails, { onConflict: 'user_id' });
  if (eErr) console.error('❌ Employee details error:', eErr.message);
  else console.log('✅ Employee details seeded');

  console.log('=== Dummy Data Seeding Complete ===');
}

seed().catch(err => { console.error(err); process.exit(1); });
