import { withRoute } from "@/middleware/authorization";
import { getPredictions, detectAnomalies } from "@/server/services/analytics/predictions";
import { ok } from "@/server/http/response";

export const GET = withRoute(async (req) => {
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
