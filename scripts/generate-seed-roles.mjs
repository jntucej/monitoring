// SECURITY: No plaintext credentials are generated or shipped by this script.
//
// ENV-VAR CONTRACT:
//   Each role account's password is read from a process.env variable:
//     ROLES_<ROLE>_PASSWORD   e.g. ROLES_SYSADMIN_PASSWORD, ROLES_ADMIN_PASSWORD
//   and its PIN from:
//     ROLES_<ROLE>_PIN        e.g. ROLES_SYSADMIN_PIN, ROLES_ADMIN_PIN
//
//   Role names are upper-cased and use the unique_id value (underscores kept).
//   If the variable is unset, a random 24-byte hex value (crypto.randomBytes)
//   is used as the fallback so no two runs produce the same credential and no
//   literal ever appears in this source file. The value is logged to stderr
//   (not to the generated SQL) so the operator can record it out-of-band.
//
// Run:  node scripts/generate-seed-roles.mjs
// Output: scripts/seed-roles.sql (bcrypt-hashed; ON CONFLICT DO NOTHING)

import { hash } from "bcryptjs";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { randomBytes } from "crypto";

// ── credential resolution ───────────────────────────────────────────────────
// For each user:
//   pwd = process.env[`ROLES_${ROLE}_PASSWORD`] ?? crypto random fallback
//   pin = process.env[`ROLES_${ROLE}_PIN`]      ?? crypto random fallback
// The role name in the env var key is the upper-cased unique_id.
function resolveCredential(envKey, label) {
  const fromEnv = process.env[envKey];
  if (fromEnv && fromEnv.length > 0) {
    return { value: fromEnv, source: "env" };
  }
  // Random fallback — never a literal in this file.
  const value = randomBytes(24).toString("hex");
  process.stderr.write(
    `[generate-seed-roles] WARNING: ${envKey} not set — using random fallback for ${label}. ` +
    `Record this value out-of-band. It will NOT be written to the generated SQL file.`
  );
  return { value, source: "random" };
}

