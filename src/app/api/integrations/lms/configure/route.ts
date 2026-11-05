import { errMsg } from "@/lib/err-msg";
import { NextRequest, NextResponse } from "next/server";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { updateLMSConfig } from "@/lib/integrations/lms";

async function handlePost(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = await updateLMSConfig(body);
    return NextResponse.json({ success: true, data: updated, message: "LMS configuration updated." });
  } catch (error) {
    return NextResponse.json({ success: false, error: errMsg(error) }, { status: 500 });
  }
}

export const POST = withMutationGuard(handlePost, {requiredRole: ["admin", "sysadmin"]});
