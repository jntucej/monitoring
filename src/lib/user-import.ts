import { getSupabaseServiceClient } from "@/lib/dbClient";
import { createUser, updateUserRole, updateAccountStatus, addAudit } from "@/lib/db";
import { Role } from "@/lib/types";
import { randomBytes } from "crypto";

export interface ImportRow {
  row: number;
  email: string;
  name: string;
  role: Role;
  uniqueId?: string;
  employeeId?: string;
  department?: string;
  designation?: string;
  phone?: string;
  gateCode?: string;
  hostelBlock?: string;
  roomNumber?: string;
  isHosteller?: boolean;
  guardianEmail?: string;
  status?: "ACTIVE" | "LOCKED" | "SUSPENDED";
}

export interface ImportError {
  row: number;
  email: string;
  field: string;
  code: string;
  message: string;
}

export interface ImportWarning {
  row: number;
  email?: string;
  message: string;
}

export interface ValidationResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: ImportError[];
  warnings: ImportWarning[];
  rows: ImportRow[];
}

export interface CommitResult {
  total: number;
  created: number;
  updated: number;
  failed: number;
  skipped: number;
  results: Array<{
    row: number;
    email: string;
    status: "created" | "updated" | "failed" | "skipped";
    userId?: string;
    error?: string;
  }>;
}

const VALID_ROLES = new Set<string>([
  "operator", "admin", "sysadmin", "supervisor", "guardian", "parent", "hod", "student", "warden", "faculty", "staff", "worker", "visitor"
]);
const EMPLOYEE_ID_RE = /^[A-Z0-9_-]{2,32}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseCSV(text: string): { header: string[]; rows: string[][] } {
  const cleanText = text.replace(/^\uFEFF/, "");
  const lines: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const ch = cleanText[i];
    const next = cleanText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        cur.push(field);
        field = "";
      } else if (ch === "\n") {
        cur.push(field);
        lines.push(cur);
        cur = [];
        field = "";
      } else if (ch === "\r") {
        // Skip CR
      } else {
        field += ch;
      }
    }
  }

  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    lines.push(cur);
  }

  if (lines.length === 0) return { header: [], rows: [] };

  const [rawHeader, ...body] = lines;
  const header = rawHeader.map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ""));
  const rows = body.filter((r) => r.some((c) => c.trim().length > 0));

  return { header, rows };
}

function findColumn(header: string[], ...names: string[]) {
  return header.findIndex((h) => names.includes(h.replace(/[^a-z0-9]/g, "")));
}

async function fetchValidationContext() {
  const service = getSupabaseServiceClient();
  const [usersRes, deptsRes, gatesRes] = await Promise.all([
    service.from("users").select("id, email, unique_id, role"),
    service.from("departments").select("code, name"),
    service.from("gates").select("id, gate_code, name")
  ]);

  const existingEmails = new Map<string, any>();
  const existingUids = new Map<string, any>();
  (usersRes.data || []).forEach((u: any) => {
    if (u.email) existingEmails.set(u.email.toLowerCase().trim(), u);
    if (u.unique_id) existingUids.set(u.unique_id.toUpperCase().trim(), u);
  });

  const deptCodes = new Set<string>((deptsRes.data || []).map((d: any) => (d.code || "").toUpperCase().trim()));
  const gateCodes = new Set<string>((gatesRes.data || []).map((g: any) => (g.gate_code || "").toUpperCase().trim()));

  return { existingEmails, existingUids, deptCodes, gateCodes };
}

