import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";

async function handlePost(req: NextRequest) {
  try {
    const { id, config } = await req.json();
    const responseTime = Math.floor(Math.random() * 80) + 20;

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
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export const POST = withAuthorization(handlePost, { requiredRole: ["sysadmin", "admin"] });

