import { NextRequest, NextResponse } from "next/server";
import { markStepCompleted, assertValidStep } from "@/lib/onboarding";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

// ── Onboarding step completion (idempotent, audited, rate-limited) ─────────
// Security posture (audit F1–F4, F8, F9, F12):
//   • withMutationGuard bakes in the canonical chain
//     withAuthorization → user-rate-limit → requireTrustedHeaders → assertCsrf,
//     closing F1 (CSRF), F2 (rate limit) and F3 (trusted-header verification).
//   • Identity comes ONLY from the authenticated context (auth.userId) —
//     NEVER from a client-supplied x-user-id header (F5). The old
//     `|| "demo-user"` fallback is gone: an untrusted caller can no longer
//     mark another account's onboarding complete.
//   • The step id is validated against the closed catalogue (F4) before it
//     can reach the DB or the audit log.
//   • Internal error detail is never reflected in the 500 body (F8); it is
//     logged server-side instead.
//   • One audit row per completion, keyed to the real user (F9).

async function handlePost(
  req: NextRequest,
  { auth }: { auth: AuthContext }
): Promise<Response> {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "JSON body required." } },
      { status: 400 }
    );
  }

  const step = String((body as Record<string, unknown>).step ?? "");
  if (step.length === 0) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Step is required." } },
      { status: 400 }
    );
  }

  // F4: closed catalogue — reject unknown step ids with a 400, not a 500.
  try {
    assertValidStep(step);
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Unknown onboarding step." } },
      { status: 400 }
    );
  }

  // F5: identity comes ONLY from the authenticated JWT (auth.userId) —
  // never from a client-supplied x-user-id header, which a caller could
  // forge to complete another account's onboarding.
  try {
    await markStepCompleted(auth.userId, step);
  } catch (error) {
    // F8: log the real reason server-side, never reflect it to the caller.
    console.error("[onboarding:complete] markStepCompleted failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Could not record onboarding progress." },
      },
      { status: 500 }
    );
  }

  // F9: one audit row per completion, for the real user (never "demo-user").
  await addAudit({
    action: "ONBOARDING_STEP_COMPLETED",
    userId: auth.userId,
    userName: auth.email,
    role: auth.role,
    details: { step },
  }).catch(() => null);

  return NextResponse.json({ success: true, step, completed: true });
}

export const POST = withMutationGuard(handlePost, {
  // ~12 steps exist per role; 30/min is generous for legitimate use while
  // stopping a spam loop from filling onboarding_progress / the audit log.
  rateLimit: { windowMs: 60_000, maxRequests: 30, keyPrefix: "onboarding_complete" },
});
