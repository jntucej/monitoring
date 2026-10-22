import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { withAdminMutation } from "@/server/http/mutation-guard";
import { query } from "@/lib/postgres";
import { getSupabaseServiceClient, invalidateAllUserSessions } from "@/lib/dbClient";
import { addAudit, linkParentToStudent } from "@/lib/db";
import type { Role, AccountStatus } from "@/lib/types";

const ALLOWED_STATUSES: AccountStatus[] = ["ACTIVE", "SUSPENDED"];

function userIdFromPath(req: NextRequest): string {
  const segs = new URL(req.url).pathname.split("/").filter(Boolean);
  const idx = segs.indexOf("reset-password");
  if (idx > 0) return decodeURIComponent(segs[idx - 1] || "");
  const idx2 = segs.indexOf("reset-pin");
  if (idx2 > 0) return decodeURIComponent(segs[idx2 - 1] || "");
  return decodeURIComponent(segs[segs.length - 1] || "");
}

/** Resolve the caller's users row (department scoping) for admin/sysadmin. */
async function callerDepartment(ctx: { auth: { userId: string } }): Promise<string | null> {
  const res = await query<{ department_id: string | null }>(
    `SELECT department_id FROM users WHERE id = $1::uuid LIMIT 1`,
    [ctx.auth.userId]
  );
  return res.rows[0]?.department_id ?? null;
}

async function fetchTargetUser(userId: string, deptScope: string | null) {
  const params: unknown[] = [userId];
  let sql = `
    SELECT u.*, sd.guardian_id, ed.employee_id
    FROM users u
    LEFT JOIN student_details sd ON sd.user_id = u.id
    LEFT JOIN employee_details ed ON ed.user_id = u.id
    WHERE u.id = $1::uuid`;
  params.push(deptScope);
  sql += ` AND u.department_id IS NOT DISTINCT FROM $2::text`;
  const res = await query<any>(sql, params);
  return res.rows[0] ?? null;
}

async function handleGet(req: NextRequest, ctx: { auth: { userId: string; role: Role } }) {
  const userId = userIdFromPath(req);
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_USER_ID", message: "User ID is required" } },
      { status: 400 }
    );
  }
  try {
    const callerDept = await callerDepartment(ctx);
    const target = await fetchTargetUser(userId, callerDept);
    if (!target) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }
    // Never leak credential hashes in admin responses.
    const { password_hash, pin_hash, initial_pin_hash, ...safe } = target;
    return NextResponse.json({
      success: true,
      data: {
        ...safe,
        guardianId: target.guardian_id ?? null,
        employeeId: target.employee_id ?? null,
        scoped: callerDept !== null,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: err?.message || "Failed to fetch user" } },
      { status: 500 }
    );
  }
}

