/**
 * Seed Script: Generate Dummy Unified Persons Data for Gate Monitor
 * Supports: students, faculty, staff, workers, visitors, parents.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=your-key node scripts/seed-data.js
 */

const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')

if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_PRODUCTION_SEED) {
  console.error('Refusing to seed database in production mode without ALLOW_PRODUCTION_SEED=1')
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceRoleKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required to run seed script.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const COLLEGE_CODE = 'JJ'
const DEPARTMENTS = [
  { code: '02', short: 'EEE', full: 'Electrical & Electronics Engineering' },
  { code: '03', short: 'ME',  full: 'Mechanical Engineering' },
  { code: '04', short: 'ECE', full: 'Electronics & Communication Engineering' },
  { code: '05', short: 'CSE', full: 'Computer Science & Engineering' },
  { code: '12', short: 'IT',  full: 'Information Technology' },
]

const FIRST_NAMES_MALE = ['Amit', 'Raj', 'Vijay', 'Suresh', 'Ramesh', 'Dinesh', 'Mahesh', 'Siddharth', 'Arun', 'Kumar', 'Mani', 'Srinivas', 'Venkatesh', 'Chandra', 'Ganesh']
const FIRST_NAMES_FEMALE = ['Priya', 'Sneha', 'Pooja', 'Divya', 'Anjali', 'Kavitha', 'Lakshmi', 'Sita', 'Maya', 'Nandini', 'Keerthi', 'Harini', 'Madhavi', 'Swathi']
const LAST_NAMES = ['Kumar', 'Raj', 'Reddy', 'Rao', 'Naidu', 'Singh', 'Devi', 'Yadav', 'Chandran', 'Pillai', 'Sharma', 'Verma', 'Patel']

const uuid = () => require('crypto').randomUUID()
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)]

function generatePhone() {
  const prefix = randomChoice(['9', '8', '7', '6'])
  return prefix + String(randomInt(100000000, 99999999)).padStart(9, '0')
}

async function hashPassword(password) {
  return await bcrypt.hash(password, 10)
}

