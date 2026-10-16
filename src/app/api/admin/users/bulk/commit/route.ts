import { NextRequest, NextResponse } from "next/server";
import { withAdminMutation } from "@/server/http/mutation-guard";
import { commitImport, type ImportRow } from "@/lib/user-import";
import { getDepartmentFromRoll } from "@/lib/rollNumber";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

// LIVE: called by UserManagementPanel (admin console).
// (The parallel /api/users/bulk/* set is used by CsvBulkImporter + BulkUserImportModal.)
/**
 * Roles an admin may grant through the admin bulk-commit path.
 * The `user_roles` table lets an admin grant operational roles, but the
 * `users.role` column itself (what commitImport upserts) must stay inside
 * this allow-list. `admin` and `sysadmin` are NEVER granted here.
 */
const ALLOWED_BULK_ROLES = new Set([
  "student",
  "staff",
  "faculty",
  "operator",
  "guardian",
  "parent",
  "hod",
  "worker",
  "supervisor",
  "visitor",
  "caretaker",
  "deputy_warden",
  "hostel_manager",
  "principal",
  "vice_principal",
  "oie",
  "exam_branch",
  "mess_incharge",
]);

function defaultRoleFor(row: ImportRow): Role {
  const raw = String(row.role ?? "student").toLowerCase() as Role;
  if (ALLOWED_BULK_ROLES.has(raw)) return raw;
  // Fall back to the least-privileged operational role.
  return "student";
}

async function handlePost(req: NextRequest, ctx: { auth: AuthContext }) {
  const body = await req.json().catch(() => ({}));
  if (body.confirm !== "BULK_IMPORT") {
    return NextResponse.json(
      { success: false, error: { code: "CONFIRM_REQUIRED", message: 'Body must include { confirm: "BULK_IMPORT" }' } },
      { status: 400 }
    );
  }
  const rows: ImportRow[] = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) {
    return NextResponse.json(
      { success: false, error: { code: "EMPTY_ROWS", message: "No rows supplied" } },
      { status: 400 }
    );
  }

  const actorId = ctx.auth.userId;
  const actorRole = ctx.auth.role as Role;

  // Department scoping: if the caller's users row has a department_id, every
  // row's department must match. (Enforced in the WHERE, not the UI.)
  if (ctx.auth.departmentId) {
    const callerDept = ctx.auth.departmentId;
    for (const row of rows) {
      const roll = row.roll || row.uniqueId;
      const rollDept = roll ? getDepartmentFromRoll(roll) : null;
      const dept = (row.department || rollDept || "").toString().toUpperCase();
      if (dept && dept !== callerDept.toUpperCase()) {
        return NextResponse.json(
          { success: false, error: { code: "DEPT_SCOPE_DENIED", message: `Row with department "${dept}" is outside your scope "${callerDept}"` } },
          { status: 403 }
        );
      }
    }
  }

  // Normalize the role column to an allowed operational role; reject any row
  // that tries to sneak in admin/sysadmin.
  for (const row of rows) {
    if (row.role && !ALLOWED_BULK_ROLES.has(row.role as string)) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN_ROLE", message: `Role "${row.role}" cannot be granted via admin bulk import` } },
        { status: 403 }
      );
    }
    row.role = defaultRoleFor(row);
  }

  try {
    const result = await commitImport(rows, actorId, true);

    // One canonical BULK_USER_IMPORT audit entry.
    await addAudit({
      action: "BULK_USER_IMPORT",
      userId: actorId,
      userName: ctx.auth.email,
      role: actorRole,
      details: {
        count: rows.length,
        actorId,
        committedAt: new Date().toISOString(),
        importedCount: result.importedCount,
        failedCount: result.failedCount,
      },
    });

    return NextResponse.json({
      success: result.success,
      data: {
        importedCount: result.importedCount,
        failedCount: result.failedCount,
        errors: result.errors,
      },
      message: `Imported ${result.importedCount}, failed ${result.failedCount}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: err?.message || "Bulk commit failed" } },
      { status: 500 }
    );
  }
}

export const POST = withAdminMutation(handlePost, {
  rateLimit: { keyPrefix: "admin_bulk_commit", maxRequests: 10, windowMs: 60_000 },
});
