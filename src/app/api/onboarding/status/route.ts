import { NextRequest, NextResponse } from "next/server";
import { getUserCompletedSteps } from "@/lib/onboarding";
import { withAuthorization } from "@/middleware/authorization";

async function handleGet(req: NextRequest) {
  const userId = req.headers.get("x-user-id") || "demo-user";
  const completed = await getUserCompletedSteps(userId);
  return NextResponse.json({ success: true, data: { userId, completed } });
}

export const GET = withAuthorization(handleGet);
