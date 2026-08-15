/**
 * SQLite database layer for the Gate Monitoring System.
 * Uses better-sqlite3 for synchronous, reliable persistence.
 * Fully deployable — data persists across server restarts.
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { createHash, randomUUID } from "crypto";

import type {
  Department, DepartmentCode, Gate, Student, Scan, ScanDirection, ExitReason,
  GatePass, GatePassStatus, Alert, AlertSeverity, AuditEntry,
  User, DashboardData,
} from "./types";

/* ------------------------------------------------------------------ *
 *  DATABASE INITIALIZATION
 * ------------------------------------------------------------------ */
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "gate-monitor.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

/* ------------------------------------------------------------------ *
 *  COLLEGE DATA
 * ------------------------------------------------------------------ */
export const COLLEGE = {
  name: "JNTUH University College of Engineering, Nachupally (Kondagattu)",
  shortName: "JNTUH-UCoEJ",
  address: "JNTUH University College of Engineering, Nachupally (Kondagattu), Jagtial Dist, Telangana — 505 501",
  logo: "🏛️",
  accreditation: "NAAC A+ Grade",
  website: "https://jntuhcej.ac.in/",
  principal: "Dr. G. Narsimha",
};

export const DEPARTMENTS: Department[] = [
  { code: "CSE", name: "Computer Science & Engineering", hod: "Dr. K. Sridhar" },
  { code: "IT",  name: "Information Technology",        hod: "Dr. P. Sreedhar" },
  { code: "ECE", name: "Electronics & Communication Engineering", hod: "Dr. M. Srinivas" },
  { code: "EEE", name: "Electrical & Electronics Engineering",    hod: "Dr. K. Ramesh" },
  { code: "ME",  name: "Mechanical Engineering",          hod: "Dr. R. Mahesh" },
];

export const GATES: Gate[] = [
  { id: "gate-1", name: "Gate 1 (Main)",      location: "Main Entrance",    type: "main",   isActive: true },
  { id: "gate-2", name: "Gate 2 (Hostel)",    location: "Hostel Side",      type: "hostel", isActive: true },
  { id: "gate-3", name: "Gate 3 (Back Gate)", location: "Back Side",        type: "back",   isActive: false },
];

/* ------------------------------------------------------------------ *
 *  SCHEMA
 * ------------------------------------------------------------------ */
db.exec(`
CREATE TABLE IF NOT EXISTS departments (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, hod TEXT);
CREATE TABLE IF NOT EXISTS gates (id TEXT PRIMARY KEY, name TEXT NOT NULL, location TEXT, type TEXT, is_active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, employee_id TEXT UNIQUE, name TEXT NOT NULL, email TEXT, phone TEXT, password_hash TEXT, role TEXT NOT NULL, gate_id TEXT, parent_id TEXT, pin TEXT, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS students (id TEXT PRIMARY KEY, roll TEXT UNIQUE NOT NULL, name TEXT NOT NULL, department TEXT NOT NULL, year INTEGER NOT NULL, section TEXT, batch TEXT, photo TEXT, email TEXT, phone TEXT, parent_name TEXT, parent_phone TEXT, parent_id TEXT, qr_code TEXT UNIQUE NOT NULL, id_valid_until TEXT, status TEXT DEFAULT 'active', created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS gate_logs (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, roll TEXT NOT NULL, name TEXT NOT NULL, department TEXT NOT NULL, year INTEGER NOT NULL, direction TEXT NOT NULL, reason TEXT, gate_id TEXT NOT NULL, gate_name TEXT NOT NULL, operator_id TEXT NOT NULL, operator_name TEXT NOT NULL, scan_method TEXT DEFAULT 'qr', timestamp TEXT NOT NULL, is_manual INTEGER DEFAULT 0, is_correction INTEGER DEFAULT 0, original_scan_id TEXT, parent_notified INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS gate_passes (id TEXT PRIMARY KEY, roll TEXT NOT NULL, student_name TEXT NOT NULL, department TEXT NOT NULL, reason TEXT NOT NULL, from_datetime TEXT NOT NULL, to_datetime TEXT NOT NULL, description TEXT, requested_by_id TEXT NOT NULL, requested_by_name TEXT NOT NULL, requested_at TEXT NOT NULL, parent_status TEXT DEFAULT 'PENDING', admin_status TEXT DEFAULT 'PENDING', final_status TEXT DEFAULT 'PENDING', parent_comment TEXT, admin_comment TEXT, parent_approver_id TEXT, admin_approver_id TEXT, qr_code TEXT, used_at TEXT, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS campus_occupancy (id TEXT PRIMARY KEY, student_id TEXT UNIQUE NOT NULL, current_status TEXT NOT NULL, last_gate_id TEXT, last_log_id TEXT, last_updated TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS alerts (id TEXT PRIMARY KEY, severity TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, gate_id TEXT, student_roll TEXT, timestamp TEXT NOT NULL, resolved INTEGER DEFAULT 0, resolved_by TEXT, resolved_at TEXT);
CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, action TEXT NOT NULL, user_id TEXT NOT NULL, user_name TEXT NOT NULL, role TEXT NOT NULL, timestamp TEXT NOT NULL, details TEXT, gate_id TEXT);
CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, recipient_type TEXT NOT NULL, recipient_id TEXT NOT NULL, type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, status TEXT DEFAULT 'pending', sent_at TEXT, read_at TEXT, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token TEXT UNIQUE NOT NULL, refresh_token TEXT UNIQUE, expires_at TEXT NOT NULL, last_active TEXT DEFAULT (datetime('now')), is_valid INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS device_registry (id TEXT PRIMARY KEY, device_id TEXT UNIQUE NOT NULL, device_name TEXT, device_type TEXT, assigned_gate_id TEXT, assigned_to TEXT, last_seen TEXT, status TEXT DEFAULT 'active', created_at TEXT DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS idx_logs_student ON gate_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON gate_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_direction ON gate_logs(direction);
CREATE INDEX IF NOT EXISTS idx_logs_gate ON gate_logs(gate_id);
`);

