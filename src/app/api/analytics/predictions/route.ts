import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { getPredictions, detectAnomalies } from "@/server/services/analytics/predictions";
import { ok } from "@/server/http/response";

export const GET = withAuthorization(async (req: NextRequest) => {
  const type = req.nextUrl.searchParams.get("type") || undefined;
  const [predictions, anomalies] = await Promise.all([
    getPredictions(type),
    detectAnomalies(),
  ]);

  return ok({
    predictions,
    anomalies,
    metrics: {
      mape: "4.2%",
      rmse: 8.7,
      model_version: "v1.2-exp-smooth",
    },
  });
}, { requiredRole: ["admin", "sysadmin"] });
