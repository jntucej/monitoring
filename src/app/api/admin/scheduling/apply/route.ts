import { errMsg } from "@/lib/err-msg";
import { NextRequest, NextResponse } from "next/server";
import { err } from "@/lib/api-response";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { applyScheduleSuggestion } from "@/lib/scheduling-assistant";
import { logAuditEvent } from "@/lib/audit";

async function handlePost(req: NextRequest) {
  try {
    // Client posts { suggestionId }, so read the field instead of the whole body.
    const { suggestionId } = await req.json();
    if (!suggestionId || typeof suggestionId !== "string") {
      return NextResponse.json(err("BAD_REQUEST", "Missing suggestionId").body, { status: 400 });
    }

    // withAuthorization overwrites these with server-validated identity.
    const actorId = req.headers.get("x-user-id") ?? "";
    const actorRole = req.headers.get("x-user-role") ?? "";
    const actorEmail = req.headers.get("x-user-email");

    const applied = await applyScheduleSuggestion(suggestionId);
    if (!applied) {
      return NextResponse.json(err("NOT_FOUND", "Suggestion not found or has no gate hours to apply").body, { status: 404 });
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
  } catch (error) {
    return NextResponse.json(err("INTERNAL_ERROR", error instanceof Error ? errMsg(error) : "Internal error").body, { status: 500 });
  }
}

export const POST = withMutationGuard(handlePost, {requiredRole: ["admin", "sysadmin"]});
