import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { getThumbprint } from "@/lib/db";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
import bcrypt from "bcryptjs";

/**
 * POST /api/gate/verify-thumbprint
 *
 * Verifies a captured thumbprint signature against the stored hash for a
 * person. Called AFTER the ID (QR/manual) scan as the second factor.
 *
 * Three results (all HTTP 200 with success:true so the operator can act):
 *   - { verified: true,  code: "VERIFIED" }          → matched
 *   - { verified: false, code: "INVALID_THUMBPRINT" } → retry / deny
 *   - { verified: false, code: "NO_THUMBPRINT" }     → gracefully fall back
 *     (no thumbprint on file for this person)
 *
 * Only bcrypt hashes are compared — raw signatures are never persisted.
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

    const body = await req.json().catch(() => ({}));
    const { personId, signature, clientEventId, attempt } = body;
    const actorId = req.headers.get("x-user-id") || "";
    const actorRole = req.headers.get("x-user-role") || "operator";
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown";
    const attemptNum = typeof attempt === "number" && attempt > 0 ? attempt : 1;

    if (!personId || typeof signature !== "string" || !signature) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "personId and signature are required" } },
        { status: 400 }
      );
    }

    // Best-effort audit trail of every verification attempt.
    const logAudit = async (action: string, detail: Record<string, unknown>) => {
      try {
        const service = getSupabaseServiceClient();
        await service.from("audit_logs").insert({
          action,
          user_id: actorId,
          user_name: "System",
          user_role: actorRole,
          details: { personId, clientEventId, ...detail },
          ip_address: ip,
          user_agent: req.headers.get("user-agent") || "unknown",
          timestamp: new Date().toISOString(),
        });
      } catch { /* audit best-effort */ }
    };

    const stored = await getThumbprint(personId);

    // Person has no thumbprint on record → graceful fallback (never a hard fail).
    if (!stored) {
      await logAudit("THUMBPRINT_SKIPPED_FALLBACK", { reason: "No thumbprint on file", attempt: attemptNum });
      return NextResponse.json({
        success: true,
        data: {
          verified: false,
          code: "NO_THUMBPRINT",
          message: "No thumbprint registered for this person in the database.",
        },
      });
    }

    const isValid = bcrypt.compareSync(signature, stored.hash);

    if (!isValid) {
      await logAudit("THUMBPRINT_FAILED", { reason: "Invalid thumbprint match", attempt: attemptNum });
      return NextResponse.json({
        success: true,
        data: {
          verified: false,
          code: "INVALID_THUMBPRINT",
          message: "Thumbprint did not match. Please try again.",
        },
      });
    }

    await logAudit("THUMBPRINT_VERIFIED", {
      uniqueId: stored.uniqueId,
      name: stored.name,
      attempt: attemptNum,
    });

    return NextResponse.json({
      success: true,
      data: {
        verified: true,
        code: "VERIFIED",
        personId,
        name: stored.name,
        uniqueId: stored.uniqueId,
      },
    });
  } catch (error) {
    console.error("verify-thumbprint error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Thumbprint verification failed" } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ["operator", "admin", "sysadmin"] }),
  { keyPrefix: "thumbprint_verify", maxRequests: 30 }
);