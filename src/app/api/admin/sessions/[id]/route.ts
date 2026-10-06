import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { addAudit, findUserById } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";

function getIdFromPath(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 1]);
}

async function handleDelete(req: NextRequest) {
  const targetUserId = getIdFromPath(req);
  const actorId = req.headers.get("x-user-id") || "";

  try {
    const supabase = getSupabaseServiceClient();

    // Revoke user session token handle in database
    await supabase.from("users").update({ handle: null }).eq("id", targetUserId);

    // Also delete any active sessions in sessions table if present
    try {
      await supabase.from("sessions").delete().eq("user_id", targetUserId);
    } catch {
      // Best effort
    }

    const targetUser = await findUserById(targetUserId);

    await addAudit({
      userId: actorId,
      action: "SESSION_FORCE_REVOKED",
      details: { targetUserId, targetUserName: targetUser?.name },
    });

    return NextResponse.json({
      success: true,
      message: `Active session for user '${targetUser?.name || targetUserId}' revoked successfully`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}

export const DELETE = withAuthorization(handleDelete, { requiredRole: ["admin", "sysadmin"] });
