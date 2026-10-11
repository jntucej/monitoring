// src/lib/user-import.ts
// Bulk user import engine — roll-number (H.T NO.) driven.
//
// The roll number is the single source of truth: it is decoded to derive
// year of study, batch, entry type and branch. Sheet columns are used for
// names/contacts; anything that can be computed from the roll is NEVER
// hardcoded (year is calculated from the Indian academic year, July start).
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { Role } from "@/lib/types";
import { addAudit } from "@/lib/db";
import bcrypt from "bcryptjs";
import pLimit from "p-limit";
import crypto from "crypto";
import {
  parseRollNumber,
  getStudentYearFromRoll,
  getBatchFromRoll,
} from "@/lib/rollNumber";

const VALID_ROLES: Role[] = [
  "operator", "admin", "sysadmin", "parent", "student",
  "warden", "faculty", "staff", "worker",
];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ImportRow {
  name: string;
  email: string;
  role: Role;
  uniqueId?: string;
  roll?: string;
  employeeId?: string;
  phone?: string;
  department?: string;
  departmentId?: string;
  designation?: string;
  year?: number;
  section?: string;
  batch?: string;
  hostelBlock?: string;
  roomNumber?: string;
  status?: string;
  gender?: string;
  course?: string;
  courseFromRoll?: string;
  fatherName?: string;
  dob?: string;
  landlineNumber?: string;
  [key: string]: any;
}

export interface ValidationError {
  row: number;
  field?: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  totalRows: number;
  validRows: ImportRow[];
  errors: ValidationError[];
  summary: { total: number; valid: number; invalid: number; };
}

export interface CommitResult {
  success: boolean;
  importedCount: number;
  failedCount: number;
  errors: Array<{ row: number; error: string }>;
}

/* ------------------------------------------------------------------ */
/* Header / value helpers                                             */
/* ------------------------------------------------------------------ */

function normalizeKey(k: string): string {
  return k.toUpperCase().replace(/[\s._]+/g, " ").trim();
}

/** Look up a value in a record by several header aliases (case-insensitive). */
function pick(r: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const v = r[k];
    if (v && v.trim()) return v.trim();
  }
  // Fall back to a normalized header match (covers "H.T NO." vs "H.T NO", "H T NO" etc.)
  const norm = new Map<string, string>();
  for (const key of Object.keys(r)) norm.set(normalizeKey(key), r[key]);
  for (const k of keys) {
    const v = norm.get(normalizeKey(k));
    if (v && v.trim()) return v.trim();
  }
  return "";
}

/** Parse DOB from the sheet: accepts YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY. */
function normalizeDate(raw: string): string | undefined {
  const v = (raw || "").trim();
  if (!v) return undefined;
  let m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = v.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    return `${m[3]}-${mm}-${dd}`;
  }
  return undefined;
}

/** Normalize the sheet's GENDER values into the male/female the DB CHECK wants. */
function normalizeGender(raw: string): string | undefined {
  const v = (raw || "").trim().toLowerCase();
  if (!v) return undefined;
  if (v === "m" || v === "male" || v === "m.") return "male";
  if (v === "f" || v === "female" || v === "f.") return "female";
  return undefined;
}

/* ------------------------------------------------------------------ */
/* CSV parser                                                         */
/* ------------------------------------------------------------------ */

