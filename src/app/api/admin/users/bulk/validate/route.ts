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

    // ---- Duplicate detection against the live tables ----------------
    // Bulk import must ONLY create new students. It must never update or
    // overwrite an existing student. We check all four identity fields
    // (email / roll / unique_id / employee_id) in a single query and reject
    // any row that collides. We also distinguish the "roll change attempt"
    // case: an email already bound to a DIFFERENT roll.
    const emailList = Array.from(
      new Set(
        result.validRows
          .map((r) => (r.email ? String(r.email).toLowerCase() : null))
          .filter(Boolean) as string[]
      )
    );
    const rollList = Array.from(
      new Set(
        result.validRows
          .map((r) =>
            r.roll ? String(r.roll).toUpperCase() : null
          )
          .filter(Boolean) as string[]
      )
    );
    const uniqueList = Array.from(
      new Set(
        result.validRows
          .map((r) =>
            r.uniqueId ? String(r.uniqueId).toUpperCase() : null
          )
          .filter(Boolean) as string[]
      )
    );
    const empList = Array.from(
      new Set(
        result.validRows
          .map((r) =>
            r.employeeId ? String(r.employeeId).toUpperCase() : null
          )
          .filter(Boolean) as string[]
      )
    );

    // Single query fetching the existing identity rows across all four fields.
    // We fetch the email→roll binding so we can detect a "roll change attempt".
    const existing: Array<{
      email: string | null;
      unique_id: string | null;
      roll: string | null;
      employee_id: string | null;
    }> = [];

    if (emailList.length || rollList.length || uniqueList.length || empList.length) {
      // Build a single OR-of-equality query with chunks to stay under the
      // 65535 placeholder limit. We batch per-field with small chunks.
      const chunk = 500;
      const ph = (i: number) => `$${i + 1}`;
      let slot = 1;

      for (let i = 0; i < emailList.length; i += chunk) {
        const c = emailList.slice(i, i + chunk);
        const phs = c.map((_, k) => ph(slot + k));
        slot += c.length;
        const res = await query<{ email: string; unique_id: string | null; roll: string | null; employee_id: string | null }>(
          `SELECT u.email, u.unique_id, sd.roll, ed.employee_id
             FROM users u
             LEFT JOIN student_details  sd ON sd.user_id = u.id
             LEFT JOIN employee_details ed ON ed.user_id = u.id
            WHERE LOWER(u.email) IN (${phs.join(",")})`,
          c
        );
        existing.push(...res.rows.map((r) => ({ email: r.email, unique_id: r.unique_id ?? null, roll: r.roll ?? null, employee_id: r.employee_id ?? null })));
      }

      // Rolls / unique ids / employee ids may not have been caught by the email
      // branch above (e.g. email in the CSV differs from the stored one).
      const needMoreRoll = rollList.length + uniqueList.length + empList.length > 0;
      if (needMoreRoll) {
        for (let i = 0; i < rollList.length; i += chunk) {
          const c = rollList.slice(i, i + chunk);
          const phs = c.map((_, k) => ph(slot + k));
          slot += c.length;
          const res = await query<{ email: string; unique_id: string | null; roll: string | null; employee_id: string | null }>(
            `SELECT u.email, u.unique_id, sd.roll, ed.employee_id
               FROM users u
               LEFT JOIN student_details  sd ON sd.user_id = u.id
               LEFT JOIN employee_details ed ON ed.user_id = u.id
              WHERE UPPER(sd.roll) IN (${phs.join(",")})`,
            c
          );
          existing.push(...res.rows.map((r) => ({ email: r.email, unique_id: r.unique_id ?? null, roll: r.roll ?? null, employee_id: r.employee_id ?? null })));
        }
        for (let i = 0; i < uniqueList.length; i += chunk) {
          const c = uniqueList.slice(i, i + chunk);
          const phs = c.map((_, k) => ph(slot + k));
          slot += c.length;
          const res = await query<{ email: string; unique_id: string | null; roll: string | null; employee_id: string | null }>(
            `SELECT u.email, u.unique_id, sd.roll, ed.employee_id
               FROM users u
               LEFT JOIN student_details  sd ON sd.user_id = u.id
               LEFT JOIN employee_details ed ON ed.user_id = u.id
              WHERE UPPER(u.unique_id) IN (${phs.join(",")})`,
            c
          );
          existing.push(...res.rows.map((r) => ({ email: r.email, unique_id: r.unique_id ?? null, roll: r.roll ?? null, employee_id: r.employee_id ?? null })));
        }
        for (let i = 0; i < empList.length; i += chunk) {
          const c = empList.slice(i, i + chunk);
          const phs = c.map((_, k) => ph(slot + k));
          slot += c.length;
          const res = await query<{ email: string; unique_id: string | null; roll: string | null; employee_id: string | null }>(
            `SELECT u.email, u.unique_id, sd.roll, ed.employee_id
               FROM users u
               LEFT JOIN student_details  sd ON sd.user_id = u.id
               LEFT JOIN employee_details ed ON ed.user_id = u.id
              WHERE UPPER(ed.employee_id) IN (${phs.join(",")})`,
            c
          );
          existing.push(...res.rows.map((r) => ({ email: r.email, unique_id: r.unique_id ?? null, roll: r.roll ?? null, employee_id: r.employee_id ?? null })));
        }
      }
    }

    // Build lookup maps.
    const byRoll = new Map<string, { email: string | null; roll: string | null }>();
    const byEmail = new Map<string, { roll: string | null }>();
    const byUnique = new Set<string>();
    const byEmp = new Set<string>();
    for (const r of existing) {
      const emailKey = r.email ? r.email.toLowerCase() : "";
      const rollKey = r.roll ? String(r.roll).toUpperCase() : "";
      if (rollKey) byRoll.set(rollKey, { email: r.email ?? null, roll: r.roll ?? null });
      if (emailKey) byEmail.set(emailKey, { roll: r.roll ?? null });
      if (r.unique_id) byUnique.add(String(r.unique_id).toUpperCase());
      if (r.employee_id) byEmp.add(String(r.employee_id).toUpperCase());
    }

    // ---- Merge into per-row results ---------------------------------------
    // One clear error per row: the FIRST matching identity conflict wins, so a
    // re-upload reports "roll already exists" rather than a cascade.
    const invalid: Array<{ index: number; errors: string[] }> = [];
    const valid: unknown[] = [];
    const seenEmails = new Set<string>();
    const seenRolls = new Set<string>();
    const conflicts = new Set<number>(); // original row indexes rejected

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
    let importedBefore = 0;
    for (let i = 0; i < rows.length; i++) {
      const rowErrors: string[] = [...(errorByRow.get(i + 1) ?? [])];
      const r = result.validRows[validIdx];
      const rowPassedEngine = !!r;
      if (rowPassedEngine) {
        const em = r.email ? String(r.email).toLowerCase() : "";
        const roll = r.roll ? String(r.roll).toUpperCase() : "";
        const uniq = r.uniqueId ? String(r.uniqueId).toUpperCase() : "";
        const emp = r.employeeId ? String(r.employeeId).toUpperCase() : "";

        // 1. Roll already exists → reject. Roll is immutable.
        if (roll && byRoll.has(roll)) {
          rowErrors.push(`roll '${roll}' already exists — bulk import cannot modify or re-create an existing student`);
          conflicts.add(i);
        }
        // 2. Email exists — either a plain duplicate, or a roll-change attempt
        //    (email is already bound to a DIFFERENT roll).
        else if (em && byEmail.has(em)) {
          const hit = byEmail.get(em)!;
          if (roll && hit.roll && String(hit.roll).toUpperCase() !== roll) {
            rowErrors.push(`email '${em}' belongs to roll '${hit.roll}' — roll numbers cannot be changed via bulk import`);
          } else {
            rowErrors.push(`email '${em}' already exists`);
          }
          conflicts.add(i);
        }
        // 3. unique_id already exists → reject.
        else if (uniq && byUnique.has(uniq)) {
          rowErrors.push(`unique ID '${uniq}' already exists`);
          conflicts.add(i);
        }
        // 4. employee_id already exists → reject.
        else if (emp && byEmp.has(emp)) {
          rowErrors.push(`employee ID '${emp}' already exists`);
          conflicts.add(i);
        }
        // In-batch duplicates (still apply when no DB collision hit above).
        if (!conflicts.has(i)) {
          if (em && seenEmails.has(em)) rowErrors.push(`Duplicate email ${em} within this batch`);
          if (roll && seenRolls.has(roll)) rowErrors.push(`Duplicate roll ${roll} within this batch`);
        }
        seenEmails.add(em);
        seenRolls.add(roll);
        validIdx++;
      }

      if (rowErrors.length > 0) {
        invalid.push({ index: i, errors: rowErrors });
        if (conflicts.has(i)) importedBefore++;
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
          importedBefore,
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
        importedBefore,
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
