import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { promQuery, promQueryRange } from "@/lib/monitoring";
import { getNamedQuery } from "@/lib/monitoring/registry";

async function handleGet(req: NextRequest) {
  const queryId = req.nextUrl.searchParams.get("queryId");
  if (!queryId) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_QUERY_ID", message: "queryId is required" } },
      { status: 400 }
    );
  }
  const named = getNamedQuery(queryId);
  if (!named) {
    return NextResponse.json(
      { success: false, error: { code: "UNKNOWN_QUERY", message: `No registry entry for '${queryId}'` } },
      { status: 404 }
    );
  }
  try {
    let result;
    if (named.type === "range") {
      const start = req.nextUrl.searchParams.get("start");
      const end = req.nextUrl.searchParams.get("end");
      const step = req.nextUrl.searchParams.get("step") || "30s";
      if (!start || !end) {
        return NextResponse.json(
          { success: false, error: { code: "MISSING_RANGE", message: "start and end required" } },
          { status: 400 }
        );
      }
      result = await promQueryRange(named.query, start, end, step);
    } else {
      result = await promQuery(named.query);
    }
    return NextResponse.json({ success: true, data: result.data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const code = message === "QUERY_NOT_ALLOWED" ? "QUERY_NOT_ALLOWED" : "MONITORING_ERROR";
    return NextResponse.json(
      { success: false, error: { code, message } },
      { status: code === "QUERY_NOT_ALLOWED" ? 400 : 502 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["sysadmin"] }),
  { keyPrefix: "mon_proxy", maxRequests: 120 }
);
