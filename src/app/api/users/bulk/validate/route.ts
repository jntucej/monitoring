/* eslint-disable */
// src/app/api/users/bulk/validate/route.ts
// LIVE: called by CsvBulkImporter and BulkUserImportModal (sysadmin console).
// (The parallel /api/admin/users/bulk/* set is used by UserManagementPanel.)
import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { validateImport, type ValidationResult, type ImportRow, type ValidationError } from "@/lib/user-import";
import { getSupabaseServiceClient } from "@/lib/dbClient";

/**
 * Check that none of the validated rows target an existing student.
 * Bulk import must ONLY create new students — it never updates or overwrites
 * an existing one. We reject any row whose email / roll / unique_id /
 * employee_id already exists, distinguishing the "roll change attempt" case
 * (an email already bound to a DIFFERENT roll).
 */
async function applyRollImmutability(result: ValidationResult): Promise<void> {
  const svc = getSupabaseServiceClient();
  const emailSet = new Set(
    result.validRows.map((r) => (r.email ? String(r.email).toLowerCase() : "")).filter(Boolean)
  );
  const rollSet = new Set(
    result.validRows
      .map((r) => (r.roll ? String(r.roll).toUpperCase() : r.uniqueId ? String(r.uniqueId).toUpperCase() : ""))
      .filter(Boolean)
  );
  const empSet = new Set(
    result.validRows.map((r) => (r.employeeId ? String(r.employeeId).toUpperCase() : "")).filter(Boolean)
  );

  // Fetch existing identity rows. email → roll binding so we can flag a
  // roll-change attempt (email reused with a different roll).
  const existing: Array<{ email: string | null; roll: string | null; unique_id: string | null; employee_id: string | null }> = [];
  if (emailSet.size) {
    const { data } = await svc
      .from("users")
      .select("email, unique_id, student_details(roll), employee_details(employee_id)")
      .in("email", Array.from(emailSet));
    for (const row of data ?? []) {
      const rec = row as unknown as {
        email?: string | null;
        unique_id?: string | null;
        student_details?: { roll?: string | null } | null;
        employee_details?: { employee_id?: string | null } | null;
      };
      existing.push({
        email: rec.email ?? null,
        roll: rec.student_details?.roll ?? null,
        unique_id: rec.unique_id ?? null,
        employee_id: rec.employee_details?.employee_id ?? null,
      });
    }
  }
  if (rollSet.size) {
    const { data } = await svc
      .from("student_details")
      .select("roll, user_id")
      .in("roll", Array.from(rollSet));
    for (const row of data ?? []) {
      const rec = row as unknown as { roll?: string; user_id?: string };
      if (rec.roll) existing.push({ email: null, roll: String(rec.roll), unique_id: null, employee_id: null });
    }
  }
  if (empSet.size) {
    const { data } = await svc
      .from("employee_details")
      .select("employee_id, user_id")
      .in("employee_id", Array.from(empSet));
    for (const row of data ?? []) {
      const rec = row as unknown as { employee_id?: string };
      if (rec.employee_id) existing.push({ email: null, roll: null, unique_id: null, employee_id: String(rec.employee_id) });
    }
  }

  // Build lookup maps.
  const byRoll = new Map<string, string | null>(); // roll → bound email
  const byEmail = new Map<string, string | null>(); // email(lower) → bound roll
  const byUnique = new Set<string>();
  const byEmp = new Set<string>();
  for (const r of existing) {
    const emailKey = r.email ? r.email.toLowerCase() : "";
    const rollKey = r.roll ? String(r.roll).toUpperCase() : "";
    if (rollKey) byRoll.set(rollKey, r.email ?? null);
    if (emailKey) byEmail.set(emailKey, r.roll ?? null);
    if (r.unique_id) byUnique.add(String(r.unique_id).toUpperCase());
    if (r.employee_id) byEmp.add(String(r.employee_id).toUpperCase());
  }

  // Reject conflicting rows. One clear error per row (first match wins).
  const rejected = new Set<number>();
  let importedBefore = 0;
  const newValid: ImportRow[] = [];
  result.validRows.forEach((r, i) => {
    const em = r.email ? String(r.email).toLowerCase() : "";
    const roll = r.roll ? String(r.roll).toUpperCase() : "";
    const uniq = r.uniqueId ? String(r.uniqueId).toUpperCase() : "";
    const emp = r.employeeId ? String(r.employeeId).toUpperCase() : "";

    let conflict: string | null = null;
    if (roll && byRoll.has(roll)) {
      conflict = `roll '${roll}' already exists — bulk import cannot modify or re-create an existing student`;
    } else if (em && byEmail.has(em)) {
      const bound = byEmail.get(em)!;
      if (roll && bound && String(bound).toUpperCase() !== roll) {
        conflict = `email '${em}' belongs to roll '${bound}' — roll numbers cannot be changed via bulk import`;
      } else {
        conflict = `email '${em}' already exists`;
      }
    } else if (uniq && byUnique.has(uniq)) {
      conflict = `unique ID '${uniq}' already exists`;
    } else if (emp && byEmp.has(emp)) {
      conflict = `employee ID '${emp}' already exists`;
    }

    if (conflict) {
      rejected.add(i);
      importedBefore++;
      result.errors.push({ row: i + 1, field: "roll", message: conflict } as ValidationError);
    } else {
      newValid.push(r);
    }
  });

  result.validRows = newValid;
  result.summary.valid = newValid.length;
  result.summary.invalid = result.errors.length;
  (result as unknown as { importedBefore?: number }).importedBefore = importedBefore;
}

async function handlePost(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const csv = body.csv || body.csvText || body.content || body.rows || "";
    if (!csv) {
      return NextResponse.json({ success: false, error: { message: "No CSV content supplied" } }, { status: 400 });
    }
    const result = await validateImport(csv);
    // Enforce roll immutability: reject any row that targets an existing student.
    await applyRollImmutability(result);
    return NextResponse.json({ success: true, data: result, ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message || "Validation failed" } }, { status: 500 });
  }
}

export const POST = withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] });
