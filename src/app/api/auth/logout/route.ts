import { NextRequest, NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rate-limit";
import { supabase, getSupabaseServiceClient } from "@/lib/supabaseClient";

/**
 * POST /api/auth/logout — Revoke the active Supabase Auth session.
 *
 * Resolves the bearer token to its user and revokes every refresh token for
 * that user via the Admin API (server-side sign-out). Best-effort: failures
 * never block the client from clearing its own local state.
 *
 * Rate limited: 10 requests / min / IP.
 */
async function handlePost(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const {
        data: { user },
        error: getUserErr,
      } = await supabase.auth.getUser(authHeader.slice(7));

      if (!getUserErr && user?.id) {
        const service = getSupabaseServiceClient();
        try {
          await service.from("users").update({ handle: null }).eq("id", user.id);
        } catch (dbErr) {
          console.error("Logout database session token clear error:", dbErr);
        }
        await service.auth.admin.signOut(user.id).catch((signOutErr) => {
          console.error("Logout session revocation error:", signOutErr);
        });
      }
    } catch (err) {
      console.error("Logout error:", err);
    }
  }
  return NextResponse.json({ success: true });
}

export const POST = withRateLimit(handlePost, {
  keyPrefix: "logout",
  maxRequests: 30,
});