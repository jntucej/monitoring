import { hash } from "bcryptjs";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";

const users = [
  { id:'80eb29e3-7e71-48cb-a44c-6e0caa7f83f5', uid:'SYSADMIN', name:'System Admin', role:'sysadmin', email:'sysadmin@college.edu', pwd:'Sysadmin@123', pin:'nf16' },
  { id:'a0eb29e3-7e71-48cb-a44c-6e0caa7f83f1', uid:'ADMIN', name:'Campus Admin', role:'admin', email:'admin@college.edu', pwd:'Admin@123', pin:'123456' },
  { id:'b0eb29e3-7e71-48cb-a44c-6e0caa7f83f2', uid:'VICE_PRINCIPAL', name:'Vice Principal', role:'warden', email:'viceprincipal@college.edu', pwd:'VicePrincipal@123', pin:'123456' },
  { id:'c0eb29e3-7e71-48cb-a44c-6e0caa7f83f3', uid:'HOD', name:'Head of Department', role:'hod', email:'hod@college.edu', pwd:'Hod@123', pin:'123456' },
  { id:'d0eb29e3-7e71-48cb-a44c-6e0caa7f83f4', uid:'OIE', name:'OIE Officer', role:'admin', email:'oie@college.edu', pwd:'OIE@123', pin:'123456' },
  { id:'e0eb29e3-7e71-48cb-a44c-6e0caa7f83f5', uid:'EXAM_BRANCH', name:'Exam Branch', role:'staff', email:'exam@college.edu', pwd:'ExamBranch@123', pin:'123456' },
  { id:'f0eb29e3-7e71-48cb-a44c-6e0caa7f83f6', uid:'FACULTY', name:'Faculty Member', role:'faculty', email:'faculty@college.edu', pwd:'faculty123', pin:'123456' },
  { id:'01eb29e3-7e71-48cb-a44c-6e0caa7f83f7', uid:'STAFF', name:'Office Staff', role:'staff', email:'staff@college.edu', pwd:'staff123', pin:'123456' },
  { id:'02eb29e3-7e71-48cb-a44c-6e0caa7f83f8', uid:'WARDEN', name:'Hostel Warden', role:'warden', email:'warden@college.edu', pwd:'Warden@123', pin:'123456' },
  { id:'03eb29e3-7e71-48cb-a44c-6e0caa7f83f9', uid:'DEPUTY_WARDEN', name:'Deputy Warden', role:'warden', email:'deputywarden@college.edu', pwd:'DeputyWarden@123', pin:'123456' },
  { id:'04eb29e3-7e71-48cb-a44c-6e0caa7f8400', uid:'HOSTEL_MANAGER', name:'Hostel Manager', role:'warden', email:'hostelmanager@college.edu', pwd:'HostelManager@123', pin:'123456' },
  { id:'05eb29e3-7e71-48cb-a44c-6e0caa7f8401', uid:'MESS_INCHARGE', name:'Mess Incharge', role:'staff', email:'messincharge@college.edu', pwd:'MessIncharge@123', pin:'123456' },
  { id:'06eb29e3-7e71-48cb-a44c-6e0caa7f8402', uid:'CARETAKER', name:'Caretaker', role:'staff', email:'caretaker@college.edu', pwd:'Caretaker@123', pin:'123456' },
  { id:'07eb29e3-7e71-48cb-a44c-6e0caa7f8403', uid:'SUPERVISOR', name:'Gate Supervisor', role:'supervisor', email:'supervisor@college.edu', pwd:'Supervisor@123', pin:'123456' },
  { id:'08eb29e3-7e71-48cb-a44c-6e0caa7f8404', uid:'OPERATOR', name:'Gate Operator', role:'operator', email:'operator@college.edu', pwd:'operator123', pin:'123456' },
  { id:'09eb29e3-7e71-48cb-a44c-6e0caa7f8405', uid:'JOHN.DOE', name:'John Doe', role:'operator', email:'john.doe@college.edu', pwd:'operator123', pin:'123456' },
  { id:'10eb29e3-7e71-48cb-a44c-6e0caa7f8406', uid:'STUDENT', name:'Demo Student', role:'student', email:'student@college.edu', pwd:'student123', pin:'123456' },
  { id:'11eb29e3-7e71-48cb-a44c-6e0caa7f8407', uid:'GUARDIAN', name:'Parent Guardian', role:'guardian', email:'guardian@college.edu', pwd:'Guardian@123', pin:'123456' },
  { id:'12eb29e3-7e71-48cb-a44c-6e0caa7f8408', uid:'VISITOR', name:'Demo Visitor', role:'visitor', email:'visitor@college.edu', pwd:'visitor123', pin:'123456' },
  { id:'13eb29e3-7e71-48cb-a44c-6e0caa7f8409', uid:'WORKER', name:'Demo Worker', role:'worker', email:'worker@college.edu', pwd:'worker123', pin:'123456' },
];

const rows = [];
for (const u of users) {
  const [ph, pinh] = await Promise.all([
    hash(u.pwd, 10),
    hash(u.pin, 10),
  ]);
  const comma = u === users[users.length - 1] ? "" : ",";
  rows.push(`  ('${u.id}', '${u.uid}', '${u.name}', '${u.role}', '${u.email}', 'ACTIVE', '${ph}', '${pinh}', false, false)${comma}`);
}

const sql = `-- Seed demo role accounts (bcrypt-hashed; regenerate with: node scripts/generate-seed-roles.mjs)
-- Non-destructive: ON CONFLICT (unique_id) DO NOTHING.
BEGIN;
INSERT INTO users (id, unique_id, name, role, email, status, password_hash, initial_pin_hash, two_factor_enabled, pin_must_change)
VALUES
${rows.join('\n')}
ON CONFLICT (unique_id) DO NOTHING;
COMMIT;
`;

writeFileSync('scripts/seed-roles.sql', sql, 'utf8');
console.log('Wrote scripts/seed-roles.sql with', users.length, 'users');