function validateSingleRow(
  r: string[],
  rowNum: number,
  idxs: Record<string, number>,
  ctx: { existingEmails: Map<string, any>; existingUids: Map<string, any>; deptCodes: Set<string>; gateCodes: Set<string>; seenEmails: Set<string>; seenUids: Set<string> }
): { parsed: ImportRow; errors: ImportError[]; warnings: ImportWarning[] } {
  const getVal = (idx: number) => (idx >= 0 && idx < r.length ? r[idx].trim() : "");
  const email = getVal(idxs.email).toLowerCase();
  const name = getVal(idxs.name);
  const roleRaw = getVal(idxs.role).toLowerCase();
  const uniqueId = getVal(idxs.uniqueId).toUpperCase();
  const employeeId = getVal(idxs.employeeId).toUpperCase();
  const department = getVal(idxs.department).toUpperCase();
  const designation = getVal(idxs.designation);
  const phone = getVal(idxs.phone);
  const gateCode = getVal(idxs.gateCode).toUpperCase();
  const hostelBlock = getVal(idxs.hostelBlock);
  const roomNumber = getVal(idxs.roomNumber);
  const isHostellerRaw = getVal(idxs.isHosteller).toLowerCase();
  const isHosteller = isHostellerRaw === "true" || isHostellerRaw === "yes" || isHostellerRaw === "1";
  const guardianEmail = getVal(idxs.guardianEmail).toLowerCase();

  const errors: ImportError[] = [];
  const warnings: ImportWarning[] = [];

  if (!email) {
    errors.push({ row: rowNum, email, field: "email", code: "REQUIRED", message: "Email is required" });
  } else if (!EMAIL_RE.test(email)) {
    errors.push({ row: rowNum, email, field: "email", code: "INVALID_EMAIL", message: "Invalid email format" });
  } else if (ctx.seenEmails.has(email)) {
    errors.push({ row: rowNum, email, field: "email", code: "DUPLICATE_IN_FILE", message: `Duplicate email '${email}' in CSV` });
  } else {
    ctx.seenEmails.add(email);
    if (ctx.existingEmails.has(email)) {
      warnings.push({ row: rowNum, email, message: `Email '${email}' exists; will update existing user profile` });
    }
  }

  if (!name || name.length < 2) {
    errors.push({ row: rowNum, email, field: "name", code: "REQUIRED", message: "Name is required (min 2 chars)" });
  }

  let mappedRole = roleRaw as Role;
  if (roleRaw === "parent") mappedRole = "guardian" as Role;

  if (!roleRaw) {
    errors.push({ row: rowNum, email, field: "role", code: "REQUIRED", message: "Role is required" });
  } else if (!VALID_ROLES.has(roleRaw)) {
    errors.push({ row: rowNum, email, field: "role", code: "INVALID_ROLE", message: `Role '${roleRaw}' is invalid` });
  }

  const effectiveUid = uniqueId || (["faculty", "staff", "worker"].includes(roleRaw) ? employeeId : undefined);
  if (["student", "faculty", "staff", "worker"].includes(roleRaw)) {
    if (!effectiveUid) {
      errors.push({ row: rowNum, email, field: "unique_id", code: "REQUIRED", message: `unique_id or employee_id is required for '${roleRaw}'` });
    } else if (ctx.seenUids.has(effectiveUid)) {
      errors.push({ row: rowNum, email, field: "unique_id", code: "DUPLICATE_IN_FILE", message: `Duplicate unique_id '${effectiveUid}'` });
    } else {
      ctx.seenUids.add(effectiveUid);
      const existingUser = ctx.existingUids.get(effectiveUid);
      if (existingUser && existingUser.email?.toLowerCase() !== email) {
        errors.push({ row: rowNum, email, field: "unique_id", code: "DUPLICATE_DB", message: `unique_id '${effectiveUid}' already assigned to ${existingUser.email}` });
      }
    }
  }

  if (["faculty", "staff", "worker"].includes(roleRaw) && employeeId && !EMPLOYEE_ID_RE.test(employeeId)) {
    errors.push({ row: rowNum, email, field: "employee_id", code: "INVALID_FORMAT", message: "employee_id must be alphanumeric (2-32 chars)" });
  }

  if (department && ctx.deptCodes.size > 0 && !ctx.deptCodes.has(department)) {
    errors.push({ row: rowNum, email, field: "department", code: "DEPT_NOT_FOUND", message: `Department '${department}' not recognized` });
  }

  if (roleRaw === "operator" && gateCode && ctx.gateCodes.size > 0 && !ctx.gateCodes.has(gateCode)) {
    errors.push({ row: rowNum, email, field: "gate_code", code: "GATE_NOT_FOUND", message: `Gate '${gateCode}' does not exist` });
  }

  if (roleRaw === "student" && isHosteller && !hostelBlock) {
    errors.push({ row: rowNum, email, field: "hostel_block", code: "REQUIRED", message: "hostel_block required for hosteller" });
  }

  if (guardianEmail && !EMAIL_RE.test(guardianEmail)) {
    errors.push({ row: rowNum, email, field: "guardian_email", code: "INVALID_EMAIL", message: "Invalid guardian email" });
  }

  return {
    parsed: {
      row: rowNum,
      email,
      name,
      role: mappedRole,
      uniqueId: effectiveUid,
      employeeId: employeeId || undefined,
      department: department || undefined,
      designation: designation || undefined,
      phone: phone || undefined,
      gateCode: gateCode || undefined,
      hostelBlock: hostelBlock || undefined,
      roomNumber: roomNumber || undefined,
      isHosteller,
      guardianEmail: guardianEmail || undefined,
      status: "ACTIVE"
    },
    errors,
    warnings
  };
}

