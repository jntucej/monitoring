import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
import { findUserById, hashThumbprint, registerThumbprint, clearThumbprint } from "@/lib/db";

/**
 * POST /api/operator/register-thumbprint
 *
 * Registers (or clears) a user's thumbprint. Admin/sysadmin only.
 * The raw signature is bcrypt-hashed server-side; only the hash is stored.
 *
 * Body:
 *   { userId, signature }   → register a new hash
 *   { userId, clear: true } → remove the stored hash
 */
async function handlePost(req: NextRequest) {
  try {
    // CSRF protection: reject state-changing cross-origin requests.
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host) {
      try {
        if (new URL(origin).host !== host) {
          return NextResponse.json(
            { success: false, error: { code: "FORBIDDEN", message: "CSRF verification failed: Cross-Origin request blocked." } },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "CSRF verification failed: Invalid origin format." } },
          { status: 403 }
        );
      }
    }

    const body = await req.json().catch(() => null);
    const actorId = req.headers.get("x-user-id") || "";
    const actorRole = req.headers.get("x-user-role") || "sysadmin";
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown";

    const userId = body?.userId;
    const signature = body?.signature;
    const clear = body?.clear === true;

    if (!userId || (!clear && (typeof signature !== "string" || signature.length < 16))) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "userId and a valid thumbprint signature are required" } },
        { status: 400 }
      );
    }

    const target = await findUserById(userId);
    if (!target) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    // Best-effort audit trail of the registration event.
    const logAudit = async (action: string) => {
      try {
        const service = getSupabaseServiceClient();
        await service.from("audit_logs").insert({
          action,
          user_id: actorId,
          user_name: "System",
          user_role: actorRole,
          details: { userId, name: target.name, uniqueId: target.uniqueId },
          ip_address: ip,
          user_agent: req.headers.get("user-agent") || "unknown",
          timestamp: new Date().toISOString(),
        });
      } catch { /* audit best-effort */ }
    };

    if (clear) {
      const ok = await clearThumbprint(userId);
      if (!ok) {
        return NextResponse.json({ success: false, error: { code: "UPDATE_FAILED", message: "Failed to clear thumbprint" } }, { status: 500 });
      }
      await logAudit("THUMBPRINT_CLEARED");
      return NextResponse.json({ success: true, data: { userId, registered: false, name: target.name } });
    }

    const hash = await hashThumbprint(signature);
    const ok = await registerThumbprint(userId, hash);
    if (!ok) {
      return NextResponse.json({ success: false, error: { code: "UPDATE_FAILED", message: "Failed to save thumbprint" } }, { status: 500 });
    }

    await logAudit("THUMBPRINT_REGISTERED");
    return NextResponse.json({ success: true, data: { userId, registered: true, name: target.name } });
  } catch (error) {
    console.error("register-thumbprint error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to register thumbprint" } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "thumbprint_register", maxRequests: 30 }
);