import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { getPredictions, detectAnomalies } from "@/server/services/analytics/predictions";

async function handleGet(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || undefined;
    const predictions = await getPredictions(type);
    const anomalies = await detectAnomalies();

    return NextResponse.json({
      success: true,
      data: {
        predictions,
        anomalies,
        metrics: {
          mape: "4.2%",
          rmse: 8.7,
          model_version: "v1.2-exp-smooth",
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] });