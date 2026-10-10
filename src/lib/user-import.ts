// src/lib/user-import.ts
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { Role } from "@/lib/types";
import { addAudit } from "@/lib/db";
import bcrypt from "bcryptjs";
import pLimit from "p-limit";
import crypto from "crypto";

const VALID_ROLES: Role[] = ["operator", "admin", "sysadmin", "parent", "student", "warden", "faculty", "staff", "worker"];
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

export async function parseCsv(csvText: string): Promise<Record<string, string>[]> {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^[\"']|[\"']$/g, ""));
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
        values.push(currentVal.trim().replace(/^[\"']|[\"']$/g, ""));
        currentVal = "";
      } else {
        currentVal += char;
      }
    }
    values.push(currentVal.trim().replace(/^[\"']|[\"']$/g, ""));

    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] || "";
    });
    records.push(obj);
  }

  return records;
}

export async function validateImport(csvInput: string | ImportRow[]): Promise<ValidationResult> {
  const rawRows: Record<string, string>[] = typeof csvInput === "string" ? await parseCsv(csvInput) : (csvInput as any);
  const errors: ValidationError[] = [];
  const validRows: ImportRow[] = [];
  const seenEmails = new Set<string>();

  for (let i = 0; i < rawRows.length; i++) {
    const r = rawRows[i];
    const rowNum = i + 1;
    const name = (r.name || r["NAME OF THE STUDENT"] || "").trim();
    const email = (r.email || r["EMAIL ID"] || "").trim().toLowerCase();
    const role = (r.role || "student").trim().toLowerCase() as Role;
    const uniqueId = (r.uniqueId || r["H.T NO."] || r.roll || r.employeeId || "").trim();

    if (!name) {
      errors.push({ row: rowNum, field: "name", message: "Name is required" });
      continue;
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      errors.push({ row: rowNum, field: "email", message: "Valid email is required" });
      continue;
    }

    if (seenEmails.has(email)) {
      errors.push({ row: rowNum, field: "email", message: `Duplicate email ${email} in file` });
      continue;
    }
    seenEmails.add(email);

    if (!VALID_ROLES.includes(role)) {
      errors.push({ row: rowNum, field: "role", message: `Invalid role: ${role}` });
      continue;
    }

    const rowObj: ImportRow = {
      name,
      email,
      role,
      uniqueId: uniqueId || email.split("@")[0],
      roll: r.roll || r["H.T NO."] || uniqueId,
      course: r.course || r["COURSE"] || undefined,
      fatherName: r.fatherName || r["FATHER NAME"] || undefined,
      dob: r.dob || r["DOB"] || undefined,
      landlineNumber: r.landlineNumber || r["LAND LINE 0R PARENT NUMBER"] || undefined,
      employeeId: r.employeeId || uniqueId,
      phone: r.phone || r["PHONE NUMBER"] || undefined,
      department: r.department || r.departmentId || undefined,
      departmentId: r.departmentId || r.department || undefined,
      designation: r.designation || undefined,
      year: r.year ? parseInt(r.year, 10) : undefined,
      section: r.section || undefined,
      batch: r.batch || undefined,
      hostelBlock: r.hostelBlock || r.assignedHostel || undefined,
      roomNumber: r.roomNumber || r.hostelRoom || undefined,
      status: r.status || "ACTIVE",
      gender: r.gender || undefined,
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

export async function commitImport(
  rows: ImportRow[],
  actorId: string,
  skipErrors: boolean = true
): Promise<CommitResult> {
  const supabase = getSupabaseServiceClient();
  const defaultSalt = await bcrypt.genSalt(10);
  const defaultPwHash = await bcrypt.hash("Welcome@123", defaultSalt);
  const defaultPinHash = await bcrypt.hash("1234", defaultSalt);

  const limit = pLimit(5);
  const tasks = rows.map((row, i) => limit(() => processSingleRow(row, i + 1, supabase, actorId, defaultPwHash, defaultPinHash)));
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

  await addAudit({
    action: "BULK_USER_IMPORT",
    userId: actorId,
    userName: "SysAdmin",
    role: "sysadmin",
    details: { total: rows.length, importedCount, failedCount },
  }).catch(() => {});

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
  actorId: string,
  pwHash: string,
  pinHash: string
): Promise<{ row: number; error: string | null }> {
  try {
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
        department_id: row.departmentId || row.department || null,
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
        unique_id: row.uniqueId || row.roll || row.employeeId || row.email.split("@")[0],
        dob: row.dob || null,
        phone: row.phone || null,
        department_id: row.departmentId || row.department || null,
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
      const studentData = {
        user_id: targetUserId,
        roll: row.roll || row.uniqueId || row.email.split("@")[0],
        year: row.year || 1,
        section: row.section || "A",
        batch: row.batch || "",
        hostel_block: row.hostelBlock || null,
        room_number: row.roomNumber || null,
        gender: row.gender || null,
        course: row.course || null,
        father_name: row.fatherName || null,
        landline_number: row.landlineNumber || null,
      };
      await supabase.from("student_details").upsert(studentData, { onConflict: "user_id" });
    }

    if (["faculty", "staff", "operator", "admin", "sysadmin", "worker"].includes(row.role)) {
      const employeeData = {
        user_id: targetUserId,
        employee_id: row.employeeId || row.uniqueId || row.email.split("@")[0],
        designation: row.designation || (row.role === "faculty" ? "Assistant Professor" : row.role),
        department_id: row.departmentId || row.department || null,
        staff_category: row.role,
      };
      await supabase.from("employee_details").upsert(employeeData, { onConflict: "user_id" });
    }

    return { row: rowNum, error: null };
  } catch (err: any) {
    return { row: rowNum, error: err.message || "Failed to process row" };
  }
}
