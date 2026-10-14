import { NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/config/app-constants";

export const POST = withRateLimit(
  withAuthorization(async () => {
    return NextResponse.json(
      {
        success: false,
        error: { code: "NOT_IMPLEMENTED", message: "Admin mess-finalize is not yet implemented" },
        data: null,
      },
      { status: 501 }
    );
  }, { requiredRole: ["admin", "sysadmin"] }),
  { ...RATE_LIMITS.mutation, keyPrefix: "admin_mess_finalize_post" }
);