async function handlePatch(req: NextRequest, ctx: { auth: { userId: string; role: Role; email?: string } }) {
  const userId = userIdFromPath(req);
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_USER_ID", message: "User ID is required" } },
      { status: 500 }
    );
  }
  const actorId = ctx.auth.userId;
  const actorRole = ctx.auth.role;

  try {
    // Load caller's users row for department scoping (server-side enforcement).
    const caller = await query<{ department_id: string | null }>(
      `SELECT department_id FROM users WHERE id = $1::uuid LIMIT 1`,
      [actorId]
    );
    const callerDept = caller.rows[0]?.department_id ?? null;

    // Load target user, scoped to caller's department when set.
    const targetRes = await query<any>(
      `
      SELECT u.*, sd.guardian_id FROM users u
      LEFT JOIN student_details sd ON sd.user_id = u.id
      WHERE u.id = $1::uuid
        AND u.department_id IS NOT DISTINCT FROM $2::text
      `,
      [userId, callerDept]
    );
    const target = targetRes.rows[0];
    if (!target) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const changes: string[] = [];

    // 1) status — admin may only toggle ACTIVE <-> SUSPENDED.
    if (body.status !== undefined) {
      const nextStatus = String(body.status).toUpperCase() as AccountStatus;
      if (!ALLOWED_STATUSES.includes(nextStatus)) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_STATUS", message: "status must be ACTIVE or SUSPENDED" } },
          { status: 400 }
        );
      }
      if (nextStatus !== target.status) {
        const svc = getSupabaseServiceClient();
        const { error } = await svc.from("users").update({ status: nextStatus }).eq("id", userId);
        if (error) {
          return NextResponse.json(
            { success: false, error: { code: "DB_ERROR", message: error.message } },
            { status: 400 }
          );
        }
        await invalidateAllUserSessions(userId);
        changes.push(`status ${target.status} -> ${nextStatus}`);
        if (nextStatus === "SUSPENDED") {
          await addAudit({
            action: "USER_DEACTIVATED",
            userId: actorId,
            userName: ctx.auth.email,
            role: actorRole,
            details: { targetId: userId, from: target.status, to: nextStatus, reason: "admin PATCH" },
          });
        }
        await addAudit({
          action: "ACCOUNT_STATUS_CHANGED",
          userId: actorId,
          userName: ctx.auth.email,
          role: actorRole,
          details: { targetId: userId, from: target.status, to: nextStatus },
        });
      }
    }

    // 2) name — plain profile field.
    if (body.name !== undefined && body.name !== null) {
      const name = String(body.name).trim();
      if (!name) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_NAME", message: "name cannot be empty" } },
          { status: 400 }
        );
      }
      const svc = getSupabaseServiceClient();
      const { error } = await svc.from("users").update({ name }).eq("id", userId);
      if (error) {
        return NextResponse.json(
          { success: false, error: { code: "DB_ERROR", message: error.message } },
          { status: 400 }
        );
      }
      changes.push("name updated");
    }

    // 3) departmentId — move user to another department. If the caller is
    //    department-scoped, they may only keep the user inside their own dept.
    if (body.departmentId !== undefined) {
      const nextDept = body.departmentId === null ? null : String(body.departmentId);
      if (callerDept !== null && nextDept !== null && nextDept !== callerDept) {
        return NextResponse.json(
          { success: false, error: { code: "DEPT_SCOPE_DENIED", message: "Cannot move user outside your department" } },
          { status: 403 }
        );
      }
      const svc = getSupabaseServiceClient();
      const { error } = await svc.from("users").update({ department_id: nextDept }).eq("id", userId);
      if (error) {
        return NextResponse.json(
          { success: false, error: { code: "DB_ERROR", message: error.message } },
          { status: 400 }
        );
      }
      changes.push("departmentId updated");
    }

    // 4) guardianId — link/unlink guardian on student_details.
    if (body.guardianId !== undefined) {
      const guardianId = body.guardianId === null ? null : String(body.guardianId);
      if (guardianId !== null) {
        const g = await query<{ id: string }>(`SELECT id FROM users WHERE id = $1::uuid LIMIT 1`, [guardianId]);
        if (!g.rows[0]) {
          return NextResponse.json(
            { success: false, error: { code: "GUARDIAN_NOT_FOUND", message: "Guardian user does not exist" } },
            { status: 400 }
          );
        }
      }
      await linkParentToStudent(userId, guardianId, actorId);
      changes.push(guardianId ? "guardian linked" : "guardian unlinked");
    }

    // 5) Catch-all: reject any attempt to smuggle privileged fields through.
    const forbidden = ["role", "password", "initialPinHash", "pin", "pinHash", "flagStatus", "flag_status", "flags"];
    for (const k of forbidden) {
      if (body[k] !== undefined) {
        return NextResponse.json(
          { success: false, error: { code: "FIELD_NOT_ALLOWED", message: `Field "${k}" is not allowed on this endpoint; use the dedicated routes` } },
          { status: 400 }
        );
      }
    }

    await addAudit({
      action: "USER_UPDATED",
      userId: actorId,
      userName: ctx.auth.email,
      role: actorRole,
      details: { targetId: userId, changes, adminRoute: true },
    });

    return NextResponse.json({ success: true, message: "User updated", changes });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: err?.message || "Failed to update user" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "admin_user_get", maxRequests: 60, windowMs: 60_000 }
);
export const PATCH = withAdminMutation(handlePatch, {
  rateLimit: { keyPrefix: "admin_user_patch", maxRequests: 30, windowMs: 60_000 },
});
