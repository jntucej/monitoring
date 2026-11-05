import { errMsg } from "@/lib/err-msg";
import { NextResponse } from "next/server";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { generatePredictions } from "@/lib/predictive";

async function handlePost() {
  try {
    const predictions = await generatePredictions();
    return NextResponse.json({
      success: true,
      message: "Occupancy predictive models successfully retrained.",
      data: { predictions, anomalies: [] },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: errMsg(error) }, { status: 500 });
  }
}

export const POST = withMutationGuard(handlePost, {requiredRole: ["admin", "sysadmin"], rateLimit: { keyPrefix: "occupancy_retrain", maxRequests: 20 }});
