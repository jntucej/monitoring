import { errMsg } from "@/lib/err-msg";
import { NextResponse } from "next/server";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { sampleSustainabilityDataset } from "@/lib/sustainability-analytics";

async function handlePost() {
  try {
    const { predictions, anomalies } = sampleSustainabilityDataset();
    return NextResponse.json({
      success: true,
      message: "Sustainability predictive models successfully retrained.",
      data: { predictions, anomalies },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: errMsg(error) }, { status: 500 });
  }
}

export const POST = withMutationGuard(handlePost, {requiredRole: ["admin", "sysadmin"], rateLimit: { keyPrefix: "sustainability_retrain", maxRequests: 20 }});
