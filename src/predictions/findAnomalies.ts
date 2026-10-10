import { randomBytes } from "crypto";
import { publishAlert } from "@/lib/alerting";
import { AnomalyEvent } from "@/policy/anomalies";

export async function detectAnomalies(): Promise<AnomalyEvent[]> {
  const anomalies: AnomalyEvent[] = [];
  const now = new Date().toISOString();

  const checks = [
    { metric: "Gate Traffic - Main Entrance", actual: 245, expected: 130, stdDev: 35 },
    { metric: "CSE Department Attendance", actual: 64.2, expected: 88.0, stdDev: 8.5 },
    { metric: "Emergency Out Pass Surge", actual: 42, expected: 12, stdDev: 6.0 },
  ];

  for (const check of checks) {
    const zScore = Math.round(((check.actual - check.expected) / check.stdDev) * 100) / 100;
    if (Math.abs(zScore) >= 2.0) {
      const severity = Math.abs(zScore) > 3.0 ? "critical" : "high";
      const anomaly: AnomalyEvent = {
        id: `anom_${Date.now()}_${randomBytes(4).toString("hex")}`,
        metric: check.metric,
        actual_value: check.actual,
        expected_value: check.expected,
        z_score: zScore,
        severity,
        timestamp: now,
        message: `Anomalous activity in ${check.metric}: Actual (${check.actual}) deviates by ${zScore}σ from expected baseline (${check.expected}).`,
      };
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
