/**
 * POST /api/auth/mfa/bootstrap
 *
 * Break-glass enrollment path for the FIRST sysadmin, who otherwise could
 * never log in to set up 2FA (the login endpoint now blocks unenrolled
 * sysadmins). Expects two values supplied out-of-band by an operator of the
 * server (e.g. from a maintenance shell / deployment runbook):
 *
 *   1. body.enrollSecret — env value from MFA_ENROLL_SECRET (falls back to
 *      MOBILE_TOKEN_SECRET for deployments that share one secret).
 *   2. header "x-sysadmin-identifier" — the login identifier (email /
 *      unique_id / login_identifier) of the sysadmin to enroll.
 *
 * Issues a 10-minute single-purpose JWT that only /api/auth/2fa/setup accepts.
 */
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "crypto";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
import { createEnrollToken } from "@/lib/mfa-enroll";

const TTL_SECONDS = 10 * 60;

async function handlePost(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const enrollSecret = typeof body?.enrollSecret === "string" ? body.enrollSecret : "";
    const identifier = req.headers.get("x-sysadmin-identifier")?.trim() || "";

    if (!identifier) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "x-sysadmin-identifier header is required" } },
        { status: 400 }
      );
    }

    // Constant-time comparison via hashed digests.
    const expected = process.env.MFA_ENROLL_SECRET || process.env.MOBILE_TOKEN_SECRET || "";
    const a = createHash("sha256").update(enrollSecret).digest();
    const b = createHash("sha256").update(expected).digest();
    if (!expected || !timingSafeEqual(a, b)) {
      return uniformFailure();
    }

    const service = getSupabaseServiceClient();

    // Resolve identifier exactly like /api/auth/login does.
    let email: string | null = identifier.includes("@") ? identifier.toLowerCase() : null;
    if (!email) {
      const byUnique = await service.from("users").select("email").eq("unique_id", identifier).maybeSingle();
      email = (byUnique.data?.email as string) ?? null;
      if (!email) {
        const byLoginId = await service.from("users").select("email").eq("login_identifier", identifier).maybeSingle();
        email = (byLoginId.data?.email as string) ?? null;
      }
    }
    if (!email) return uniformFailure();

    const { data: profile } = await service
      .from("users")
      .select("id, role, two_factor_enabled")
      .eq("email", email)
      .single();

    // Uniform response whether or not the account exists/qualifies.
    if (!profile || profile.role !== "sysadmin" || profile.two_factor_enabled) return uniformFailure();

    const enrollToken = await createEnrollToken(profile.id);

    return NextResponse.json({
      success: true,
      data: { enrollToken, expiresIn: TTL_SECONDS },
    });
  } catch (error: unknown) {
    console.error("MFA bootstrap error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error instanceof Error ? error.message : String(error) } },
      { status: 500 }
    );
  }
}

function uniformFailure() {
  return NextResponse.json(
    { success: false, error: { code: "FORBIDDEN", message: "Invalid enrollment request" } },
    { status: 403 }
  );
}

export const POST = handlePost;