export async function parseCsv(csvText: string): Promise<Record<string, string>[]> {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const values: string[] = [];
    let insideQuote = false;
    let currentVal = "";

    for (let c = 0; c < rawLine.length; c++) {
      const char = rawLine[c];
      if (char === '"' || char === "'") {
        insideQuote = !insideQuote;
      } else if (char === "," && !insideQuote) {
        values.push(currentVal.trim().replace(/^["']|["']$/g, ""));
        currentVal = "";
      } else {
        currentVal += char;
      }
    }
    values.push(currentVal.trim().replace(/^["']|["']$/g, ""));

    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] || "";
    });
    records.push(obj);
  }

  return records;
}

/* ------------------------------------------------------------------ */
/* Validate                                                           */
/* ------------------------------------------------------------------ */

export async function validateImport(csvInput: string | ImportRow[]): Promise<ValidationResult> {
  const rawRows: Record<string, string>[] =
    typeof csvInput === "string" ? await parseCsv(csvInput) : (csvInput as any);
  const errors: ValidationError[] = [];
  const validRows: ImportRow[] = [];
  const seenEmails = new Set<string>();

  for (let i = 0; i < rawRows.length; i++) {
    const r = rawRows[i];
    const rowNum = i + 1;

    // The sheet's own header names (and programmatic aliases).
    const name = pick(r, "name", "NAME OF THE STUDENT", "NAME");
    const email = pick(r, "email", "EMAIL ID", "EMAIL").toLowerCase();
    const role = (pick(r, "role") || "student").toLowerCase() as Role;
    // H.T NO. is the roll number — the primary identifier.
    const rollRaw = pick(r, "H.T NO.", "HT NO", "H T NO", "HALL TICKET NO", "ROLL", "roll", "uniqueId");
    const phone = pick(r, "phone", "PHONE NUMBER", "PHONE");
    const gender = normalizeGender(pick(r, "gender", "GENDER"));
    const dob = normalizeDate(pick(r, "dob", "DOB", "DATE OF BIRTH"));
    const fatherName = pick(r, "fatherName", "FATHER NAME", "FATHERNAME", "GUARDIAN NAME");
    const landlineNumber = pick(r, "LAND LINE 0R PARENT NUMBER", "LANDLINE", "LAND LINE", "PARENT NUMBER", "LANDLINE_NUMBER");
    const course = pick(r, "COURSE", "course", "PROGRAM", "DEGREE");

    // 1. Name — required (it is the human-readable identifier).
    if (!name) {
      errors.push({ row: rowNum, field: "name", message: "Name is required" });
      continue;
    }

    // 2. Email — required (no auto-generation; the row is reported as invalid).
    if (!email || !EMAIL_REGEX.test(email)) {
      errors.push({ row: rowNum, field: "email", message: "Valid email is required" });
      continue;
    }

    // 3. Roll number (H.T NO.) — required for students; it drives everything else.
    const isStudent = role === "student";
    if (isStudent && !rollRaw) {
      errors.push({ row: rowNum, field: "roll", message: "H.T NO. (roll number) is required for students" });
      continue;
    }

    // 4. Duplicate email in file.
    if (seenEmails.has(email)) {
      errors.push({ row: rowNum, field: "email", message: `Duplicate email ${email} in file` });
      continue;
    }
    seenEmails.add(email);

    // 5. Role sanity.
    if (!VALID_ROLES.includes(role)) {
      errors.push({ row: rowNum, field: "role", message: `Invalid role: ${role}` });
      continue;
    }

    // 6. Roll decode — derive year / batch / entry / branch. Never hardcoded.
    const decoded = rollRaw ? parseRollNumber(rollRaw) : null;
    if (isStudent && !decoded) {
      errors.push({
        row: rowNum,
        field: "roll",
        message: `H.T NO. "${rollRaw}" does not match the yyJJVVBBNN pattern (e.g. 24JJ1A0501)`,
      });
      continue;
    }

    const derivedYear = isStudent ? (getStudentYearFromRoll(rollRaw) ?? undefined) : undefined;
    const derivedBatch = isStudent ? (getBatchFromRoll(rollRaw) ?? undefined) : undefined;
    const rollCourse = decoded ? decoded.department : undefined;

    const rowObj: ImportRow = {
      name,
      email,
      role,
      // The roll number IS the user's unique_id / the system ID.
      uniqueId: rollRaw || (pick(r, "employeeId", "EMPLOYEE ID") || email.split("@")[0]),
      roll: rollRaw || undefined,
      phone,
      gender,
      dob,
      fatherName,
      landlineNumber,
      course,
      // Fallback course from the roll's branch code, used when the sheet's
      // COURSE cell is empty.
      courseFromRoll: rollCourse,
      // year / batch are CALCULATED from the roll (Indian AY, July start).
      year: derivedYear,
      batch: derivedBatch,
      section: pick(r, "section", "SECTION") || "A",
      employeeId: pick(r, "employeeId", "EMPLOYEE ID") || rollRaw || email.split("@")[0],
      department: pick(r, "department", "DEPARTMENT") || rollCourse,
      departmentId: pick(r, "departmentId", "DEPARTMENT ID"),
      designation: pick(r, "designation", "DESIGNATION"),
      hostelBlock: pick(r, "hostelBlock", "HOSTEL", "assignedHostel"),
      roomNumber: pick(r, "roomNumber", "ROOM", "hostelRoom"),
      status: "ACTIVE",
    };

    validRows.push(rowObj);
  }

  return {
    valid: errors.length === 0,
    totalRows: rawRows.length,
    validRows,
    errors,
    summary: {
      total: rawRows.length,
      valid: validRows.length,
      invalid: errors.length,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Commit                                                             */
/* ------------------------------------------------------------------ */

export async function commitImport(
  rows: ImportRow[],
  actorId: string,
  skipErrors: boolean = true
): Promise<CommitResult> {
  const supabase = getSupabaseServiceClient();
  const limit = pLimit(5);
  const tasks = rows.map((row, i) => limit(() => processSingleRow(row, i + 1, supabase, actorId)));
  const rowResults = await Promise.all(tasks);

  let importedCount = 0;
  let failedCount = 0;
  const errors: Array<{ row: number; error: string }> = [];

  for (const res of rowResults) {
    if (res.error) {
      failedCount++;
      errors.push({ row: res.row, error: res.error });
    } else {
      importedCount++;
    }
  }

  // Audit the import (BULK_USER_IMPORT is whitelisted in audit_logs_action_known)
  try {
    await addAudit({
      action: "BULK_USER_IMPORT",
      userId: actorId,
      userName: "SysAdmin",
      role: "sysadmin",
      details: { total: rows.length, importedCount, failedCount },
    });
  } catch {
    // audit must never block the import
  }

  return {
    success: errors.length === 0 || skipErrors,
    importedCount,
    failedCount,
    errors,
  };
}

async function processSingleRow(
  row: ImportRow,
  rowNum: number,
  supabase: any,
  _actorId: string
): Promise<{ row: number; error: string | null }> {
  try {
    const salt = await bcrypt.genSalt(10);
    const pwHash = await bcrypt.hash(crypto.randomBytes(16).toString("hex") + "Welcome@123", salt);
    const pinHash = await bcrypt.hash(String(Math.floor(1000 + Math.random() * 9000)), salt);
    const { data: existing } = await supabase
      .from("users")
      .select("id, role")
      .eq("email", row.email)
      .maybeSingle();

    let targetUserId: string;

    if (existing) {
      targetUserId = existing.id;
      const updates: Record<string, any> = {
        name: row.name,
        role: row.role,
        phone: row.phone || null,
        status: row.status || "ACTIVE",
        updated_at: new Date().toISOString(),
      };
      if (row.uniqueId) updates.unique_id = row.uniqueId;
      if (row.dob) updates.dob = row.dob;

      const { error: updErr } = await supabase.from("users").update(updates).eq("id", targetUserId);
      if (updErr) throw new Error(updErr.message);
    } else {
      const newId = crypto.randomUUID();
      targetUserId = newId;
      const insertUser = {
        id: newId,
        name: row.name,
        email: row.email,
        role: row.role,
        // The roll number (H.T NO.) is the system's canonical ID for the student.
        unique_id: row.uniqueId || row.roll || row.email.split("@")[0],
        dob: row.dob || null,
        phone: row.phone || null,
        status: row.status || "ACTIVE",
        password_hash: pwHash,
        pin_hash: pinHash,
        initial_pin_hash: pinHash,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: insErr } = await supabase.from("users").insert(insertUser);
      if (insErr) throw new Error(insErr.message);
    }

    if (row.role === "student") {
      // Course: prefer the sheet's COURSE cell; fall back to the branch name
      // decoded from the roll (CSE / IT / ECE / EEE / ME).
      const courseValue = row.course || row.courseFromRoll || null;
      const studentData = {
        user_id: targetUserId,
        // Roll stored as given (the UNIQUE index is case-sensitive; keep the
        // sheet's canonical casing so /api/students/{roll} lookups match).
        roll: row.roll || row.uniqueId || row.email.split("@")[0],
        // Year is CALCULATED from the roll (Indian AY, July start) — never a
        // hardcoded default. batch = admission year, also from the roll.
        year: row.year ?? 1,
        section: row.section || "A",
        batch: row.batch || "",
        hostel_block: row.hostelBlock || null,
        room_number: row.roomNumber || null,
        gender: row.gender || null,
        course: courseValue,
        father_name: row.fatherName || null,
        landline_number: row.landlineNumber || null,
      };
      const { error: stuErr } = await supabase.from("student_details").upsert(studentData, { onConflict: "user_id" });
      if (stuErr) throw new Error(`student_details upsert failed: ${stuErr.message}`);
    }

    if (["faculty", "staff", "operator", "admin", "sysadmin", "worker"].includes(row.role)) {
      // staff_category has a CHECK constraint (teaching_faculty / office_staff /
      // support_staff / security / other / ...). Raw role names violate it, so
      // map role -> allowed value.
      const STAFF_CATEGORY_BY_ROLE: Record<string, string> = {
        faculty: "teaching_faculty",
        staff: "office_staff",
        operator: "security",
        worker: "support_staff",
        admin: "other",
        sysadmin: "other",
      };
      const employeeData = {
        user_id: targetUserId,
        employee_id: row.employeeId || row.uniqueId || row.email.split("@")[0],
        designation: row.designation || (row.role === "faculty" ? "Assistant Professor" : row.role),
        staff_category: STAFF_CATEGORY_BY_ROLE[row.role] || "other",
      };
      const { error: empErr } = await supabase.from("employee_details").upsert(employeeData, { onConflict: "user_id" });
      if (empErr) {
        // surface it in the per-row result instead of silently swallowing
        throw new Error(`employee_details upsert failed: ${empErr.message}`);
      }
    }

    return { row: rowNum, error: null };
  } catch (err: any) {
    return { row: rowNum, error: err.message || "Failed to process row" };
  }
}
