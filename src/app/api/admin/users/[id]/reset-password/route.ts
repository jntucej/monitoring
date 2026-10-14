import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { withAdminMutation } from "@/server/http/mutation-guard";
import { query } from "@/lib/postgres";
import { getSupabaseServiceClient, invalidateAllUserSessions } from "@/lib/dbClient";
import { addAudit } from "@/lib/db";
import { invalidateAuthCache } from "@/lib/authContext";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

const MIN_PASSWORD_LEN = 8;

function userIdFromPath(req: NextRequest): string {
  const segs = new URL(req.url).pathname.split("/").filter(Boolean);
  const idx = segs.indexOf("reset-password");
  return idx > 0 ? decodeURIComponent(segs[idx - 1] || "") : "";
}

async function handlePost(req: NextRequest, ctx: { auth: AuthContext }) {
  const userId = userIdFromPath(req);
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_USER_ID", message: "User ID is required" } },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < MIN_PASSWORD_LEN) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_PASSWORD", message: `Password must be at least ${MIN_PASSWORD_LEN} characters` } },
      { status: 400 }
    );
  }

  const actorId = ctx.auth.userId;
  const actorRole = ctx.auth.role as Role;

  try {
    // Department scoping: if the caller's users row carries a department_id,
    // the target must belong to the same department (enforced in the WHERE).
    const caller = await query<{ department_id: string | null }>(
      `SELECT department_id FROM users WHERE id = $1::uuid LIMIT 1`,
      [actorId]
    );
    const callerDept = caller.rows[0]?.department_id ?? null;

    const targetRes = await query<{ id: string; role: string; status: string; department_id: string | null; session_version: number | null }>(
      `
      SELECT id, role, status, department_id, session_version
      FROM users WHERE id = $1::uuid LIMIT 1
      `,
      [userId]
    );
    const target = targetRes.rows[0];
    if (!target) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }
    if (callerDept !== null && target.department_id !== callerDept) {
      return NextResponse.json(
        { success: false, error: { code: "DEPT_SCOPE_DENIED", message: "Cannot reset password for a user outside your department" } },
        { status: 403 }
      );
    }
    // Admins cannot reset a sysadmin's password unless they are themselves
    // a sysadmin (privilege parity).
    if (actorRole !== "sysadmin" && target.role === "sysadmin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Only sysadmin can reset a sysadmin password" } },
        { status: 403 }
      );
    }

    const hash = await bcrypt.hash(password, 10);
    const svc = getSupabaseServiceClient();
    const { error } = await svc
      .from("users")
      .update({
        password_hash: hash,
        session_version: (target.session_version ?? 0) + 1,
        last_password_change: new Date().toISOString(),
        failed_login_count: 0,
        locked_until: null,
      })
      .eq("id", userId);
    if (error) {
      return NextResponse.json(
        { success: false, error: { code: "DB_ERROR", message: error.message } },
        { status: 400 }
      );
    }

    // Revoke outstanding sessions/JWTs so the old credentials stop working
    // immediately (session_version bump + session revocation).
    await invalidateAllUserSessions(userId);
    await query(
      `UPDATE public.sessions SET revoked_at = NOW() WHERE user_id::text = $1 AND revoked_at IS NULL`,
      [userId]
    ).catch(() => null);
    invalidateAuthCache(userId);

    // Clear failed-PIN tracking rows keyed by the user's identifiers.
    const identRes = await query<{ email: string | null; unique_id: string | null; login_identifier: string | null }>(
      `SELECT email, unique_id, login_identifier FROM users WHERE id = $1::uuid`,
      [userId]
    );
    const t = identRes.rows[0];
    for (const ident of [t?.email, t?.unique_id, t?.login_identifier]) {
      if (ident) {
        await query(`DELETE FROM pin_login_attempts WHERE UPPER(identifier) = UPPER($1)`, [ident]).catch(() => null);
      }
    }

    await addAudit({
      action: "PASSWORD_CHANGED",
      userId: actorId,
      userName: ctx.auth.email,
      role: actorRole,
      details: { targetId: userId, resetByAdmin: true },
    });

    return NextResponse.json({ success: true, message: "Password reset" });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: err?.message || "Failed to reset password" } },
      { status: 500 }
    );
  }
}

export const POST = withAdminMutation(handlePost, {
  rateLimit: { keyPrefix: "admin_user_reset_pw", maxRequests: 20, windowMs: 60_000 },
});
