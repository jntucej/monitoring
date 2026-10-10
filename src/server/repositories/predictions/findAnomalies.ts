import { publishAlert } from "@/lib/alerting";
import { AnomalyEvent, classifyAnomaly } from "@/server/policy/anomalies";

export interface MetricCheck {
  metric: string;
  actual: number;
  expected: number;
  stdDev: number;
}

export async function fetchMetricChecks(): Promise<MetricCheck[]> {
  return [
    { metric: "Gate Traffic - Main Entrance", actual: 245, expected: 130, stdDev: 35 },
    { metric: "CSE Department Attendance", actual: 64.2, expected: 88.0, stdDev: 8.5 },
    { metric: "Emergency Out Pass Surge", actual: 42, expected: 12, stdDev: 6.0 },
  ];
}

export async function detectAnomaliesRepository(): Promise<AnomalyEvent[]> {
  const anomalies: AnomalyEvent[] = [];
  const now = new Date().toISOString();
  const checks = await fetchMetricChecks();

  for (const check of checks) {
    const anomaly = classifyAnomaly(check.metric, check.actual, check.expected, check.stdDev, now);
    if (anomaly) {
      anomalies.push(anomaly);
      await publishAlert({
        rule_id: "rule_anomaly_detector",
        rule_name: "AI Anomaly Detector",
        metric: check.metric,
        current_value: check.actual,
        threshold: check.expected + check.stdDev * 2,
        severity: anomaly.severity,
        message: anomaly.message,
      });
    }
  }

  return anomalies;
}
