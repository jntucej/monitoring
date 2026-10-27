import { NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { sampleSustainabilityDataset } from "@/lib/sustainability-analytics";

async function handlePost() {
  try {
    const { predictions, anomalies } = sampleSustainabilityDataset();
    return NextResponse.json({
      success: true,
      message: "Sustainability predictive models successfully retrained.",
      data: { predictions, anomalies },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "sustainability_retrain", maxRequests: 20 }
);
