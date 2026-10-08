import { NextRequest, NextResponse } from "next/server";
import { verifyThumbprint, findPersonByUniqueId } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

async function handlePost(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, roll, signature } = body;

    let targetId = userId;
    if (!targetId && roll) {
      const person = await findPersonByUniqueId(roll);
      targetId = person?.id;
    }

    if (!targetId || !signature) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Target userId/roll and signature are required" } },
        { status: 400 }
      );
    }

    const verified = await verifyThumbprint(targetId, signature);
    return NextResponse.json({
      success: true,
      verified,
      message: verified ? "Thumbprint verified successfully" : "Thumbprint mismatch",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Internal error" } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ["operator", "admin", "sysadmin"] }),
  { keyPrefix: "verify_thumbprint", maxRequests: 60 }
);
