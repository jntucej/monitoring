import { NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { generatePredictions } from "@/lib/predictive";

async function handlePost() {
  try {
    const predictions = await generatePredictions();
    return NextResponse.json({
      success: true,
      message: "Occupancy predictive models successfully retrained.",
      data: { predictions, anomalies: [] },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "occupancy_retrain", maxRequests: 20 }
);
