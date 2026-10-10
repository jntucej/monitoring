import { findPredictions } from "@/server/repositories/predictions/find";
import { findAnomalyCandidates } from "@/server/repositories/predictions/findAnomalies";
import { classifyAnomaly } from "@/server/policy/anomalies";
import { PredictionItem } from "@/lib/predictive";

export async function getPredictions(type?: string): Promise<PredictionItem[]> {
  const rows = await findPredictions(type);
  return rows as PredictionItem[];
}

export async function detectAnomalies() {
  const candidates = await findAnomalyCandidates();
  const now = new Date().toISOString();

  const anomalies = candidates
    .map((c) => classifyAnomaly(c.metric, c.actual, c.expected, c.stdDev, now))
    .filter((a): a is NonNullable<typeof a> => a !== null);
    
  return anomalies;
}
