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
  timestamp: string,
): AnomalyEvent | null {
  const zScore = Math.round(((actual - expected) / stdDev) * 100) / 100;
  const abs = Math.abs(zScore);

  if (abs < 2.0) return null;

  const severity = abs > 3.0 ? "critical" : "high";

  return {
    id: `anom_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
    metric,
    actual_value: actual,
    expected_value: expected,
    z_score: zScore,
    severity,
    timestamp,
    message: `Anomalous activity in ${metric}: Actual (${actual}) deviates by ${zScore}σ from expected baseline (${expected}).`,
  };
}
