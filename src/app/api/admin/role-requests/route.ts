import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { addAudit, updateUserRole, findUserById } from "@/lib/db";
import { sendNotification } from "@/lib/notification-service";
import { withRateLimit } from "@/lib/rate-limit";
import { withAuthorization } from "@/middleware/authorization";
import type { Role } from "@/lib/types";

const ADMIN_ROLES: Role[] = ["sysadmin", "admin", "faculty", "hod", "staff"];

async function handleGet(req: NextRequest) {
  const actorRole = req.headers.get("x-user-role");

  if (!actorRole || !ADMIN_ROLES.includes(actorRole as Role)) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const supabase = getSupabaseServiceClient();

  try {
    let query = supabase
      .from("role_change_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data: requests, error } = await query;

    if (error) {
      return NextResponse.json({ success: true, data: [] });
    }

    const userIds = Array.from(
      new Set(
        (requests || []).flatMap((r) => [r.requester_id, r.target_user_id, r.approved_by].filter(Boolean))
      )
    );

    let usersMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase.from("users").select("id, name, role, email").in("id", userIds);
      (users || []).forEach((u) => {
        usersMap[u.id] = u;
      });
    }

    const enriched = (requests || []).map((r) => ({
      id: r.id,
      requesterId: r.requester_id,
      requesterName: usersMap[r.requester_id]?.name || "Unknown Requester",
      requesterRole: usersMap[r.requester_id]?.role,
      targetUserId: r.target_user_id,
      targetUserName: usersMap[r.target_user_id]?.name,
      targetUserRole: usersMap[r.target_user_id]?.role,
      requestedRole: r.requested_role,
      status: r.status,
      approvedBy: r.approved_by,
      approverName: usersMap[r.approved_by]?.name,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Internal server error" } },
      { status: 500 }
    );
  }
}

async function handlePost(req: NextRequest) {
  const actorId = req.headers.get("x-user-id");
  const actorRole = req.headers.get("x-user-role");

  if (!actorId || !ADMIN_ROLES.includes(actorRole as Role)) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
      { status: 403 }
    );
  }

  try {
    const { userId, requestedRole, reason } = await req.json().catch(() => ({}));
    const ALL_ROLES: Role[] = ["operator", "admin", "sysadmin", "supervisor", "guardian", "parent", "hod", "student", "warden", "faculty", "staff", "worker", "visitor"];

    if (!userId || !requestedRole || !ALL_ROLES.includes(requestedRole as Role)) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: `Valid requestedRole required. Must be one of: ${ALL_ROLES.join(', ')}` } },
        { status: 400 }
      );
    }

    if (requestedRole === "sysadmin" && actorRole !== "sysadmin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Only sysadmins can request or assign the sysadmin role" } },
        { status: 403 }
      );
    }

    const supabase = getSupabaseServiceClient();
    const { data: targetUser } = await supabase.from("users").select("id, name, role").eq("id", userId).maybeSingle();

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    const { data: request, error: insertError } = await supabase
      .from("role_change_requests")
      .insert({
        requester_id: actorId,
        target_user_id: userId,
        requested_role: requestedRole,
        reason,
        status: "PENDING",
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { success: false, error: { code: "SERVER_ERROR", message: insertError.message } },
        { status: 500 }
      );
    }

    // await addAudit({
      userId: actorId,
      action: "ROLE_REQUEST_CREATED",
      details: { timestamp: new Date().toISOString(), targetId: userId, requestedRole },
    });

    return NextResponse.json({ success: true, data: request });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Internal server error" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(withAuthorization(handleGet, { requiredRole: ADMIN_ROLES }));
export const POST = withRateLimit(withAuthorization(handlePost, { requiredRole: ADMIN_ROLES }));