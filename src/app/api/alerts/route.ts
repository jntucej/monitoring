import { NextRequest, NextResponse } from "next/server";
import { getAlerts } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/alerts
 * Query params:
 *   resolved=true|false  -> filter by resolution status (omit to get all)
 *   severity=low|medium|high|critical -> filter by severity
 */
async function handleGet(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const resolvedParam = params.get("resolved");
    const severity = params.get("severity");

    let data = await getAlerts();
    if (resolvedParam === "true") {
      data = data.filter((a) => a.resolved);
    } else if (resolvedParam === "false") {
      data = data.filter((a) => !a.resolved);
    }
    const ALLOWED_SEVERITIES = ["low", "medium", "high", "critical", "info", "warning"];
    if (severity && ALLOWED_SEVERITIES.includes(severity.toLowerCase())) {
      data = data.filter((a) => a.severity?.toLowerCase() === severity.toLowerCase());
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load alerts" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ['admin', 'sysadmin', 'supervisor', 'warden'] }),
  { keyPrefix: 'alerts_list', maxRequests: 60 }
);