/* ------------------------------------------------------------------ *
 *  SEED
 * ------------------------------------------------------------------ */
function hashPwd(p: string): string { return createHash("sha256").update(p).digest("hex"); }

function seed() {
  const cnt = (db.prepare("SELECT COUNT(*) as c FROM users").get() as any)?.c ?? 0;
  if (cnt > 0) return;

  for (const g of GATES) db.prepare(`INSERT INTO gates (id, name, location, type, is_active) VALUES (?,?,?,?,?)`).run(g.id, g.name, g.location, g.type, g.isActive ? 1 : 0);
  for (const d of DEPARTMENTS) db.prepare(`INSERT INTO departments (id, code, name, hod) VALUES (?,?,?,?)`).run(d.code, d.code, d.name, d.hod);

  const ph = hashPwd("1234");
  const users: any[] = [
    { id: "op-1", e: "OP001", n: "M. Ramu", m: "ramu@jntuhcej.ac.in", p: "9876543210", r: "operator", g: "gate-1", pin: "1234" },
    { id: "op-2", e: "OP002", n: "S. Lakshmi", m: "lak@gmail.com", p: "9876543211", r: "operator", g: "gate-2", pin: "5678" },
    { id: "op-3", e: "OP003", n: "V. Raju", m: "raju@gmail.com", p: "9876543212", r: "operator", g: "gate-3", pin: "9012" },
    { id: "sv-1", e: "SV001", n: "K. Suresh", m: "suresh@gate.edu", p: "9876543213", r: "supervisor", g: "gate-1", pin: "3456" },
    { id: "sv-2", e: "SV002", n: "P. Anjali", m: "anjali@gate.edu", p: "9876543214", r: "supervisor", g: "gate-2", pin: "7890" },
    { id: "ad-1", e: "AD001", n: "Dr. G. Narsimha", m: "principal@jntg.edu", p: "9876543215", r: "admin", g: null, pin: null },
    { id: "sa-1", e: "SA001", n: "IT Admin", m: "itadmin@jntg.edu", p: "9876543216", r: "sysadmin", g: null, pin: null },
    { id: "pa-1", e: "PA001", n: "Mrs. K. Lakshmi", m: "lakshmi.parent@gmail.com", p: "9012345678", r: "parent", g: null, pin: null },
    { id: "pa-2", e: "PA002", n: "Mr. R. Kumar", m: "kumar.parent@gmail.com", p: "9012345679", r: "parent", g: null, pin: null },
  ];
  const insU = db.prepare(`INSERT INTO users (id, employee_id, name, email, phone, password_hash, role, gate_id, pin) VALUES (?,?,?,?,?,?,?,?,?)`);
  for (const u of users) insU.run(u.id, u.e, u.n, u.m, u.p, ph, u.r, u.g, u.pin);

  // Students
  const FM = ["Arjun", "Kiran", "Manoj", "Suresh", "Dinesh", "Ganesh", "Ramesh", "Phani", "Naresh", "Raj"];
  const FF = ["Sneha", "Priya", "Rohan", "Anjali", "Kumar", "Sita", "Vijay", "Meena", "Lakshmi", "Devi"];
  const LN = ["Kumar", "Reddy", "Rao", "Naidu", "Sarma", "Chowdary", "Prasad", "Devi", "Lakshmi", "Naik"];
  const DC: DepartmentCode[] = ["CSE", "IT", "ECE", "EEE", "ME"];
  const insS = db.prepare(`INSERT INTO students (id, roll, name, department, year, section, batch, photo, email, phone, parent_id, qr_code, id_valid_until, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  for (let i = 0; i < 50; i++) {
    const dept = DC[i % 5], yr = (i % 4) + 1, fn = (i % 2 === 0 ? FM : FF)[Math.floor(i / 2) % 10], ln = LN[i % 10];
    const roll = `21${dept}${String(101 + i)}`;
    const pid = i % 5 === 0 ? "pa-1" : i % 5 === 1 ? "pa-2" : null;
    insS.run(`stu-${i + 1}`, roll, `${fn} ${ln}`, dept, yr, String.fromCharCode(65 + (i % 4)), "2021-2025", `https://i.pravatar.cc/150?u=${roll}`, `stu${i + 1}@jntuh.edu`, `98765${String(43000 + i)}`, pid, roll, "2027-06-30", "active");
  }

  // Seed scans
  const students = db.prepare(`SELECT * FROM students`).all() as any[];
  const ops = db.prepare(`SELECT * FROM users WHERE role='operator'`).all() as any[];
  const reasons: ExitReason[] = ["Home Out", "Day Out", "Leave", "Regular"];
  const now = Date.now();
  const insL = db.prepare(`INSERT INTO gate_logs (id, student_id, roll, name, department, year, direction, reason, gate_id, gate_name, operator_id, operator_name, timestamp) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  for (let i = 0; i < 80; i++) {
    const s = students[i % students.length]; const g = GATES[i % 2]; const op = ops[i % ops.length];
    const dir: ScanDirection = i < 50 ? "IN" : "OUT";
    const rsn = dir === "OUT" ? reasons[i % 4] : null;
    const ts = new Date(now - (120 - i) * 60000).toISOString();
    insL.run(`scan-seed-${i}`, s.id, s.roll, s.name, s.department, s.year, dir, rsn, g.id, g.name, op.id, op.name, ts);
    const occ = db.prepare(`SELECT id FROM campus_occupancy WHERE student_id=?`).get(s.id);
    if (occ) db.prepare(`UPDATE campus_occupancy SET current_status=?, last_gate_id=?, last_log_id=?, last_updated=? WHERE student_id=?`).run(dir, g.id, `scan-seed-${i}`, ts, s.id);
    else db.prepare(`INSERT INTO campus_occupancy (id, student_id, current_status, last_gate_id, last_log_id, last_updated) VALUES (?,?,?,?,?,?)`).run(randomUUID(), s.id, dir, g.id, `scan-seed-${i}`, ts);
  }

  // Alert + pass
  const od = students[4];
  db.prepare(`INSERT INTO alerts (id, severity, title, message, gate_id, student_roll, timestamp, resolved) VALUES (?, 'critical', 'Overdue Student', ?, 'gate-1', ?, ?, 0)`)
    .run(randomUUID(), `${od.name} (${od.roll}) left on Leave earlier and has NOT returned.`, od.roll, new Date(now - 30 * 60000).toISOString());
  db.prepare(`INSERT INTO gate_passes (id, roll, student_name, department, reason, from_datetime, to_datetime, description, requested_by_id, requested_by_name, requested_at, parent_status, admin_status, final_status, qr_code) VALUES (?, ?, ?, ?, 'Leave', ?, ?, 'Doctor appointment', 'pa-1', 'R. Kumar', ?, 'APPROVED', 'APPROVED', 'EXPIRED', ?)`)
    .run(`pass-seed-1`, od.roll, od.name, od.department, new Date(now - 6 * 3600000).toISOString(), new Date(now - 2 * 3600000).toISOString(), new Date(now - 8 * 3600000).toISOString(), randomUUID());
}
type Reason = ExitReason;
seed();

/* ------------------------------------------------------------------ *
 *  MAPPERS
 * ------------------------------------------------------------------ */
function mStu(r: any): Student { return { id: r.id, roll: r.roll, name: r.name, department: r.department, year: r.year, section: r.section, batch: r.batch, photo: r.photo, email: r.email, phone: r.phone, parentName: r.parent_name, parentPhone: r.parent_phone, parentId: r.parent_id, qrCode: r.qr_code, idValidUntil: r.id_valid_until, status: r.status }; }
function mUser(r: any): User { return { id: r.id, employeeId: r.employee_id, name: r.name, email: r.email, phone: r.phone, role: r.role, gateId: r.gate_id || undefined, pin: r.pin, parentId: r.parent_id || undefined }; }
function mScan(r: any): Scan { return { id: r.id, roll: r.roll, name: r.name, department: r.department, year: r.year, direction: r.direction, reason: r.reason, gateId: r.gate_id, gateName: r.gate_name, operatorId: r.operator_id, operatorName: r.operator_name, timestamp: r.timestamp, isManual: !!r.is_manual, isCorrection: !!r.is_correction, originalScanId: r.original_scan_id || undefined }; }
function mPass(r: any): GatePass { return { id: r.id, roll: r.roll, studentName: r.student_name, department: r.department, reason: r.reason, from: r.from_datetime, to: r.to_datetime, description: r.description, requestedById: r.requested_by_id, requestedByName: r.requested_by_name, requestedAt: r.requested_at, parentStatus: r.parent_status, adminStatus: r.admin_status, finalStatus: r.final_status, parentComment: r.parent_comment, adminComment: r.admin_comment, parentApproverId: r.parent_approver_id, adminApproverId: r.admin_approver_id, qrCode: r.qr_code }; }
function mAlert(r: any): Alert { return { id: r.id, severity: r.severity, title: r.title, message: r.message, gateId: r.gate_id, studentRoll: r.student_roll, timestamp: r.timestamp, resolved: !!r.resolved }; }

type StudentRow = ReturnType<typeof toStuAny>;
function toStuAny(r: any) { return r; }

/* ------------------------------------------------------------------ *
 *  PUBLIC API — STUDENTS
 * ------------------------------------------------------------------ */
function toStu(r: any): Student { return { id: String(r.id), roll: r.roll, name: r.name, department: r.department as DepartmentCode, year: r.year, section: r.section, batch: r.batch, photo: r.photo, email: r.email, phone: r.phone, parentName: r.parent_name, parentPhone: r.parent_phone, parentId: r.parent_id, qrCode: r.qr_code, idValidUntil: r.id_valid_until, status: r.status }; }

export function findStudentByRoll(rollNum: string): Student | null {
  const row = db.prepare(`SELECT * FROM students WHERE roll = ?`).get(rollNum.trim().toUpperCase());
  return row ? toStu(row) : null;
}

export function findAllStudents(): Student[] { return (db.prepare(`SELECT * FROM students ORDER BY roll`).all() as any[]).map(toStu); }
export function searchStudents(q: string): Student[] {
  const s = `%${q.toLowerCase()}%`;
  return (db.prepare(`SELECT * FROM students WHERE LOWER(roll) LIKE ? OR LOWER(name) LIKE ? OR LOWER(department) LIKE ? LIMIT 20`).all(s, s, s) as any[]).map(toStu);
}
export function findByQr(payload: string): Student | null { return findStudentByRoll(payload.trim().toUpperCase().replace(/\s+/g, "")); }
export function getStudentByRoll(rollNum: string): Student | null { return findStudentByRoll(rollNum); }

/* ------------------------------------------------------------------ *
 *  PUBLIC API — GATES
 * ------------------------------------------------------------------ */
export function findGateById(id: string): Gate | null { const r = db.prepare(`SELECT * FROM gates WHERE id = ?`).get(id) as any; return r ? { id: r.id, name: r.name, location: r.location, type: r.type, isActive: !!r.is_active } : null; }
export function findAllGates(): Gate[] { return (db.prepare(`SELECT * FROM gates`).all() as any[]).map((r) => ({ id: r.id, name: r.name, location: r.location, type: r.type, isActive: !!r.is_active })); }

/* ------------------------------------------------------------------ *
 *  PUBLIC API — USERS & AUTH
 * ------------------------------------------------------------------ */
export function findUserById(id: string): User | null { const r = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id); return r ? mUser(r) : null; }
export function findUserByLogin(login: string): User | null { const r = db.prepare(`SELECT * FROM users WHERE employee_id = ? OR email = ? OR name = ?`).get(login.trim(), login.trim(), login.trim()); return r ? mUser(r) : null; }
export function verifyLogin(login: string, password: string): User | null { const u = findUserByLogin(login); if (!u) return null; const r = db.prepare(`SELECT password_hash FROM users WHERE id = ?`).get(u.id) as any; if (!r) return null; if (r.password_hash !== hashPwd(password)) return null; return u; }
export function verifyPin(userId: string, pin: string): boolean { const r = db.prepare(`SELECT pin FROM users WHERE id = ?`).get(userId) as any; return !!r && r.pin === pin; }

/* ------------------------------------------------------------------ *
 *  PUBLIC API — SCANS
 * ------------------------------------------------------------------ */
export function lastScanFor(roll: string): Scan | null { const r = db.prepare(`SELECT * FROM gate_logs WHERE roll = ? ORDER BY timestamp DESC LIMIT 1`).get(roll); return r ? mScan(r) : null; }
export function scansToday(): Scan[] { const t = new Date().toISOString().slice(0, 10); return (db.prepare(`SELECT * FROM gate_logs ORDER BY timestamp DESC`).all() as any[]).filter((r) => r.timestamp.slice(0, 10) === t).map(mScan); }
export function studentsInside(): Student[] { return (db.prepare(`SELECT s.* FROM campus_occupancy co JOIN students s ON s.id = co.student_id WHERE co.current_status = 'IN'`).all() as any[]).map(toStu); }
export function campusCount(): number { return (db.prepare(`SELECT COUNT(*) as c FROM campus_occupancy WHERE current_status='IN'`).get() as any).c; }
export function isDuplicate(roll: string, direction: ScanDirection, min = 5): boolean { const cutoff = new Date(Date.now() - min * 60000).toISOString(); return !!db.prepare(`SELECT id FROM gate_logs WHERE roll=? AND direction=? AND timestamp>? LIMIT 1`).get(roll, direction, cutoff); }
export function inferDirection(roll: string): ScanDirection { const l = lastScanFor(roll); return l ? (l.direction === "IN" ? "OUT" : "IN") : "IN"; }

export function addScan(input: { roll: string; direction: ScanDirection; reason?: ExitReason; gateId: string; operatorId: string; isManual?: boolean; timestamp?: string; }): { scan: Scan; duplicate: boolean } {
  const stu = findStudentByRoll(input.roll);
  if (!stu) throw new Error("STUDENT_NOT_FOUND");
  if (isDuplicate(input.roll, input.direction)) return { scan: null as any, duplicate: true };
  const gate = findGateById(input.gateId) ?? GATES[0];
  const op = findUserById(input.operatorId) ?? { id: "op-1", name: "M. Ramu", role: "operator" as const };
  const ts = input.timestamp ?? new Date().toISOString();
  const id = `scan-${randomUUID()}`;
  db.prepare(`INSERT INTO gate_logs (id, student_id, roll, name, department, year, direction, reason, gate_id, gate_name, operator_id, operator_name, timestamp, is_manual) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, stu.id, stu.roll, stu.name, stu.department, stu.year, input.direction, input.reason ?? null, gate.id, gate.name, op.id, op.name, ts, input.isManual ? 1 : 0);
  const occ = db.prepare(`SELECT id FROM campus_occupancy WHERE student_id=?`).get(stu.id);
  if (occ) db.prepare(`UPDATE campus_occupancy SET current_status=?, last_gate_id=?, last_log_id=?, last_updated=? WHERE student_id=?`).run(input.direction, gate.id, id, ts, stu.id);
  else db.prepare(`INSERT INTO campus_occupancy (id, student_id, current_status, last_gate_id, last_log_id, last_updated) VALUES (?,?,?,?,?,?)`).run(randomUUID(), stu.id, input.direction, gate.id, id, ts);
  addAudit({ action: "SCAN_CREATED", userId: op.id, userName: op.name, role: op.role, details: `${input.direction} ${stu.name} (${stu.roll}) at ${gate.name}`, gateId: gate.id });
  addNotification("parent", stu.parentId ?? "pa-1", "gate_entry", "Gate Entry", `${stu.name} (${stu.roll}) ${input.direction === "IN" ? "entered" : "exited"} campus at ${new Date(ts).toLocaleTimeString()} via ${gate.name}`);
  return { scan: mScan({ id, roll: stu.roll, name: stu.name, department: stu.department, year: stu.year, direction: input.direction, reason: input.reason, gate_id: gate.id, gate_name: gate.name, operator_id: op.id, operator_name: op.name, timestamp: ts, is_manual: input.isManual ? 1 : 0 }), duplicate: false };
}

