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
