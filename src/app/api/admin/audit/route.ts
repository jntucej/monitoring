import { NextRequest, NextResponse } from "next/server";
import { getAuditLogs, AuditAction } from "@/lib/audit";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/admin/audit - Fetch audit logs with filtering & pagination
 */
async function handleGet(req: NextRequest) {
  const actorRole = req.headers.get("x-user-role");
  if (actorRole !== "admin" && actorRole !== "sysadmin") {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Admin access required" } },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || undefined;
    const action = (searchParams.get("action") as AuditAction) || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : 0;

    const result = await getAuditLogs({
      userId,
      action,
      from,
      to,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: result.logs,
      total: result.total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch audit logs" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "admin_audit", maxRequests: 60 }
);
