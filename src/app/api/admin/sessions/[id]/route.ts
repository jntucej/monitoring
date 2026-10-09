import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
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

    // Bug 126: createAuthContext checks session_version, NOT handle — rotating
    // handle alone never invalidated live JWTs, so "Force Logout" was a no-op.
    // Bump session_version so every existing token is rejected on next request.
    const { data: cur } = await supabase
      .from("users")
      .select("session_version")
      .eq("id", targetUserId)
      .maybeSingle();
    await supabase
      .from("users")
      .update({
        handle: `user_${randomUUID()}`,
        session_version: (cur?.session_version ?? 0) + 1,
      })
      .eq("id", targetUserId);

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
