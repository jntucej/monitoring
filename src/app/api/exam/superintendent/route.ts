import { NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/config/app-constants";
import { TIER } from "@/server/policy/roles";

export const GET = withRateLimit(
  withAuthorization(async () => {
    // Stub: return a graceful empty payload rather than a 501 so the
    // superintendent console's mount-time poll doesn't surface an error
    // banner. Replace with real data once the superintendent data model
    // is implemented.
    return NextResponse.json({ success: true, data: { items: [], total: 0 } });
  }, { requiredRole: TIER.APPROVER }),
  { ...RATE_LIMITS.read, keyPrefix: "exam_superintendent_get" }
);
