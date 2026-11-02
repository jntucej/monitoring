import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { addAudit, findUserById, withTransaction } from "@/lib/db";
import { withMutationGuard } from "@/server/http/mutation-guard";
import type { AuthContext } from "@/lib/authContext";

function getIdFromPath(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 1]);
}

async function handleDelete(req: NextRequest, { auth }: { auth: AuthContext }) {
  const targetUserId = getIdFromPath(req);
  const actorId = auth.userId;

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
    // RLS write discipline: users & sessions are RLS tables;
    // all writes go through withTransaction.
    const newHandle = `user_${randomUUID()}`;
    const newVersion = (cur?.session_version ?? 0) + 1;
    await withTransaction(async (client) => {
      await client.query(
        "UPDATE public.users SET handle = $1, session_version = $2 WHERE id = $3",
        [newHandle, newVersion, targetUserId]
      );
      await client.query(
        "DELETE FROM public.sessions WHERE user_id = $1",
        [targetUserId]
      );
    }, { currentUserId: actorId });

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

export const DELETE = withMutationGuard(handleDelete, {requiredRole: ["sysadmin"]});
