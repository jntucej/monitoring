import { NextRequest, NextResponse } from "next/server";
import { resolveAlert } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

function getAlertId(req: NextRequest): string {
  const url = new URL(req.url);
  const segments = url.pathname.split("/").filter(Boolean);
  return segments[segments.length - 1] || "";
}

async function handlePatch(req: NextRequest) {
  try {
    const alertId = getAlertId(req);
    const userId = req.headers.get("x-user-id");

    if (!alertId) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Alert ID is required" } },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "User context missing" } },
        { status: 401 }
      );
    }

    const success = await resolveAlert(alertId, userId);
    if (!success) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND_OR_FAILED", message: "Failed to resolve alert or alert not found" } },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: alertId, resolved: true, resolvedBy: userId, resolvedAt: new Date().toISOString() },
    });
  } catch (error) {
    console.error("Error resolving alert:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 }
    );
  }
}

export const PATCH = withRateLimit(
  withAuthorization(handlePatch, { requiredRole: ["admin", "sysadmin", "warden"] }),
  { keyPrefix: "resolve_alert", maxRequests: 30 }
);
