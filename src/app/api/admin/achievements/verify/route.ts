import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit, type RateLimitConfig } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/config/app-constants";
import { requireTrustedHeaders } from "@/server/http/trusted-headers";
import { err } from "@/lib/api-response";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/admin/achievements/verify
 *
 * Admin / sysadmin only. Marks a user's achievement as verified:
 * sets verified_by and verified_at on the matching user_achievements row
 * and writes an audit entry.
 *
 * Body: { userId: string, code: string }
 */
async function handlePost(
  req: NextRequest,
  { auth }: { auth: AuthContext }
): Promise<Response> {
  const untrusted = requireTrustedHeaders(req);
  if (untrusted) return untrusted;

  const role = auth.role as Role;
  if (role !== "admin" && role !== "sysadmin") {
    const { body, status } = err("FORBIDDEN", "Admin or sysadmin role required.", 403);
    return NextResponse.json(body, { status });
  }

  const parsed = await req.json().catch(() => null);
  if (!parsed || typeof parsed !== "object") {
    const { body, status } = err("BAD_REQUEST", "Invalid JSON body", 400);
    return NextResponse.json(body, { status });
  }

  const userId = String((parsed as Record<string, unknown>).userId ?? "").trim();
  const code = String((parsed as Record<string, unknown>).code ?? "").trim();

  if (!UUID_RE.test(userId)) {
    const { body, status } = err("BAD_REQUEST", "userId must be a valid UUID", 400);
    return NextResponse.json(body, { status });
  }
  if (!code || code.length > 100) {
    const { body, status } = err("BAD_REQUEST", "code (1-100 chars) is required", 400);
    return NextResponse.json(body, { status });
  }

  const supabase = getSupabaseServiceClient();

  const { data: updated, error: upErr } = await supabase
    .from("user_achievements")
    .update({ verified_by: auth.userId, verified_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("achievement_code", code)
    .select("id, user_id, achievement_code, earned_at, verified_by, verified_at")
    .maybeSingle();

  if (upErr) {
    const { body, status } = err("SERVER_ERROR", upErr.message, 500);
    return NextResponse.json(body, { status });
  }
  if (!updated) {
    const { body, status } = err(
      "NOT_FOUND",
      "Achievement not found for this user.",
      404
    );
    return NextResponse.json(body, { status });
  }

  try {
    await addAudit({
      action: "ACHIEVEMENT_VERIFIED",
      userId: auth.userId,
      role,
      details: `${code} for ${userId}`,
    });
  } catch {
    /* audit failures are non-fatal */
  }

  return NextResponse.json({ success: true, data: updated });
}

const verifyLimit: RateLimitConfig = {
  ...RATE_LIMITS.sensitive,
  keyPrefix: "achievement_verify",
};

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] }),
  verifyLimit
);
