import { NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { sampleWebhooksDataset } from "@/lib/webhooks-analytics";

async function handleGet() {
  try {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_ANALYTICS !== "true") {
      return NextResponse.json(
        { success: false, error: { code: "NOT_IMPLEMENTED", message: "Webhooks analytics requires ALLOW_DEMO_ANALYTICS=true in production" } },
        { status: 501 }
      );
    }
    const { predictions, anomalies } = sampleWebhooksDataset();
    return NextResponse.json({ success: true, data: { predictions, anomalies } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "webhooks_analytics", maxRequests: 60 }
);
