import { errMsg } from "@/lib/err-msg";
import { NextRequest, NextResponse } from "next/server";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { pushLMSAttendance } from "@/lib/integrations/lms";

async function handlePost(req: NextRequest) {
  try {
    const body = await req.json();
    const success = await pushLMSAttendance(body);
    return NextResponse.json({ success, message: "Attendance record pushed to LMS." });
  } catch (error) {
    return NextResponse.json({ success: false, error: errMsg(error) }, { status: 500 });
  }
}

export const POST = withMutationGuard(handlePost, {requiredRole: ["admin", "sysadmin", "operator"]});
