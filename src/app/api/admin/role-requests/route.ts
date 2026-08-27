import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
import { addAudit, updateUserRole, findUserById } from "@/lib/db";
import { sendNotification } from "@/lib/notification-service";
import { withRateLimit } from "@/lib/rate-limit";

async function handleGet(req: NextRequest) {
  const actorRole = req.headers.get("x-user-role");
  if (!actorRole || !["sysadmin", "admin", "faculty", "hod", "staff"].includes(actorRole)) {
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
      // If table doesn't exist yet or query fails, return empty list gracefully
      return NextResponse.json({ success: true, data: [] });
    }

    // Fetch associated user names for targets & requesters
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
      requesterRole: usersMap[r.requester_id]?.role || "unknown",
      targetUserId: r.target_user_id,
      targetUserName: usersMap[r.target_user_id]?.name || "Unknown Target",
      targetCurrentRole: usersMap[r.target_user_id]?.role || "unknown",
      newRole: r.new_role,
      status: r.status,
      reason: r.reason,
      approvedBy: r.approved_by,
      approverName: r.approved_by ? usersMap[r.approved_by]?.name : null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch (err: any) {
    return NextResponse.json({ success: true, data: [] });
  }
}

async function handlePost(req: NextRequest) {
  const actorId = req.headers.get("x-user-id");
  if (!actorId) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  try {
    const { targetUserId, newRole, reason } = await req.json().catch(() => ({}));

    if (!targetUserId || !newRole) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Target user ID and new role are required" } },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();

    const { data: created, error } = await supabase
      .from("role_change_requests")
      .insert({
        requester_id: actorId,
        target_user_id: targetUserId,
        new_role: newRole,
        reason: reason || "Role promotion requested",
        status: "PENDING",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: { code: "DATABASE_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    const actor = await findUserById(actorId);
    await addAudit({
      userId: actorId,
      action: "ROLE_PROMOTION_REQUESTED",
      details: { targetUserId, newRole, requestId: created?.id },
    });

    return NextResponse.json({ success: true, data: created });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(handleGet, { keyPrefix: "role_requests_get", maxRequests: 60 });
export const POST = withRateLimit(handlePost, { keyPrefix: "role_requests_post", maxRequests: 20 });
