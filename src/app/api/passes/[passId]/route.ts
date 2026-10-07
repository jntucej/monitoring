import { NextRequest, NextResponse } from "next/server";
import { findPass, approvePass, rejectPass } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

/**
 * Extract the [passId] dynamic segment from the request URL.
 * This avoids needing Next.js route context which doesn't propagate
 * through our middleware wrappers.
 */
function getPassId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  // URL pattern: /api/passes/:passId
  return segments[segments.length - 1];
}

async function handleGet(req: NextRequest) {
  try {
    const authUserId = req.headers.get("x-user-id");
    const authRole = req.headers.get("x-user-role");
    const passId = getPassId(req);

    const pass = await findPass(passId);
    if (!pass) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Gate pass not found" } },
        { status: 404 }
      );
    }

    // Authorization: enforce ownership when caller is not an admin
    const isAdmin = ["admin", "sysadmin"].includes(authRole || "");
    if (!isAdmin) {
      const isOwner =
        (authRole === "student" && pass.roll === authUserId) ||
        (authRole === "parent" && pass.requestedById === authUserId);
      if (!isOwner) {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "You do not have permission to view this pass." } },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ success: true, data: pass });
  } catch (error) {
    console.error("Error fetching pass:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch pass" } },
      { status: 500 }
    );
  }
}

async function handlePut(req: NextRequest) {
  try {
    const approverId = req.headers.get("x-user-id");
    const authRole = req.headers.get("x-user-role") || "warden";
    if (!approverId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Could not identify approver." } },
        { status: 401 }
      );
    }
    const passId = getPassId(req);

    const body = await req.json();
    const { action, comment = "" } = body;

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ACTION", message: "Action must be 'approve' or 'reject'" } },
        { status: 400 }
      );
    }

    const pass = await findPass(passId);
    if (!pass) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Gate pass not found" } },
        { status: 404 }
      );
    }

    if (action === "reject" && !comment) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_COMMENT", message: "Comment is required for rejection" } },
        { status: 400 }
      );
    }

    const result =
      action === "approve"
        ? await approvePass(passId, authRole || "warden", comment, approverId)
        : await rejectPass(passId, authRole || "warden", comment, approverId);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error updating pass:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update pass" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin", "parent", "student", "warden"] }),
  { keyPrefix: "passes_get", maxRequests: 100 }
);

export const PUT = withRateLimit(
  withAuthorization(handlePut, { requiredRole: ["admin", "sysadmin", "warden"] }),
  { keyPrefix: "passes_update", maxRequests: 20 }
);