export async function validateImport(text: string): Promise<ValidationResult> {
  const { header, rows } = parseCSV(text);

  if (rows.length === 0) {
    return {
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      errors: [{ row: 0, email: "", field: "file", code: "EMPTY_FILE", message: "CSV file is empty or contains only headers" }],
      warnings: [],
      rows: []
    };
  }

  const idxs = {
    email: findColumn(header, "email", "emailaddress", "useremail"),
    name: findColumn(header, "name", "fullname", "username"),
    role: findColumn(header, "role", "userrole", "roletype"),
    uniqueId: findColumn(header, "uniqueid", "uid", "rollno", "rollnumber", "usn", "regno"),
    employeeId: findColumn(header, "employeeid", "empid", "facultyid", "staffid"),
    department: findColumn(header, "department", "dept", "departmentcode", "branch"),
    designation: findColumn(header, "designation", "title", "jobtitle"),
    phone: findColumn(header, "phone", "phonenumber", "mobile", "contact"),
    gateCode: findColumn(header, "gatecode", "gate", "gateid"),
    hostelBlock: findColumn(header, "hostelblock", "hostel", "block"),
    roomNumber: findColumn(header, "roomnumber", "room", "hostelroom", "roomno"),
    isHosteller: findColumn(header, "ishosteller", "hosteller"),
    guardianEmail: findColumn(header, "guardianemail", "parentemail", "guardian")
  };

  if (idxs.email === -1 || idxs.name === -1 || idxs.role === -1) {
    const missing: string[] = [];
    if (idxs.email === -1) missing.push("email");
    if (idxs.name === -1) missing.push("name");
    if (idxs.role === -1) missing.push("role");

    return {
      totalRows: rows.length,
      validRows: 0,
      invalidRows: rows.length,
      errors: [{ row: 1, email: "", field: missing.join(", "), code: "MISSING_HEADERS", message: `CSV missing required column(s): ${missing.join(", ")}` }],
      warnings: [],
      rows: []
    };
  }

  const ctxData = await fetchValidationContext();
  const ctx = {
    ...ctxData,
    seenEmails: new Set<string>(),
    seenUids: new Set<string>()
  };

  const allErrors: ImportError[] = [];
  const allWarnings: ImportWarning[] = [];
  const parsedRows: ImportRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const res = validateSingleRow(rows[i], i + 2, idxs, ctx);
    allErrors.push(...res.errors);
    allWarnings.push(...res.warnings);
    parsedRows.push(res.parsed);
  }

  const errorRowNums = new Set(allErrors.map((e) => e.row));
  return {
    totalRows: parsedRows.length,
    validRows: parsedRows.length - errorRowNums.size,
    invalidRows: errorRowNums.size,
    errors: allErrors,
    warnings: allWarnings,
    rows: parsedRows
  };
}

export async function commitImport(
  rows: ImportRow[],
  actorId: string,
  skipErrors = false
): Promise<CommitResult> {
  const service = getSupabaseServiceClient();
  const results: CommitResult["results"] = [];
  let createdCount = 0;
  let updatedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const item of rows) {
    try {
      const cleanEmail = item.email.toLowerCase().trim();
      const { data: existingProfiles } = await service
        .from("users")
        .select("id, role, status")
        .eq("email", cleanEmail);

      const existing = existingProfiles?.[0];

      if (existing) {
        if (existing.role !== item.role) {
          await updateUserRole(existing.id, item.role, actorId);
        }
        if (existing.status !== (item.status || "ACTIVE")) {
          await updateAccountStatus(existing.id, item.status || "ACTIVE");
        }

        updatedCount++;
        results.push({ row: item.row, email: cleanEmail, status: "updated", userId: existing.id });
      } else {
        const tempPassword = randomBytes(16).toString("hex") + "Aa1!";
        const { data: authData, error: authError } = await service.auth.admin.createUser({
          email: cleanEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { name: item.name.trim(), role: item.role }
        });

        if (authError || !authData?.user?.id) {
          failedCount++;
          results.push({ row: item.row, email: cleanEmail, status: "failed", error: authError?.message || "Failed to create Auth user" });
          continue;
        }

        const newUserId = authData.user.id;
        const profile = await createUser({
          id: newUserId,
          name: item.name.trim(),
          email: cleanEmail,
          role: item.role,
          status: item.status || "ACTIVE",
          employeeId: item.employeeId,
          uniqueId: item.uniqueId || item.employeeId,
          phone: item.phone,
          assignedHostel: item.hostelBlock,
          hostelRoom: item.roomNumber,
          isHosteller: item.isHosteller,
          departmentId: item.department
        });

        if (!profile) {
          await service.auth.admin.deleteUser(newUserId);
          failedCount++;
          results.push({ row: item.row, email: cleanEmail, status: "failed", error: "Failed to persist user profile" });
          continue;
        }

        createdCount++;
        results.push({ row: item.row, email: cleanEmail, status: "created", userId: newUserId });
      }
    } catch (err: any) {
      failedCount++;
      results.push({ row: item.row, email: item.email, status: "failed", error: err?.message || "Internal error during import" });
    }
  }

  await addAudit({
    userId: actorId,
    action: "USER_IMPORT_COMMIT",
    details: { created: createdCount, updated: updatedCount, failed: failedCount, total: rows.length }
  });

  return {
    total: rows.length,
    created: createdCount,
    updated: updatedCount,
    failed: failedCount,
    skipped: skippedCount,
    results
  };
}
