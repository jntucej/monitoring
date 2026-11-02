import { NextResponse } from "next/server";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { sampleTrafficDataset } from "@/lib/traffic-analytics";

async function handlePost() {
  try {
    const { predictions, anomalies } = sampleTrafficDataset();
    return NextResponse.json({
      success: true,
      message: "Traffic predictive models successfully retrained.",
      data: { predictions, anomalies },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const POST = withMutationGuard(handlePost, {requiredRole: ["admin", "sysadmin"], rateLimit: { keyPrefix: "traffic_retrain", maxRequests: 20 }});
