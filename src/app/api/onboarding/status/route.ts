import { NextRequest, NextResponse } from "next/server";
import { getUserCompletedSteps, VALID_ONBOARDING_STEPS } from "@/lib/onboarding";
import { withAuthorization } from "@/middleware/authorization";
import type { AuthContext } from "@/lib/authContext";

// F5: identity comes ONLY from the authenticated context — the old
// `x-user-id || "demo-user"` header read let a caller poll for any other
// account's completed steps (and the "demo-user" bucket was DB junk).
//
// F7: the response no longer echoes the requester-supplied userId — it
// returns the *caller's* completed steps (keyed to auth.userId), which is
// all the client needs. Cross-user reads are no longer possible through
// this endpoint.
async function handleGet(
  _req: NextRequest,
  { auth }: { auth: AuthContext }
): Promise<Response> {
  try {
    const completed = await getUserCompletedSteps(auth.userId);
    // F10: surface how many steps remain so the client can render progress
    // ("3 of 5") without a second round-trip to /next.
    const total = VALID_ONBOARDING_STEPS.size;
    return NextResponse.json({
      success: true,
      data: {
        completed,
        completedCount: completed.length,
        totalSteps: total,
        allComplete: completed.length >= total,
      },
    });
  } catch (error) {
    console.error("[onboarding:status] failed to load completed steps:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Could not load onboarding progress." } },
      { status: 500 }
    );
  }
}

export const GET = withAuthorization(handleGet);
