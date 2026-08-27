import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";

async function handleGet(req: NextRequest) {
  return NextResponse.json({
    success: true,
    data: {
      status: "ready",
      maxBatchSize: 100,
      deduplicationEnabled: true,
    },
  });
}

export const GET = withAuthorization(handleGet, { requiredRole: ["operator", "admin", "sysadmin"] });
