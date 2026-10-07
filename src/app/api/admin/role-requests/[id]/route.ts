import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { addAudit, updateUserRole, findUserById } from "@/lib/db";
import { sendNotification } from "@/lib/notification-service";
import { withAuthorization } from "@/middleware/authorization";

function getIdFromPath(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 1]);
}

async function handlePatch(req: NextRequest) {
  const id = getIdFromPath(req);
  const actorId = req.headers.get("x-user-id") || "";
  const actorRole = req.headers.get("x-user-role") || "";

  if (actorRole !== "sysadmin" && actorRole !== "admin") {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Only sysadmin or admin can approve/reject role changes" } },
      { status: 403 }
    );
  }

  try {
    const { status, reason } = await req.json().catch(() => ({}));

    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Status must be APPROVED or REJECTED" } },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();

    const { data: request, error: fetchErr } = await supabase
      .from("role_change_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !request) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Role request not found" } },
        { status: 404 }
      );
    }

    // Security check: Only sysadmin can approve promotion to sysadmin
    if (status === "APPROVED" && request.new_role === "sysadmin" && actorRole !== "sysadmin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Only a sysadmin can approve promotion to sysadmin" } },
        { status: 403 }
      );
    }

    // Update request status
    const now = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from("role_change_requests")
      .update({
        status,
        approved_by: actorId,
        reason: reason || request.reason,
        updated_at: now,
      })
      .eq("id", id);

    if (updateErr) {
      return NextResponse.json(
        { success: false, error: { code: "DATABASE_ERROR", message: updateErr.message } },
        { status: 500 }
      );
    }

    // If APPROVED, update user role & invalidate active user sessions
    if (status === "APPROVED") {
      await updateUserRole(request.target_user_id, request.new_role, actorId);

      // Invalidate target user's active session handle
      await supabase.from("users").update({ session_version: (user?.session_version || 0) + 1, handle: gen_random_uuid_placeholder }).eq("id", request.target_user_id);
    }

    // Send notifications
    try {
      await sendNotification(status === "APPROVED" ? "pass_approved" : "pass_rejected", request.target_user_id, "person", {
        title: `Role Request ${status}`,
        message: status === "APPROVED"
          ? `Your role promotion request to '${request.new_role}' has been APPROVED.`
          : `Your role promotion request to '${request.new_role}' has been REJECTED.`,
      });

      if (request.requester_id !== request.target_user_id) {
        await sendNotification(status === "APPROVED" ? "pass_approved" : "pass_rejected", request.requester_id, "person", {
          title: `Role Request ${status}`,
          message: `The promotion request for target user to '${request.new_role}' was ${status.toLowerCase()}.`,
        });
      }
    } catch { /* notification best effort */ }

    await addAudit({
      userId: actorId,
      action: `ROLE_REQUEST_${status}`,
      details: { requestId: id, targetUserId: request.target_user_id, newRole: request.new_role },
    });

    return NextResponse.json({
      success: true,
      message: `Role promotion request ${status.toLowerCase()} successfully`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}

export const PATCH = withAuthorization(handlePatch, { requiredRole: ["admin", "sysadmin"] });
