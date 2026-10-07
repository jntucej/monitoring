import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { pushLMSAttendance } from "@/lib/integrations/lms";

async function handlePost(req: NextRequest) {
  try {
    const body = await req.json();
    const success = await pushLMSAttendance(body);
    return NextResponse.json({ success, message: "Attendance record pushed to LMS." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const POST = withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin", "operator"] });