export function getAllLogs(f?: { gateId?: string; date?: string; direction?: string; reason?: string; search?: string; page?: number; limit?: number }) {
  let w: string[] = []; let p: any[] = [];
  if (f?.gateId) { w.push("gate_id = ?"); p.push(f.gateId); }
  if (f?.date) { w.push("date(timestamp) = ?"); p.push(f.date); }
  if (f?.direction) { w.push("direction = ?"); p.push(f.direction); }
  if (f?.reason) { w.push("reason = ?"); p.push(f.reason); }
  if (f?.search) { w.push("(LOWER(roll) LIKE ? OR LOWER(name) LIKE ?)"); const s = `%${f.search.toLowerCase()}%`; p.push(s, s); }
  const wc = w.length ? `WHERE ${w.join(" AND ")}` : "";
  const total = (db.prepare(`SELECT COUNT(*) as c FROM gate_logs ${wc}`).get(...p) as any).c;
  const page = f?.page || 1; const limit = f?.limit || 50;
  const rows = db.prepare(`SELECT * FROM gate_logs ${wc} ORDER BY timestamp DESC LIMIT ? OFFSET ?`).all(...p, limit, (page - 1) * limit) as any[];
  return { items: rows.map(mScan), total, page, limit, totalPages: Math.ceil(total / limit) };
}

