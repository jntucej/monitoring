import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { syncLMSRosters } from "@/lib/integrations/lms";

async function handlePost(req: NextRequest) {
  try {
    const result = await syncLMSRosters();
    return NextResponse.json({
      success: true,
      message: `Synced ${result.synced_users} users across ${result.synced_courses} courses from LMS.`,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const POST = withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] });