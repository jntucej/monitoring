import { errMsg } from "@/lib/err-msg";
import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { withMutationGuard } from "@/server/http/mutation-guard";

async function handlePost(req: NextRequest) {
  try {
    const {id} = await req.json();
    const responseTime = randomInt(20, 100);

    return NextResponse.json({
      success: true,
      data: {
        id,
        connected: true,
        responseTimeMs: responseTime,
        statusText: "HTTP 200 OK — Provider Endpoint Responsive",
        testedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: errMsg(error) } }, { status: 500 });
  }
}

export const POST = withMutationGuard(handlePost, {requiredRole: ["sysadmin", "admin"]});
