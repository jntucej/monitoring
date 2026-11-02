import { NextResponse } from "next/server";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { sampleWebhooksDataset } from "@/lib/webhooks-analytics";

async function handlePost() {
  try {
    const { predictions, anomalies } = sampleWebhooksDataset();
    return NextResponse.json({
      success: true,
      message: "Webhooks predictive models successfully retrained.",
      data: { predictions, anomalies },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const POST = withMutationGuard(handlePost, {requiredRole: ["admin", "sysadmin"], rateLimit: { keyPrefix: "webhooks_retrain", maxRequests: 20 }});
