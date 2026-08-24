/**
 * Full Campus Seed Script for Gate Monitor
 * Generates:
 *  - 4 Academic Years of Students (1st, 2nd, 3rd, 4th Year: 2025, 2024, 2023, 2022)
 *  - 70 Students per Year (280 Total Students) across EEE(02), ME(03), ECE(04), CSE(05), IT(12)
 *  - 35 Employees (5 HODs, 20 Faculty, 10 Staff/Workers) + 50 Guardians
 */
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("CRITICAL ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const DEPT = [
  { c: '02', s: 'EEE' }, { c: '03', s: 'ME' }, { c: '04', s: 'ECE' },
  { c: '05', s: 'CSE' }, { c: '12', s: 'IT' }
];

const NM = ['Amit', 'Raj', 'Vijay', 'Suresh', 'Ramesh', 'Dinesh', 'Mahesh', 'Arun', 'Kumar', 'Mani', 'Srinivas', 'Karthik', 'Nikhil', 'Rahul'];
const NF = ['Priya', 'Sneha', 'Pooja', 'Divya', 'Anjali', 'Kavitha', 'Lakshmi', 'Sita', 'Maya', 'Nandini', 'Keerthi', 'Harini', 'Swathi', 'Geetha'];
const SUR = ['Kumar', 'Reddy', 'Rao', 'Naidu', 'Singh', 'Devi', 'Yadav', 'Pillai', 'Sharma', 'Verma', 'Patel', 'Gupta'];

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const phone = () => '9' + String(randInt(100000000, 99999999)).padStart(9, '0');

