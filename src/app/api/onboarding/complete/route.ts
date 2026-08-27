import { NextRequest, NextResponse } from "next/server";
import { markStepCompleted } from "@/lib/onboarding";
import { withAuthorization } from "@/middleware/authorization";

async function handlePost(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") || "demo-user";
    const body = await req.json();
    const { step } = body;
    if (!step) {
      return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "Step required" } }, { status: 400 });
    }
    await markStepCompleted(userId, step);
    return NextResponse.json({ success: true, message: `Completed step '${step}'` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export const POST = withAuthorization(handlePost);
