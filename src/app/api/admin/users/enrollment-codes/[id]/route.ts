import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

/**
 * DELETE /api/admin/users/enrollment-codes/[id]
 * Mark a single enrollment code as used/invalidated immediately.
 */
async function handleDelete(req: NextRequest, ctx: { auth: AuthContext }) {
  const segs = new URL(req.url).pathname.split("/").filter(Boolean);
  // .../api/admin/users/enrollment-codes/<id>  ->  last segment is the id
  const codeId = decodeURIComponent(segs[segs.length - 1] || "");
  if (!codeId) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_CODE_ID", message: "Enrollment code id required" } },
      { status: 400 }
    );
  }

  try {
    const res = await query(
      `UPDATE enrollment_codes SET used_at = NOW()
       WHERE id = $1 AND used_at IS NULL`,
      [codeId]
    );

    if (res.rowCount && res.rowCount > 0) {
      await addAudit({
        action: "ENROLLMENT_CODE_INVALIDATED",
        userId: ctx.auth.userId,
        userName: ctx.auth.email,
        role: ctx.auth.role as Role,
        details: `Invalidated enrollment code ${codeId}`,
      });
      return NextResponse.json({ success: true, message: "Code invalidated." });
    }

    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Code not found or already used." } },
      { status: 404 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "DB_ERROR", message: err?.message || "Failed to invalidate code" } },
      { status: 500 }
    );
  }
}

export const DELETE = withAuthorization(handleDelete, { requiredRole: ["admin", "sysadmin"] });