async function main() {
  console.log('🚀 Generating Full Campus Dataset (280 Students across 4 Years + 35 Staff)');
  const defaultPinHash = await bcrypt.hash('12345678', 10);

  // Fetch existing users to maintain foreign key integrity
  const { data: existingUsers } = await supabase.from('users').select('id, unique_id');
  const userMap = new Map((existingUsers || []).map(u => [u.unique_id, u.id]));

  function getUserId(uniqueId) {
    if (userMap.has(uniqueId)) return userMap.get(uniqueId);
    const hash = require('crypto').createHash('md5').update('gm_user_' + uniqueId).digest('hex');
    const uuidStr = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
    userMap.set(uniqueId, uuidStr);
    return uuidStr;
  }

  const users = [];
  const studentDetails = [];
  const employeeDetails = [];
  const gates = [
    { id: 'a52afdfb-dbd5-42b8-b616-da9d99295100', gate_code: 'MAIN', name: 'Main Gate', location: 'Main Entrance', type: 'main', is_active: true },
    { id: '80efc275-d9b1-415d-b13a-caed784f3b22', gate_code: 'HOSTEL', name: 'Hostel Gate', location: 'Hostel Side', type: 'hostel', is_active: true },
    { id: 'a5a5c683-86cd-4f00-9e3d-e0b61b563e1f', gate_code: 'BACK', name: 'Back Gate', location: 'Back Side', type: 'back', is_active: false },
  ];

  // 1. System Accounts
  const sysRoles = [
    { unique_id: 'ADM-001', name: 'Dr. Principal (Admin)', role: 'admin', email: 'admin@jntuhcej.ac.in' },
    { unique_id: 'SUP-001', name: 'Chief Security Officer', role: 'supervisor', email: 'supervisor@jntuhcej.ac.in', supervised_gates: ['a52afdfb-dbd5-42b8-b616-da9d99295100', '80efc275-d9b1-415d-b13a-caed784f3b22', 'a5a5c683-86cd-4f00-9e3d-e0b61b563e1f'] },
    { unique_id: 'OP-001', name: 'Main Gate Operator Desk', role: 'operator', email: 'operator@jntuhcej.ac.in', gate_id: 'a52afdfb-dbd5-42b8-b616-da9d99295100' },
    { unique_id: 'WDN-001', name: 'Boys Hostel Warden', role: 'warden', email: 'warden.boys@jntuhcej.ac.in' },
    { unique_id: 'WDN-002', name: 'Girls Hostel Warden', role: 'warden', email: 'warden.girls@jntuhcej.ac.in' },
  ];

  sysRoles.forEach(r => {
    const uId = getUserId(r.unique_id);
    users.push({
      id: uId, unique_id: r.unique_id, name: r.name, role: r.role, status: 'ACTIVE', email: r.email,
      phone: phone(), photo_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(r.name)}`,
      qr_code: JSON.stringify({ uniqueId: r.unique_id, role: r.role }), initial_pin_hash: defaultPinHash,
      gate_id: r.gate_id || null, supervised_gates: r.supervised_gates || null
    });
  });

  // 2. Guardians (50 Accounts)
  const guardians = [];
  for (let g = 1; g <= 50; g++) {
    const gCode = `PAR-${String(g).padStart(3, '0')}`;
    const gId = getUserId(gCode);
    const gName = `${pick(NM)} ${pick(SUR)} (Parent)`;
    guardians.push({ id: gId });

    users.push({
      id: gId, unique_id: gCode, name: gName, role: 'guardian', status: 'ACTIVE', email: `parent${g}@example.com`,
      phone: phone(), photo_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(gName)}`,
      qr_code: JSON.stringify({ uniqueId: gCode, role: 'guardian' }), initial_pin_hash: defaultPinHash
    });
  }
  // 3. Students across 4 Years (70 per year batch = 280 Students Total)
  const batches = [
    { yearCode: '25', yearNum: 1, batchLabel: '2025-2029' },
    { yearCode: '24', yearNum: 2, batchLabel: '2024-2028' },
    { yearCode: '23', yearNum: 3, batchLabel: '2023-2027' },
    { yearCode: '22', yearNum: 4, batchLabel: '2022-2026' },
  ];

  batches.forEach(({ yearCode, yearNum, batchLabel }) => {
    for (let i = 1; i <= 70; i++) {
      const isMale = i % 2 === 0;
      const name = `${pick(isMale ? NM : NF)} ${pick(SUR)}`;
      const dept = DEPT[i % DEPT.length];
      const entryCode = (yearNum > 1 && i > 60) ? '5A' : '1A';
      const seqStr = String(((i - 1) % 14) + 1).padStart(2, '0');
      const roll = `${yearCode}JJ${entryCode}${dept.c}${seqStr}`;
      const uId = getUserId(roll);
      const parent = pick(guardians);

      users.push({
        id: uId, unique_id: roll, name, role: 'student', status: 'ACTIVE',
        email: `${roll.toLowerCase()}@student.jntuhcej.ac.in`, phone: phone(),
        photo_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
        qr_code: JSON.stringify({ uniqueId: roll, role: 'student' }), initial_pin_hash: defaultPinHash
      });

      const isHostel = i % 3 !== 0;
      studentDetails.push({
        user_id: uId, roll, year: yearNum, section: i % 2 === 0 ? 'A' : 'B', batch: batchLabel,
        student_type: isHostel ? (isMale ? 'HM' : 'HF') : (isMale ? 'DM' : 'DF'),
        hostel_block: isHostel ? (isMale ? (i % 2 === 0 ? 'Boys-A' : 'Boys-B') : (i % 2 === 0 ? 'Girls-A' : 'Girls-B')) : null,
        room_number: isHostel ? String(randInt(101, 420)) : null,
        hostel_curfew_time: isHostel ? (isMale ? '21:00' : '18:30') : null,
        guardian_id: parent.id
      });
    }
  });

  // 4. Employees (HODs, Faculty, Staff, Workers = 35 Total)
  DEPT.forEach((d) => {
    const hodEmpId = `HOD-${d.s}`;
    const hodId = getUserId(hodEmpId);
    const hodName = `Dr. ${pick(NM)} ${pick(SUR)} (HOD ${d.s})`;

    users.push({
      id: hodId, unique_id: hodEmpId, name: hodName, role: 'faculty', status: 'ACTIVE',
      email: `hod.${d.s.toLowerCase()}@jntuhcej.ac.in`, phone: phone(),
      photo_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(hodName)}`,
      qr_code: JSON.stringify({ uniqueId: hodEmpId, role: 'faculty' }), initial_pin_hash: defaultPinHash
    });

    employeeDetails.push({
      user_id: hodId, employee_id: hodEmpId, designation: 'Professor & HOD',
      joining_date: '2018-06-01', is_hod: true, department_id: d.c
    });

    for (let f = 1; f <= 4; f++) {
      const facEmpId = `FAC-${d.s}-${f}`;
      const facId = getUserId(facEmpId);
      const facName = `Dr. ${pick(NM)} ${pick(SUR)}`;

      users.push({
        id: facId, unique_id: facEmpId, name: facName, role: 'faculty', status: 'ACTIVE',
        email: `${facEmpId.toLowerCase()}@jntuhcej.ac.in`, phone: phone(),
        photo_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(facName)}`,
        qr_code: JSON.stringify({ uniqueId: facEmpId, role: 'faculty' }), initial_pin_hash: defaultPinHash
      });

      employeeDetails.push({
        user_id: facId, employee_id: facEmpId, designation: f <= 2 ? 'Associate Professor' : 'Assistant Professor',
        joining_date: '2020-08-15', is_hod: false, department_id: d.c
      });
    }
  });

  for (let s = 1; s <= 10; s++) {
    const stfCode = s <= 5 ? `STF-${String(s).padStart(3, '0')}` : `WRK-${String(s).padStart(3, '0')}`;
    const stfId = getUserId(stfCode);
    const stfName = `${pick(NM)} ${pick(SUR)}`;
    const stfRole = s <= 5 ? 'staff' : 'worker';

    users.push({
      id: stfId, unique_id: stfCode, name: stfName, role: stfRole, status: 'ACTIVE',
      email: `${stfCode.toLowerCase()}@jntuhcej.ac.in`, phone: phone(),
      photo_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(stfName)}`,
      qr_code: JSON.stringify({ uniqueId: stfCode, role: stfRole }), initial_pin_hash: defaultPinHash
    });

    employeeDetails.push({
      user_id: stfId, employee_id: stfCode, designation: s <= 5 ? 'Office Staff' : 'Maintenance Specialist',
      joining_date: '2021-01-10', is_hod: false, department_id: '00'
    });
  }

  console.log(`Generated ${users.length} Total Users (${studentDetails.length} Students across 4 Years, ${employeeDetails.length} Employees).`);

  await supabase.from('gates').upsert(gates, { onConflict: 'gate_code' });
  console.log('✅ Gates seeded.');

  for (let i = 0; i < users.length; i += 100) {
    const { error } = await supabase.from('users').upsert(users.slice(i, i + 100), { onConflict: 'unique_id' });
    if (error) console.error(`❌ Users insert error:`, error.message);
  }
  console.log('✅ Users seeded.');

  for (let i = 0; i < studentDetails.length; i += 100) {
    const { error } = await supabase.from('student_details').upsert(studentDetails.slice(i, i + 100), { onConflict: 'user_id' });
    if (error) console.error(`❌ Student details error:`, error.message);
  }
  console.log('✅ Student details seeded.');

  const { error: eErr } = await supabase.from('employee_details').upsert(employeeDetails, { onConflict: 'user_id' });
  if (eErr) console.error('❌ Employee details error:', eErr.message);
  else console.log('✅ Employee details seeded.');

  const studentPassUser = users.find(u => u.unique_id === '25JJ1A0503');
  if (studentPassUser) {
    const testPass = {
      id: 'dc711073-188e-4580-ac33-07214f950f4d',
      user_id: studentPassUser.id,
      roll: '25JJ1A0503',
      requester_name: studentPassUser.name,
      reason: 'Home Out',
      from_datetime: new Date(Date.now() - 3600000).toISOString(),
      to_datetime: new Date(Date.now() + 86400000 * 7).toISOString(),
      final_status: 'APPROVED',
      qr_code: 'MOCKQRA503'
    };
    await supabase.from('gate_passes').upsert([testPass], { onConflict: 'id' });
    console.log('✅ Active test gate pass seeded.');
  }

  console.log('\n🎉 FULL CAMPUS DATASET SEEDED SUCCESSFULLY!');
}

main().catch(err => { console.error(err); process.exit(1); });
