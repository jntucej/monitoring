import { errMsg } from "@/lib/err-msg";
import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { getUserAdoptionTrends } from "@/lib/user-analytics";

async function handleGet(_req: NextRequest) {
  try {
    const data = await getUserAdoptionTrends();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: errMsg(error) }, { status: 500 });
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] });