async function generateSeedData() {
  const persons = []
  const studentDetails = []
  const employeeDetails = []
  const visitorLogs = []
  const users = []

  const gateRecords = [
    { id: 'gate-1', name: 'Gate 1 (Main)', location: 'Main Entrance', type: 'main', is_active: true },
    { id: 'gate-2', name: 'Gate 2 (Hostel)', location: 'Hostel Side', type: 'hostel', is_active: true },
    { id: 'gate-3', name: 'Gate 3 (Back Gate)', location: 'Back Side', type: 'back', is_active: false },
  ]

  const defaultPassword = await hashPassword('password123')

  // 1. Generate Students (100 sample students)
  for (let i = 1; i <= 100; i++) {
    const personId = uuid()
    const isMale = i % 2 === 0
    const firstName = randomChoice(isMale ? FIRST_NAMES_MALE : FIRST_NAMES_FEMALE)
    const lastName = randomChoice(LAST_NAMES)
    const fullName = `${firstName} ${lastName}`
    const dept = randomChoice(DEPARTMENTS)
    const roll = `24${COLLEGE_CODE}1A${dept.code}${String(i).padStart(2, '0')}`

    persons.push({
      id: personId,
      unique_id: roll,
      full_name: fullName,
      person_type: 'student',
      department: dept.short,
      email: `${roll.toLowerCase()}@student.jntuhcej.ac.in`,
      phone: generatePhone(),
      photo_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
      qr_code: JSON.stringify({ uniqueId: roll, personType: 'student' }),
      id_valid_until: '2028-06-30T23:59:59Z',
      status: 'active',
    })

    const isHosteler = i % 3 !== 0
    studentDetails.push({
      person_id: personId,
      roll: roll,
      year: randomInt(1, 4),
      section: randomChoice(['A', 'B', 'C']),
      batch: '2024-2028',
      student_type: isHosteler ? (isMale ? 'HM' : 'HF') : (isMale ? 'DM' : 'DF'),
      hostel_block: isHosteler ? (isMale ? 'Boys-A' : 'Girls-A') : null,
      room_number: isHosteler ? String(randomInt(101, 400)) : null,
      hostel_curfew_time: isHosteler ? (isMale ? '21:00' : '18:30') : null,
    })
  }

  // 2. Generate Faculty (20 faculty members)
  for (let i = 1; i <= 20; i++) {
    const personId = uuid()
    const isMale = i % 2 === 0
    const firstName = randomChoice(isMale ? FIRST_NAMES_MALE : FIRST_NAMES_FEMALE)
    const lastName = randomChoice(LAST_NAMES)
    const fullName = `Dr. ${firstName} ${lastName}`
    const dept = DEPARTMENTS[i % DEPARTMENTS.length]
    const empId = `FAC-${String(i).padStart(3, '0')}`

    persons.push({
      id: personId,
      unique_id: empId,
      full_name: fullName,
      person_type: 'faculty',
      department: dept.short,
      designation: i <= 5 ? 'Professor & HOD' : 'Assistant Professor',
      email: `faculty.${empId.toLowerCase()}@jntuhcej.ac.in`,
      phone: generatePhone(),
      photo_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
      qr_code: JSON.stringify({ uniqueId: empId, personType: 'faculty' }),
      status: 'active',
    })

    employeeDetails.push({
      person_id: personId,
      employee_id: empId,
      designation: i <= 5 ? 'Professor & HOD' : 'Assistant Professor',
      joining_date: '2020-01-15',
      is_hod: i <= 5,
      department_id: dept.code,
    })
  }

  // 3. Generate Staff (15 staff members)
  for (let i = 1; i <= 15; i++) {
    const personId = uuid()
    const firstName = randomChoice(FIRST_NAMES_MALE)
    const lastName = randomChoice(LAST_NAMES)
    const fullName = `${firstName} ${lastName}`
    const empId = `STF-${String(i).padStart(3, '0')}`

    persons.push({
      id: personId,
      unique_id: empId,
      full_name: fullName,
      person_type: 'staff',
      department: 'Administration',
      designation: 'Office Staff',
      email: `staff.${empId.toLowerCase()}@jntuhcej.ac.in`,
      phone: generatePhone(),
      photo_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
      qr_code: JSON.stringify({ uniqueId: empId, personType: 'staff' }),
      status: 'active',
    })

    employeeDetails.push({
      person_id: personId,
      employee_id: empId,
      designation: 'Office Staff',
      joining_date: '2021-06-01',
      is_hod: false,
      department_id: '00',
    })
  }

  // 4. Generate Workers (10 maintenance workers)
  for (let i = 1; i <= 10; i++) {
    const personId = uuid()
    const firstName = randomChoice(FIRST_NAMES_MALE)
    const lastName = randomChoice(LAST_NAMES)
    const fullName = `${firstName} ${lastName}`
    const wrkId = `WRK-${String(i).padStart(3, '0')}`

    persons.push({
      id: personId,
      unique_id: wrkId,
      full_name: fullName,
      person_type: 'worker',
      designation: 'Maintenance Specialist',
      phone: generatePhone(),
      photo_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
      qr_code: JSON.stringify({ uniqueId: wrkId, personType: 'worker' }),
      status: 'active',
    })
  }

  // 5. Generate Visitors (10 recent visitors)
  for (let i = 1; i <= 10; i++) {
    const personId = uuid()
    const firstName = randomChoice(FIRST_NAMES_FEMALE)
    const lastName = randomChoice(LAST_NAMES)
    const fullName = `${firstName} ${lastName}`
    const visId = `VIS-2026-${String(i).padStart(3, '0')}`

    persons.push({
      id: personId,
      unique_id: visId,
      full_name: fullName,
      person_type: 'visitor',
      email: `visitor${i}@example.com`,
      phone: generatePhone(),
      photo_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
      qr_code: JSON.stringify({ uniqueId: visId, personType: 'visitor' }),
      visitor_host: 'Dr. Principal',
      visitor_purpose: 'Official Campus Inspection',
      checked_in_at: new Date(Date.now() - 3600000 * i).toISOString(),
      status: 'active',
    })

    visitorLogs.push({
      id: uuid(),
      person_id: personId,
      check_in_at: new Date(Date.now() - 3600000 * i).toISOString(),
      purpose: 'Official Campus Inspection',
      status: i % 2 === 0 ? 'active' : 'completed',
    })
  }

  return { persons, studentDetails, employeeDetails, visitorLogs, gateRecords }
}

async function main() {
  console.log('=== Unified Campus Access Management Seed Script ===\n')

  const { persons, studentDetails, employeeDetails, visitorLogs, gateRecords } = await generateSeedData()

  console.log(`Generated ${persons.length} total persons:`)
  console.log(`  - Students: ${studentDetails.length}`)
  console.log(`  - Employees (Faculty/Staff): ${employeeDetails.length}`)
  console.log(`  - Visitor Logs: ${visitorLogs.length}`)
  console.log(`  - Gates: ${gateRecords.length}\n`)

  console.log('📤 Uploading gates...')
  await supabase.from('gates').upsert(gateRecords, { onConflict: 'id' })

  console.log('📤 Uploading persons...')
  const { error: pErr } = await supabase.from('persons').upsert(persons, { onConflict: 'unique_id' })
  if (pErr) console.error('❌ Error uploading persons:', pErr)
  else console.log('✅ Persons uploaded successfully')

  console.log('📤 Uploading student_details...')
  const { error: sErr } = await supabase.from('student_details').upsert(studentDetails, { onConflict: 'person_id' })
  if (sErr) console.error('❌ Error uploading student_details:', sErr)
  else console.log('✅ Student details uploaded successfully')

  console.log('📤 Uploading employee_details...')
  const { error: eErr } = await supabase.from('employee_details').upsert(employeeDetails, { onConflict: 'person_id' })
  if (eErr) console.error('❌ Error uploading employee_details:', eErr)
  else console.log('✅ Employee details uploaded successfully')

  console.log('📤 Uploading visitor_logs...')
  const { error: vErr } = await supabase.from('visitor_logs').upsert(visitorLogs, { onConflict: 'id' })
  if (vErr) console.error('❌ Error uploading visitor_logs:', vErr)
  else console.log('✅ Visitor logs uploaded successfully')

  console.log('\n=== Seed Completed Successfully ===')
}

main().catch(err => {
  console.error('Fatal error in seed script:', err)
  process.exit(1)
})
