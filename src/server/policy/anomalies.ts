import { randomBytes } from "crypto";

export interface AnomalyEvent {
  id: string;
  metric: string;
  actual_value: number;
  expected_value: number;
  z_score: number;
  severity: "low" | "medium" | "high" | "critical";
  timestamp: string;
  message: string;
}

export function classifyAnomaly(
  metric: string,
  actual: number,
  expected: number,
  stdDev: number,
  timestamp: string = new Date().toISOString()
): AnomalyEvent | null {
  const zScore = Math.round(((actual - expected) / stdDev) * 100) / 100;
  if (Math.abs(zScore) < 2.0) {
    return null;
  }

  const severity: "high" | "critical" = Math.abs(zScore) > 3.0 ? "critical" : "high";
  return {
    id: `anom_${Date.now()}_${randomBytes(4).toString("hex")}`,
    metric,
    actual_value: actual,
    expected_value: expected,
    z_score: zScore,
    severity,
    timestamp,
    message: `Anomalous activity in ${metric}: Actual (${actual}) deviates by ${zScore}σ from expected baseline (${expected}).`,
  };
}
