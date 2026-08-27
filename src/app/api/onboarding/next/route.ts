import { NextRequest, NextResponse } from "next/server";
import { getNextRecommendedStep } from "@/lib/onboarding";
import { withAuthorization } from "@/middleware/authorization";

async function handleGet(req: NextRequest) {
  const userId = req.headers.get("x-user-id") || "demo-user";
  const role = req.headers.get("x-user-role") || "student";
  const nextStep = await getNextRecommendedStep(userId, role);
  return NextResponse.json({ success: true, data: nextStep });
}

export const GET = withAuthorization(handleGet);
