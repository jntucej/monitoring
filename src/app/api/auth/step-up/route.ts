// src/app/api/auth/step-up/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// M1 — POST /api/auth/step-up. Body: { password }. Verifies the caller's
// password and stamps their active sessions as stepped up. The step-up
// marker is fresh for 5 minutes; destructive routes guarded with
// `requiresStepUp: true` accept the request only while the marker is fresh.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rate-limit";
import { withAuthorization } from "@/middleware/authorization";
import { performStepUp } from "@/lib/step-up";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

async function handlePost(
  req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { password?: string };
  const password = String(body.password ?? "");
  if (!password) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "BAD_REQUEST", message: "password required" },
      },
      { status: 400 },
    );
  }

  try {
    await performStepUp(auth.userId, password);
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: unknown }).code)
        : "STEP_UP_FAILED";
    return NextResponse.json(
      {
        success: false,
        error: {
          code,
          message:
            err instanceof Error && err.message
              ? err.message
              : "step-up verification failed",
        },
      },
      { status: 401 },
    );
  }

  await addAudit({
    action: "STEP_UP_VERIFIED",
    userId: auth.userId,
    userName: auth.email,
    role: auth.role,
    details: { ip: req.headers.get("x-client-ip") ?? null },
  }).catch(() => undefined);

  return NextResponse.json({ success: true, data: { steppedUp: true } });
}

export const POST = withRateLimit(
  withAuthorization(handlePost),
  { windowMs: 60_000, maxRequests: 6, keyPrefix: "step-up" },
);