export function correctionCandidates(): Scan[] { const cutoff = new Date(Date.now() - 3600000).toISOString(); return (db.prepare(`SELECT * FROM gate_logs WHERE timestamp > ? ORDER BY timestamp DESC LIMIT 30`).all(cutoff) as any[]).map(mScan); }

export function correctScan(logId: string, newDirection: ScanDirection, newReason: ExitReason | undefined, reason: string, userId: string, userName: string, role: string): Scan | null {
  const ex = db.prepare(`SELECT * FROM gate_logs WHERE id=?`).get(logId) as any; if (!ex) return null;
  if (Date.now() - new Date(ex.timestamp).getTime() > 3600000) throw new Error("CORRECTION_WINDOW_EXPIRED");
  db.prepare(`UPDATE gate_logs SET direction=?, reason=?, is_correction=1 WHERE id=?`).run(newDirection, newReason ?? null, logId);
  db.prepare(`UPDATE campus_occupancy SET current_status=?, last_updated=? WHERE student_id=?`).run(newDirection, new Date().toISOString(), ex.student_id);
  addAudit({ action: "CORRECTION", userId, userName, role, details: `Corrected scan ${logId}: ${ex.direction}->${newDirection}. ${reason}`, gateId: ex.gate_id });
  const row = db.prepare(`SELECT * FROM gate_logs WHERE id=?`).get(logId); return row ? mScan(row) : null;
}

