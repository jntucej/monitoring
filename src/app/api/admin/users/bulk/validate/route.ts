import { NextRequest, NextResponse } from "next/server";
import { withAdminMutation } from "@/server/http/mutation-guard";
import { query } from "@/lib/postgres";
import { validateImport } from "@/lib/user-import";
import { getDepartmentFromRoll } from "@/lib/rollNumber";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

/**
 * POST /api/admin/users/bulk/validate
 * LIVE: called by UserManagementPanel (admin console).
 * (The parallel /api/users/bulk/* set is used by CsvBulkImporter + BulkUserImportModal.)
 *
 * Dry-run validation of a bulk import: no DB writes, no audit.
 * Body: { rows: Array<Record<string, string|number|undefined>> }
 * Returns:
 *   { success: true, data: { valid: [...], invalid: [{ index, errors: [...] }], summary } }
 *
 * Validation covers:
 *   - required fields (name, email, roll for students)
 *   - roll-number structure (yyJJVVBBNN)
 *   - role sanity
 *   - duplicate email / roll within the batch
 *   - duplicate email / roll against the live users table
 *   - department scoping when the caller's users row carries a department_id
 */
async function handlePost(req: NextRequest, ctx: { auth: AuthContext }) {
  const body = await req.json().catch(() => ({}));
  const rows: Array<Record<string, unknown>> = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) {
    return NextResponse.json(
      { success: false, error: { code: "EMPTY_ROWS", message: "No rows supplied" } },
      { status: 400 }
    );
  }
  if (rows.length > 5000) {
    return NextResponse.json(
      { success: false, error: { code: "TOO_MANY_ROWS", message: "Batch too large (max 5000 rows)" } },
      { status: 400 }
    );
  }

  try {
    // Reuse the shared validation engine so header-alias / roll-decode /
    // role rules stay in one place. validateImport accepts a raw array of
    // record objects directly (csv input string or array).
    const result = await validateImport(rows as unknown as Parameters<typeof validateImport>[0] extends string | infer T ? T : never);

    // ---- Duplicate detection against the live users table ----------------
    const allEmails = Array.from(
      new Set(
        result.validRows
          .map((r) => (r.email ? String(r.email).toLowerCase() : null))
          .filter(Boolean) as string[]
      )
    );
    const allRolls = Array.from(
      new Set(
        result.validRows
          .map((r) =>
            r.roll || r.uniqueId ? String(r.roll || r.uniqueId).toUpperCase() : null
          )
          .filter(Boolean) as string[]
      )
    );

    const foundEmails = new Set<string>();
    for (let i = 0; i < allEmails.length; i += 500) {
      const chunk = allEmails.slice(i, i + 500);
      const ph = chunk.map((_, i) => `$${i + 1}`);
      const res = await query<{ email: string | null }>(
        `SELECT email FROM users WHERE LOWER(email) IN (${ph.join(",")})`,
        chunk
      );
      for (const row of res.rows) if (row.email) foundEmails.add(row.email.toLowerCase());
    }
    const foundRolls = new Set<string>();
    for (let i = 0; i < allRolls.length; i += 500) {
      const chunk = allRolls.slice(i, i + 500);
      const ph = chunk.map((_, i) => `$${i + 1}`);
      const res = await query<{ unique_id: string | null }>(
        `SELECT unique_id FROM users WHERE UPPER(unique_id) IN (${ph.join(",")})`,
        chunk
      );
      for (const row of res.rows) if (row.unique_id) foundRolls.add(String(row.unique_id).toUpperCase());
    }

    // ---- Merge into per-row results ---------------------------------------
    const invalid: Array<{ index: number; errors: string[] }> = [];
    const valid: unknown[] = [];
    const seenEmails = new Set<string>();
    const seenRolls = new Set<string>();

    // validRows is a subset of rows in the same order. Walk result.errors
    // by original row number, and the valid entries by position.
    const errorByRow = new Map<number, string[]>();
    for (const e of result.errors) {
      const list = errorByRow.get(e.row) ?? [];
      list.push(e.message);
      errorByRow.set(e.row, list);
    }

    // Map validRows index -> original row index. The engine's validRows is
    // built by walking rawRows in order, so validRows[i] corresponds to the
    // i-th row that passed. We reconstruct the mapping by scanning rows.
    let validIdx = 0;
    for (let i = 0; i < rows.length; i++) {
      const rowErrors: string[] = [...(errorByRow.get(i + 1) ?? [])];
      const r = result.validRows[validIdx];
      const rowPassedEngine = !!r;
      if (rowPassedEngine) {
        const em = r.email ? String(r.email).toLowerCase() : "";
        const roll = r.roll || r.uniqueId ? String(r.roll || r.uniqueId).toUpperCase() : "";
        if (em && foundEmails.has(em)) rowErrors.push(`Email ${em} already exists`);
        if (roll && foundRolls.has(roll)) rowErrors.push(`Roll/unique id ${roll} already exists`);
        if (em && seenEmails.has(em)) rowErrors.push(`Duplicate email ${em} within this batch`);
        if (roll && seenRolls.has(roll)) rowErrors.push(`Duplicate roll ${roll} within this batch`);
        seenEmails.add(em);
        seenRolls.add(roll);
        validIdx++;
      }

      if (rowErrors.length > 0) {
        invalid.push({ index: i, errors: rowErrors });
      } else if (rowPassedEngine) {
        valid.push(r);
      }
    }

    // ---- Department scoping preview (dry-run) -----------------------------
    // If the caller has a department_id, reject any row whose decoded
    // department differs from the caller's. This mirrors the hard gate the
    // commit route enforces.
    if (ctx.auth.departmentId) {
      const callerDeptCode = ctx.auth.departmentId;
      const deptValid: unknown[] = [];
      const deptInvalid: Array<{ index: number; errors: string[] }> = [];
      let position = 0;
      for (let i = 0; i < valid.length; i++) {
        const r = valid[i] as { roll?: string; uniqueId?: string; department?: string };
        const roll = r.roll || r.uniqueId;
        const rollDept = roll ? getDepartmentFromRoll(roll) : null;
        const dept = (r.department || rollDept || "").toString().toUpperCase();
        if (dept && dept !== callerDeptCode.toUpperCase()) {
          deptInvalid.push({
            index: position,
            errors: [`Department "${dept}" is outside your scope "${callerDeptCode}"`],
          });
        } else {
          deptValid.push(r);
        }
        position++;
      }
      return NextResponse.json({
        success: true,
        data: {
          valid: deptValid,
          invalid: [...invalid, ...deptInvalid],
          summary: {
            total: rows.length,
            valid: deptValid.length,
            invalid: invalid.length + deptInvalid.length,
            deptScoped: true,
            dept: callerDeptCode,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        valid,
        invalid,
        summary: {
          total: rows.length,
          valid: valid.length,
          invalid: invalid.length,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: err?.message || "Validation failed" } },
      { status: 500 }
    );
  }
}

export const POST = withAdminMutation(handlePost, {
  rateLimit: { keyPrefix: "admin_bulk_validate", maxRequests: 30, windowMs: 60_000 },
});
