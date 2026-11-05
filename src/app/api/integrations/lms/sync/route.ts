import { errMsg } from "@/lib/err-msg";
import { NextRequest, NextResponse } from "next/server";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { syncLMSRosters } from "@/lib/integrations/lms";

async function handlePost(_req: NextRequest) {
  try {
    const result = await syncLMSRosters();
    return NextResponse.json({
      success: true,
      message: `Synced ${result.synced_users} users across ${result.synced_courses} courses from LMS.`,
      data: result,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: errMsg(error) }, { status: 500 });
  }
}

export const POST = withMutationGuard(handlePost, {requiredRole: ["admin", "sysadmin"]});