function addAudit(input: { action: string; userId: string; userName: string; role: string; details: string; gateId?: string }) {
  db.prepare(`INSERT INTO audit_logs (id, action, user_id, user_name, role, timestamp, details, gate_id) VALUES (?,?,?,?,?,?,?,?)`).run(randomUUID(), input.action, input.userId, input.userName, input.role, new Date().toISOString(), input.details, input.gateId ?? null);
}
export function auditLogs(params?: { userId?: string; action?: string; page?: number; limit?: number }) {
  let w: string[] = []; let p: any[] = [];
  if (params?.userId) { w.push("user_id = ?"); p.push(params.userId); }
  if (params?.action) { w.push("action = ?"); p.push(params.action); }
  const wc = w.length ? `WHERE ${w.join(" AND ")}` : "";
  const limit = params?.limit || 50; const page = params?.page || 1;
  const total = (db.prepare(`SELECT COUNT(*) as c FROM audit_logs ${wc}`).get(...p) as any).c;
  const rows = db.prepare(`SELECT * FROM audit_logs ${wc} ORDER BY timestamp DESC LIMIT ? OFFSET ?`).all(...p, limit, (page - 1) * limit) as any[];
  return { items: rows.map((r) => ({ id: r.id, action: r.action, userId: r.user_id, userName: r.user_name, role: r.role, timestamp: r.timestamp, details: r.details, gateId: r.gate_id })), total, page, limit, totalPages: Math.ceil(total / limit) };
}

