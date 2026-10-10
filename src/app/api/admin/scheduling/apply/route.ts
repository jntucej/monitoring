import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { applyScheduleSuggestion } from "@/lib/scheduling-assistant";
import { logAuditEvent } from "@/lib/audit";

async function handlePost(req: NextRequest) {
  try {
    // Client posts { suggestionId }, so read the field instead of the whole body.
    const { suggestionId } = await req.json();
    if (!suggestionId || typeof suggestionId !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing suggestionId" },
        { status: 400 }
      );
    }

    // withAuthorization overwrites these with server-validated identity.
    const actorId = req.headers.get("x-user-id") ?? "";
    const actorRole = req.headers.get("x-user-role") ?? "";
    const actorEmail = req.headers.get("x-user-email");

    const applied = await applyScheduleSuggestion(suggestionId);
    if (!applied) {
      return NextResponse.json(
        { success: false, error: "Suggestion not found or has no gate hours to apply" },
        { status: 404 }
      );
    }

    await logAuditEvent({
      action: "SMART_SCHEDULE_APPLIED",
      userId: actorId,
      userName: actorEmail || "Admin (" + actorId + ")",
      userRole: actorRole,
      details: { suggestionId: suggestionId, appliedAt: new Date().toISOString() },
    });

    return NextResponse.json({
      success: true,
      message: "Schedule recommendation applied successfully; audit log updated.",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const POST = withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] });