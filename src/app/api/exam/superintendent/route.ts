import { NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/config/app-constants";
import { TIER } from "@/server/policy/roles";

export const GET = withRateLimit(
  withAuthorization(async () => {
    return NextResponse.json(
      {
        success: false,
        error: { code: "NOT_IMPLEMENTED", message: "Exam superintendent data is not yet implemented" },
        data: null,
      },
      { status: 501 }
    );
  }, { requiredRole: TIER.APPROVER }),
  { ...RATE_LIMITS.read, keyPrefix: "exam_superintendent_get" }
);
