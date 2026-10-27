import { NextRequest, NextResponse } from "next/server";
import { getAllLogs } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

async function handleGet(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const gateId = params.get("gateId") || undefined;
    const date = params.get("date") || undefined;
    const from = params.get("from") || undefined;
    const to = params.get("to") || undefined;
    const direction = params.get("direction") || undefined;
    const reason = params.get("reason") || undefined;
    const search = params.get("search") || undefined;
    const page = parseInt(params.get("page") || "1");
    const limit = parseInt(params.get("limit") || "50");

    const data = await getAllLogs({ gateId, date, from, to, direction, reason, search, page, limit });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching gate logs:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load logs" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ['admin', 'sysadmin', 'operator'] }),
  { keyPrefix: 'gate_logs_list', maxRequests: 100 }
);

