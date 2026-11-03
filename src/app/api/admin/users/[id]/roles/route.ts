import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient, invalidateAllUserSessions } from "@/lib/dbClient";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { withAuthorization } from "@/middleware/authorization";
import { addAudit } from "@/lib/db";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

const ALL_ROLES: Role[] = [
  "operator","admin","sysadmin","supervisor","guardian","parent","hod","student",
  "faculty","staff","worker","visitor","caretaker","deputy_warden",
  "hostel_manager","principal","vice_principal","oie","exam_branch",
];

function userIdFromPath(req: NextRequest): string {
  const segs = new URL(req.url).pathname.split("/").filter(Boolean);
  const idx = segs.indexOf("roles");
  return decodeURIComponent(segs[idx - 1] || "");
}

async function handleGet(req: NextRequest) {
  const userId = userIdFromPath(req);
  const svc = getSupabaseServiceClient();
  const { data } = await svc.from("user_roles").select("role, scope, granted_at").eq("user_id", userId);
  return NextResponse.json({ success: true, data: data || [] });
}

async function handlePost(req: NextRequest, ctx: { auth: AuthContext }) {
  const userId = userIdFromPath(req);
  const body = await req.json().catch(() => ({}));
  const { role, scope, action } = body as { role: Role; scope?: string; action: "grant" | "revoke" };

  if (!role || !ALL_ROLES.includes(role)) {
    return NextResponse.json({ success: false, error: { code: "INVALID_ROLE", message: "Invalid role." } }, { status: 400 });
  }
  if (role === "sysadmin" && ctx.auth.role !== "sysadmin") {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Only sysadmin can grant sysadmin." } }, { status: 403 });
  }

  // M5 (grant_sysadmin): granting the highest role creates a pending
  // operator_action that a different sysadmin must approve. The role is
  // NOT written to user_roles here; the apply-operator-action.sh executor
  // performs the grant after the second human approves.
  if (action === "grant" && role === "sysadmin") {
    const insertRes = await query<{ id: string }>(
      `INSERT INTO public.operator_actions
         (kind, title, payload, risk, status, approver_role, source)
       VALUES ('grant_sysadmin',
               'Grant sysadmin role',
               $1::jsonb, 'high', 'pending', 'sysadmin', 'human')
       RETURNING id`,
      [JSON.stringify({
        requested_by: ctx.auth.userId,
        target_user_id: userId,
        role: "sysadmin",
        scope: scope || null,
      })],
    );
    const actionId = insertRes.rows[0]?.id ?? "";
    await addAudit({
      action: "OPERATOR_ACTION_PENDING_CREATED",
      userId: ctx.auth.userId,
      userName: ctx.auth.email,
      role: ctx.auth.role as Role,
      details: { kind: "grant_sysadmin", actionId, targetUserId: userId, scope: scope || null },
    });
    return NextResponse.json({
      success: true,
      pending: true,
      actionId,
      message: "Grant created. A different sysadmin must approve it.",
    });
  }

  const svc = getSupabaseServiceClient();
  if (action === "revoke") {
    let q = svc.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    if (scope) q = q.eq("scope", scope); else q = q.is("scope", null);
    const { error } = await q;
    if (error) return NextResponse.json({ success: false, error: { code: "DB_ERROR", message: error.message } }, { status: 500 });
  } else {
    const { error } = await svc.from("user_roles").upsert({
      user_id: userId, role, scope: scope || null, granted_by: ctx.auth.userId,
    });
    if (error) return NextResponse.json({ success: false, error: { code: "DB_ERROR", message: error.message } }, { status: 500 });
  }

  await addAudit({
    action: action === "grant" ? "ROLE_GRANTED" : "ROLE_REVOKED",
    userId: ctx.auth.userId,
    userName: ctx.auth.email,
    role: ctx.auth.role as Role,
    details: `${action === "grant" ? "Granted" : "Revoked"} role ${role}${scope ? ` scope '${scope}'` : ""} on user ${userId}`,
  });

   await invalidateAllUserSessions(userId); return NextResponse.json({ success: true });
}

export const GET = withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] });
export const POST = withMutationGuard(handlePost, {requiredRole: ["admin", "sysadmin"]});
