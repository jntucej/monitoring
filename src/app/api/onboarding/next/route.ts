import { NextRequest, NextResponse } from "next/server";
import { getNextRecommendedStep } from "@/lib/onboarding";
import { withAuthorization } from "@/middleware/authorization";
import type { AuthContext } from "@/lib/authContext";

// F5: userId and role MUST come from the authenticated context — never
// from client-supplied x-user-id / x-user-role headers (which a caller can
// forge to read another account's onboarding state).
// F6: null (all steps done / unknown role) is a valid terminal state, not
// an error — the response always returns 200 with an `allComplete` flag so
// the client can close the tour instead of showing a 404.
async function handleGet(
  _req: NextRequest,
  { auth }: { auth: AuthContext }
): Promise<Response> {
  try {
    const step = await getNextRecommendedStep(auth.userId, auth.role);
    return NextResponse.json({
      success: true,
      data: {
        step: step
          ? {
              id: step.id,
              title: step.title,
              description: step.description,
              targetPath: step.targetPath,
            }
          : null,
        allComplete: step === null,
      },
    });
  } catch (error) {
    console.error("[onboarding:next] failed to compute next step:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Could not load onboarding progress." } },
      { status: 500 }
    );
  }
}

export const GET = withAuthorization(handleGet);
