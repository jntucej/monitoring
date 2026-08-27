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

async function handlePost(req: NextRequest) {
  try {
    const operatorId = req.headers.get('x-user-id');
    if (!operatorId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Could not identify the user." } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { scans } = body;

    if (!Array.isArray(scans)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_BODY", message: "Expected scans array" } },
        { status: 400 }
      );
    }

    const { addScan } = await import("@/lib/db");
    const results = [];
    for (const scan of scans) {
      try {
        const result = await addScan({
          roll: scan.roll,
          direction: scan.direction,
          reason: scan.reason,
          gateId: scan.gateId,
          operatorId: operatorId, // Use the authenticated user's ID
          isManual: scan.isManual,
          clientEventId: scan.id || scan.clientEventId || scan.local_id,
        });
        results.push({ local_id: scan.id || scan.clientEventId || scan.local_id, status: "success", data: result.scan });
      } catch {
        results.push({ local_id: scan.id || scan.clientEventId || scan.local_id, status: "error" });
      }
    }

    return NextResponse.json({ success: true, data: { results } });
  } catch (error) {
    console.error("Error in bulk scan sync:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Bulk sync failed" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ['admin', 'sysadmin', 'operator'] }),
  { keyPrefix: 'gate_logs_list', maxRequests: 100 }
);

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ['operator', ] }),
  { keyPrefix: 'gate_logs_create', maxRequests: 30 }
);