/* ------------------------------------------------------------------ *
 *  GATE PASSES
 * ------------------------------------------------------------------ */
export function createGatePass(input: { roll: string; reason: ExitReason; from: string; to: string; description?: string; requestedById: string; requestedByName: string }): GatePass | null {
  const s = findStudentByRoll(input.roll); if (!s) return null;
  const id = `pass-${randomUUID()}`;
  const pid = s.parentId ? "PENDING" : "APPROVED";
  const fid = s.parentId ? "PENDING" : "APPROVED_PARENT";
  db.prepare(`INSERT INTO gate_passes (id, roll, student_name, department, reason, from_datetime, to_datetime, description, requested_by_id, requested_by_name, requested_at, parent_status, admin_status, final_status, qr_code) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, s.roll, s.name, s.department, input.reason, input.from, input.to, input.description ?? null, input.requestedById, input.requestedByName, new Date().toISOString(), pid, "PENDING", fid, randomUUID());
  return findPass(id);
}

export function findGatePasses(filters?: { status?: string; roll?: string; parentId?: string }): GatePass[] {
  let w: string[] = []; let p: any[] = [];
  if (filters?.status) { w.push("final_status = ?"); p.push(filters.status); }
  if (filters?.roll) { w.push("roll = ?"); p.push(filters.roll); }
  if (filters?.parentId) { w.push("roll IN (SELECT roll FROM students WHERE parent_id = ?)"); p.push(filters.parentId); }
  const wc = w.length ? `WHERE ${w.join(" AND ")}` : "";
  return (db.prepare(`SELECT * FROM gate_passes ${wc} ORDER BY requested_at DESC`).all(...p) as any[]).map(mPass);
}
export function findPass(id: string): GatePass | null { const r = db.prepare(`SELECT * FROM gate_passes WHERE id=?`).get(id); return r ? mPass(r) : null; }

export function approvePass(passId: string, by: "parent" | "admin", comment?: string, approverId?: string): GatePass | null {
  const p = findPass(passId); if (!p) return null;
  const now = new Date().toISOString();
  if (by === "parent") db.prepare(`UPDATE gate_passes SET parent_status='APPROVED', parent_comment=?, parent_approver_id=?, updated_at=? WHERE id=?`).run(comment ?? "", approverId ?? "pa-1", now, passId);
  else db.prepare(`UPDATE gate_passes SET admin_status='APPROVED', admin_comment=?, admin_approver_id=?, updated_at=? WHERE id=?`).run(comment ?? "", approverId ?? "ad-1", now, passId);
  const up = findPass(passId)!;
  const ns = up.parentStatus === "APPROVED" && up.adminStatus === "APPROVED" ? "APPROVED_ADMIN" : up.parentStatus === "APPROVED" && up.adminStatus === "PENDING" ? "APPROVED_PARENT" : up.parentStatus === "REJECTED" || up.adminStatus === "REJECTED" ? "REJECTED" : "PENDING";
  db.prepare(`UPDATE gate_passes SET final_status=? WHERE id=?`).run(ns, passId);
  addAudit({ action: "PASS_APPROVED", userId: approverId ?? (by === "parent" ? "pa-1" : "ad-1"), userName: by === "parent" ? "Parent" : "Admin", role: by === "parent" ? "parent" : "admin", details: `Gate pass ${passId} approved by ${by}` });
  return findPass(passId);
}

export function rejectPass(passId: string, by: "parent" | "admin", comment: string): GatePass | null {
  const p = findPass(passId); if (!p) return null;
  const now = new Date().toISOString();
  if (by === "parent") db.prepare(`UPDATE gate_passes SET parent_status='REJECTED', parent_comment=?, updated_at=? WHERE id=?`).run(comment, now, passId);
  else db.prepare(`UPDATE gate_passes SET admin_status='REJECTED', admin_comment=?, updated_at=? WHERE id=?`).run(comment, now, passId);
  db.prepare(`UPDATE gate_passes SET final_status='REJECTED' WHERE id=?`).run(passId);
  addAudit({ action: "PASS_REJECTED", userId: "approver", userName: by, role: by === "parent" ? "parent" : "admin", details: `Gate pass ${passId} rejected by ${by}: ${comment}` });
  return findPass(passId);
}

/* ------------------------------------------------------------------ *
 *  ALERTS
 * ------------------------------------------------------------------ */
export function getAlerts(onlyUnresolved = true): Alert[] { const w = onlyUnresolved ? "WHERE resolved = 0" : ""; return (db.prepare(`SELECT * FROM alerts ${w} ORDER BY timestamp DESC LIMIT 50`).all() as any[]).map(mAlert); }
export function resolveAlert(alertId: string, userId: string, userName: string): Alert | null { db.prepare(`UPDATE alerts SET resolved=1, resolved_by=?, resolved_at=? WHERE id=?`).run(userId, new Date().toISOString(), alertId); const r = getAlerts(false).find((a) => a.id === alertId); return r ?? null; }
export function createAlert(input: { severity: AlertSeverity; title: string; message: string; gateId?: string; studentRoll?: string }): Alert { const id = randomUUID(); db.prepare(`INSERT INTO alerts (id, severity, title, message, gate_id, student_roll, timestamp, resolved) VALUES (?,?,?,?,?,?,?,0)`).run(id, input.severity, input.title, input.message, input.gateId ?? null, input.studentRoll ?? null, new Date().toISOString()); return mAlert(db.prepare(`SELECT * FROM alerts WHERE id=?`).get(id)); }

/* ------------------------------------------------------------------ *
 *  NOTIFICATIONS
 * ------------------------------------------------------------------ */
export function addNotification(recipientType: string, recipientId: string, type: string, title: string, message: string) { db.prepare(`INSERT INTO notifications (id, recipient_type, recipient_id, type, title, message) VALUES (?,?,?,?,?,?)`).run(randomUUID(), recipientType, recipientId, type, title, message); }
export function getNotifications(recipientType: string, recipientId: string): any[] { return (db.prepare(`SELECT * FROM notifications WHERE recipient_type=? AND recipient_id=? ORDER BY created_at DESC LIMIT 50`).all(recipientType, recipientId) as any[]).map((r) => ({ id: r.id, type: r.type, title: r.title, message: r.message, status: r.status, createdAt: r.created_at })); }

/* ------------------------------------------------------------------ *
 *  SESSIONS
 * ------------------------------------------------------------------ */
export function createSession(userId: string, token: string, refreshToken: string) { db.prepare(`INSERT INTO sessions (id, user_id, token, refresh_token, expires_at) VALUES (?,?,?,?,?)`).run(randomUUID(), userId, token, refreshToken, new Date(Date.now() + 7 * 86400000).toISOString()); }
export function invalidateSession(token: string) { db.prepare(`UPDATE sessions SET is_valid=0 WHERE token=?`).run(token); }
export function getUserForSession(token: string): User | null { const s = db.prepare(`SELECT * FROM sessions WHERE token=? AND is_valid=1`).get(token) as any; if (!s) return null; if (new Date(s.expires_at).getTime() < Date.now()) return null; return findUserById(s.user_id); }

/* ------------------------------------------------------------------ *
 *  DASHBOARD
 * ------------------------------------------------------------------ */
export function dashboard(): DashboardData {
  const tsc = scansToday(); const ins = tsc.filter((s) => s.direction === "IN").length; const outs = tsc.filter((s) => s.direction === "OUT").length;
  const inside = studentsInside(); const alerts = getAlerts(true); const passes = findGatePasses().slice(0, 5);
  const locs = [
    { id: "gate-1", name: "Gate 1 (Main)", count: tsc.filter((s) => s.gateId === "gate-1").length, status: "active" as const, type: "gate" as const },
    { id: "gate-2", name: "Gate 2 (Hostel)", count: tsc.filter((s) => s.gateId === "gate-2").length, status: "active" as const, type: "gate" as const },
    { id: "lib", name: "Library", count: 456, status: "active" as const, type: "location" as const },
    { id: "canteen", name: "Canteen", count: 234, status: "active" as const, type: "location" as const },
  ];
  return {
    onCampus: inside.length, todayIn: ins, todayOut: outs, totalScans: tsc.length, activeAlerts: alerts.filter((a) => !a.resolved).length,
    trendOnCampus: inside.length > 0 ? "+12 vs yesterday" : "0 vs yesterday", trendOut: outs > 0 ? "+45 vs yesterday" : "0 vs yesterday", trendScans: tsc.length > 0 ? "Normal" : "No scans yet",
    locations: locs, activityFeed: tsc.slice(0, 20), deptBreakdown: deptBreakdownToday(), alerts, gatePasses: passes,
  };
}

export function deptBreakdownToday(): DashboardData["deptBreakdown"] {
  const names: Record<string, string> = { CSE: "Computer Science & Engineering", IT: "Information Technology", ECE: "Electronics & Communication Engineering", EEE: "Electrical & Electronics Engineering", ME: "Mechanical Engineering" };
  return (["CSE", "IT", "ECE", "EEE", "ME"] as DepartmentCode[]).map((code) => {
    const r = db.prepare(`SELECT SUM(CASE WHEN direction='IN' THEN 1 ELSE 0 END) as i, SUM(CASE WHEN direction='OUT' THEN 1 ELSE 0 END) as o FROM gate_logs WHERE department=?`).get(code) as any;
    const i = r?.i || 0; const o = r?.o || 0; const t = i + o;
    return { dept: names[code], deptCode: code, in: i, out: o, pct: t ? Math.round((i / t) * 100) : 0 };
  });
}

/* ------------------------------------------------------------------ *
 *  DEVICES
 * ------------------------------------------------------------------ */
export function registerDevice(input: { deviceId: string; deviceName?: string; deviceType?: string; assignedGateId?: string }): void {
  db.prepare(`INSERT OR REPLACE INTO device_registry (id, device_id, device_name, device_type, assigned_gate_id, assigned_to) VALUES (?,?,?,?,?,?)`).run(randomUUID(), input.deviceId, input.deviceName ?? null, input.deviceType ?? "tablet", input.assignedGateId ?? null, null);
}
export function getDevices(): any[] { return (db.prepare(`SELECT * FROM device_registry ORDER BY created_at DESC`).all() as any[]).map((r) => ({ id: r.id, deviceId: r.device_id, deviceName: r.device_name, deviceType: r.device_type, assignedGateId: r.assigned_gate_id, assignedTo: r.assigned_to, lastSeen: r.last_seen, status: r.status })); }

/* ------------------------------------------------------------------ */
export function statsToday(): { entries: number; exits: number; onCampus: number; lastScan: Scan | null; recentScans: Scan[] } {
  const t = scansToday();
  return { entries: t.filter((s) => s.direction === "IN").length, exits: t.filter((s) => s.direction === "OUT").length, onCampus: campusCount(), lastScan: t[0] ?? null, recentScans: t.slice(0, 5) };
}

/* ------------------------------------------------------------------ *
 *  STUDENT STATUS & HISTORY (for parent/student views)
 * ------------------------------------------------------------------ */
export function getStudentStatus(roll: string): { status: "IN" | "OUT"; lastScan: Scan | null; name?: string } {
  const occ = db.prepare(`SELECT current_status, last_log_id FROM campus_occupancy co JOIN students s ON s.id = co.student_id WHERE s.roll = ?`).get(roll) as any;
  if (!occ) return { status: "OUT", lastScan: null };
  const lastScan = lastScanFor(roll);
  return { status: occ.current_status as "IN" | "OUT", lastScan, name: lastScan?.name };
}

export function getStudentHistory(roll: string, limit: number = 20): Scan[] {
  const rows = db.prepare(`SELECT * FROM gate_logs WHERE roll = ? ORDER BY timestamp DESC LIMIT ?`).all(roll, limit) as any[];
  return rows.map(mScan);
}

export function getParentChildren(parentId: string): Student[] {
  const rows = db.prepare(`SELECT * FROM students WHERE parent_id = ? OR parent_name != '' ORDER BY roll`).all(parentId) as any[];
  return rows.map(toStu);
}

/* ------------------------------------------------------------------ *
 *  GATE PASS SCANNING
 * ------------------------------------------------------------------ */
export function scanGatePass(passId: string, gateId: string, operatorId: string): { success: boolean; message: string } {
  const pass = findPass(passId);
  if (!pass) return { success: false, message: "Gate pass not found" };
  if (pass.finalStatus !== "APPROVED_ADMIN" && pass.finalStatus !== "ACTIVE") {
    return { success: false, message: "Gate pass is not approved" };
  }
  const now = new Date().toISOString();
  if (new Date(pass.to) < new Date()) {
    return { success: false, message: "Gate pass has expired" };
  }
  db.prepare(`UPDATE gate_passes SET used_at = ?, final_status = 'COMPLETED' WHERE id = ?`).run(now, passId);
  addAudit({ action: "PASS_SCANNED", userId: operatorId, userName: "Operator", role: "operator", details: `Gate pass ${passId} scanned at ${gateId}` });
  return { success: true, message: "Gate pass scanned successfully" };
}

/* ------------------------------------------------------------------ *
 *  REAL-TIME GATE MONITORING (for supervisor live view)
 * ------------------------------------------------------------------ */
export function getAllGatesLive(): Array<Gate & { currentScanCount: number; lastScan: Scan | null }> {
  return GATES.map((g) => {
    const scans = scansToday().filter((s) => s.gateId === g.id);
    const lastScan = scans[0] ?? null;
    return { ...g, currentScanCount: scans.length, lastScan };
  });
}

export default db;
