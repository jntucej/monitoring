import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { applyScheduleSuggestion } from "@/lib/scheduling-assistant";

async function handlePost(req: NextRequest) {
  try {
    const { suggestionId } = await req.json();
    if (!suggestionId) {
      return NextResponse.json({ success: false, error: "Missing suggestionId" }, { status: 400 });
    }

    const applied = await applyScheduleSuggestion(suggestionId);
    return NextResponse.json({
      success: applied,
      message: "Schedule recommendation applied successfully.",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const POST = withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] });