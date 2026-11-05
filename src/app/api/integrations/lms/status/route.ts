import { errMsg } from "@/lib/err-msg";
import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { getLMSConfig } from "@/lib/integrations/lms";

async function handleGet(_req: NextRequest) {
  try {
    const config = await getLMSConfig();
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    return NextResponse.json({ success: false, error: errMsg(error) }, { status: 500 });
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] });