// ── user table (no plaintext fields — credentials resolved at runtime) ─────
const users = [
  { id:'80eb29e3-7e71-48cb-a44c-6e0caa7f83f5', uid:'SYSADMIN',       name:'System Admin',          role:'sysadmin',   email:'sysadmin@college.edu',    envPwd:'ROLES_SYSADMIN_PASSWORD',         envPin:'ROLES_SYSADMIN_PIN' },
  { id:'a0eb29e3-7e71-48cb-a44c-6e0caa7f83f1', uid:'ADMIN',          name:'Campus Admin',          role:'admin',      email:'admin@college.edu',       envPwd:'ROLES_ADMIN_PASSWORD',            envPin:'ROLES_ADMIN_PIN' },
  { id:'b0eb29e3-7e71-48cb-a44c-6e0caa7f83f2', uid:'VICE_PRINCIPAL', name:'Vice Principal',        role:'vice_principal', email:'viceprincipal@college.edu', envPwd:'ROLES_VICE_PRINCIPAL_PASSWORD',   envPin:'ROLES_VICE_PRINCIPAL_PIN' },
  { id:'c0eb29e3-7e71-48cb-a44c-6e0caa7f83f3', uid:'HOD',            name:'Head of Department',    role:'hod',        email:'hod@college.edu',         envPwd:'ROLES_HOD_PASSWORD',              envPin:'ROLES_HOD_PIN' },
  { id:'d0eb29e3-7e71-48cb-a44c-6e0caa7f83f4', uid:'OIE',            name:'OIE Officer',           role:'admin',      email:'oie@college.edu',           envPwd:'ROLES_OIE_PASSWORD',              envPin:'ROLES_OIE_PIN' },
  { id:'e0eb29e3-7e71-48cb-a44c-6e0caa7f83f5', uid:'EXAM_BRANCH',    name:'Exam Branch',           role:'staff',      email:'exam@college.edu',          envPwd:'ROLES_EXAM_BRANCH_PASSWORD',      envPin:'ROLES_EXAM_BRANCH_PIN' },
  { id:'f0eb29e3-7e71-48cb-a44c-6e0caa7f83f6', uid:'FACULTY',        name:'Faculty Member',        role:'faculty',    email:'faculty@college.edu',     envPwd:'ROLES_FACULTY_PASSWORD',          envPin:'ROLES_FACULTY_PIN' },
  { id:'01eb29e3-7e71-48cb-a44c-6e0caa7f83f7', uid:'STAFF',          name:'Office Staff',          role:'staff',      email:'staff@college.edu',         envPwd:'ROLES_STAFF_PASSWORD',            envPin:'ROLES_STAFF_PIN' },
  { id:'02eb29e3-7e71-48cb-a44c-6e0caa7f83f8', uid:'WARDEN',         name:'Hostel Warden',         role:'warden',     email:'warden@college.edu',        envPwd:'ROLES_WARDEN_PASSWORD',           envPin:'ROLES_WARDEN_PIN' },
  { id:'03eb29e3-7e71-48cb-a44c-6e0caa7f83f9', uid:'DEPUTY_WARDEN',  name:'Deputy Warden',         role:'warden',     email:'deputywarden@college.edu', envPwd:'ROLES_DEPUTY_WARDEN_PASSWORD',    envPin:'ROLES_DEPUTY_WARDEN_PIN' },
  { id:'04eb29e3-7e71-48cb-a44c-6e0caa7f8400', uid:'HOSTEL_MANAGER', name:'Hostel Manager',        role:'warden',     email:'hostelmanager@college.edu', envPwd:'ROLES_HOSTEL_MANAGER_PASSWORD',   envPin:'ROLES_HOSTEL_MANAGER_PIN' },
  { id:'05eb29e3-7e71-48cb-a44c-6e0caa7f8401', uid:'MESS_INCHARGE',  name:'Mess Incharge',         role:'staff',      email:'messincharge@college.edu', envPwd:'ROLES_MESS_INCHARGE_PASSWORD',    envPin:'ROLES_MESS_INCHARGE_PIN' },
  { id:'06eb29e3-7e71-48cb-a44c-6e0caa7f8402', uid:'CARETAKER',      name:'Caretaker',             role:'staff',      email:'caretaker@college.edu',     envPwd:'ROLES_CARETAKER_PASSWORD',        envPin:'ROLES_CARETAKER_PIN' },
  { id:'07eb29e3-7e71-48cb-a44c-6e0caa7f8403', uid:'SUPERVISOR',     name:'Gate Supervisor',       role:'supervisor', email:'supervisor@college.edu',  envPwd:'ROLES_SUPERVISOR_PASSWORD',       envPin:'ROLES_SUPERVISOR_PIN' },
  { id:'08eb29e3-7e71-48cb-a44c-6e0caa7f8404', uid:'OPERATOR',       name:'Gate Operator',         role:'operator',   email:'operator@college.edu',    envPwd:'ROLES_OPERATOR_PASSWORD',         envPin:'ROLES_OPERATOR_PIN' },
  { id:'09eb29e3-7e71-48cb-a44c-6e0caa7f8405', uid:'JOHN.DOE',       name:'John Doe',              role:'operator',   email:'john.doe@college.edu',    envPwd:'ROLES_JOHNDoe_PASSWORD',          envPin:'ROLES_JOHNDoe_PIN' },
  { id:'10eb29e3-7e71-48cb-a44c-6e0caa7f8406', uid:'STUDENT',        name:'Demo Student',          role:'student',    email:'student@college.edu',     envPwd:'ROLES_STUDENT_PASSWORD',          envPin:'ROLES_STUDENT_PIN' },
  { id:'11eb29e3-7e71-48cb-a44c-6e0caa7f8407', uid:'GUARDIAN',       name:'Parent Guardian',       role:'guardian',   email:'guardian@college.edu',    envPwd:'ROLES_GUARDIAN_PASSWORD',         envPin:'ROLES_GUARDIAN_PIN' },
  { id:'12eb29e3-7e71-48cb-a44c-6e0caa7f8408', uid:'VISITOR',        name:'Demo Visitor',          role:'visitor',    email:'visitor@college.edu',     envPwd:'ROLES_VISITOR_PASSWORD',          envPin:'ROLES_VISITOR_PIN' },
  { id:'13eb29e3-7e71-48cb-a44c-6e0caa7f8409', uid:'WORKER',         name:'Demo Worker',           role:'worker',     email:'worker@college.edu',      envPwd:'ROLES_WORKER_PASSWORD',           envPin:'ROLES_WORKER_PIN' },
];

// ── generate SQL ──────────────────────────────────────────────────────────────
const rows = [];
for (const u of users) {
  // Resolve credentials at runtime — no literals in source.
  const { value: pwd, source: pwdSrc } = resolveCredential(u.envPwd, `${u.uid} password`);
  const { value: pin, source: pinSrc } = resolveCredential(u.envPin, `${u.uid} pin`);

  const [ph, pinh] = await Promise.all([
    hash(pwd, 10),
    hash(pin, 10),
  ]);

  // Log source for audit (never log the value itself).
  process.stderr.write(
    `[generate-seed-roles] ${u.uid}: pwd=${pwdSrc === "env" ? "env:" + u.envPwd : "random-fallback"}, pin=${pinSrc === "env" ? "env:" + u.envPin : "random-fallback"}\n`
  );

  const comma = u === users[users.length - 1] ? "" : ",";
  rows.push(`  ('${u.id}', '${u.uid}', '${u.name}', '${u.role}', '${u.email}', 'ACTIVE', '${ph}', '${pinh}', false)${comma}`);
}

const sql = `-- SECURITY: No plaintext credentials in this file. All passwords/PINs must be rotated out-of-band before or after seeding. See docs/CREDENTIALS.md.
-- Generated by: node scripts/generate-seed-roles.mjs
-- Credentials sourced from ROLES_<ROLE>_PASSWORD / ROLES_<ROLE>_PIN env vars.
-- Non-destructive: ON CONFLICT (unique_id) DO NOTHING.
BEGIN;
INSERT INTO users (id, unique_id, name, role, email, status, password_hash, initial_pin_hash, pin_must_change)
VALUES
${rows.join('\n')}
ON CONFLICT (unique_id) DO NOTHING;
COMMIT;
`;

writeFileSync('scripts/seed-roles.sql', sql, 'utf8');
console.log(`Wrote scripts/seed-roles.sql with ${users.length} users`);
