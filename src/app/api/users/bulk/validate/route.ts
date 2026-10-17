/* eslint-disable */
// src/app/api/users/bulk/validate/route.ts
// LIVE: called by CsvBulkImporter and BulkUserImportModal (sysadmin console).
// (The parallel /api/admin/users/bulk/* set is used by UserManagementPanel.)
import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { validateImport, type ValidationResult } from "@/lib/user-import";
import { getSupabaseServiceClient } from "@/lib/dbClient";

/**
 * Classify rows whose ROLL already exists in the DB as "skipped" (they are
 * left untouched — bulk import never updates an existing student). The roll is
 * the SOLE uniqueness key: empty-field / required-field problems are the only
 * thing that makes a row "invalid". Email / unique / employee collisions do
 * NOT reject a row.
 */
async function classifyExistingRolls(result: ValidationResult): Promise<void> {
  const svc = getSupabaseServiceClient();
  const rolls = Array.from(
    new Set(
      result.validRows
        .map((r) => (r.roll ? String(r.roll).toUpperCase() : r.uniqueId ? String(r.uniqueId).toUpperCase() : ""))
        .filter(Boolean)
    )
  );

  const skippedRows: Array<{ row: number; roll: string; name?: string }> = [];
  if (rolls.length > 0) {
    const existing = new Set<string>();
    const BATCH = 500;
    for (let i = 0; i < rolls.length; i += BATCH) {
      const chunk = rolls.slice(i, i + BATCH);
      const { data } = await svc.from("student_details").select("roll, user_id").in("roll", chunk);
      for (const row of data ?? []) {
        if (row && row.roll) existing.add(String(row.roll).toUpperCase());
      }
      const { data: uq } = await svc.from("users").select("unique_id").in("unique_id", chunk);
      for (const row of uq ?? []) {
        if (row && row.unique_id) existing.add(String(row.unique_id).toUpperCase());
      }
    }

    const kept: typeof result.validRows = [];
    result.validRows.forEach((r, i) => {
      const roll = r.roll ? String(r.roll).toUpperCase() : r.uniqueId ? String(r.uniqueId).toUpperCase() : "";
      if (roll && existing.has(roll)) {
        skippedRows.push({ row: i + 1, roll, name: r.name });
      } else {
        kept.push(r);
      }
    });
    result.validRows = kept;
  }

  result.skippedRows = skippedRows;
  result.importedBefore = skippedRows.length;
  result.summary.invalid = result.errors.length;
  result.summary.valid = result.validRows.length;
  result.summary.skipped = skippedRows.length;
}

async function handlePost(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const csv = body.csv || body.csvText || body.content || body.rows || "";
    if (!csv) {
      return NextResponse.json({ success: false, error: { message: "No CSV content supplied" } }, { status: 400 });
    }
    const result = await validateImport(csv);
    // Classify existing-roll rows as skipped (roll = sole uniqueness key).
    await classifyExistingRolls(result);
    return NextResponse.json({ success: true, data: result, ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message || "Validation failed" } }, { status: 500 });
  }
}

export const POST = withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] });
