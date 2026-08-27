/**
 * Advanced Alerting & Incident Management Dispatcher
 */

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  durationMinutes: number;
  severity: "critical" | "warning" | "info";
  channel: "opsgenie" | "pagerduty" | "webhook" | "email";
  enabled: boolean;
  createdAt: string;
}

export interface AlertHistory {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: string;
  message: string;
  triggeredAt: string;
  status: "active" | "resolved";
}

let inMemoryRules: AlertRule[] = [
  {
    id: "rule-1",
    name: "High API Error Rate",
    metric: "http_requests_failed_pct",
    threshold: 5,
    durationMinutes: 5,
    severity: "critical",
    channel: "opsgenie",
    enabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "rule-2",
    name: "High DB Response Latency",
    metric: "db_query_duration_ms",
    threshold: 500,
    durationMinutes: 3,
    severity: "warning",
    channel: "pagerduty",
    enabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "rule-3",
    name: "Gate Controller Disconnection",
    metric: "gate_heartbeat_offline_mins",
    threshold: 10,
    durationMinutes: 10,
    severity: "critical",
    channel: "webhook",
    enabled: true,
    createdAt: new Date().toISOString(),
  },
];

let inMemoryAlerts: AlertHistory[] = [
  {
    id: "alert-101",
    ruleId: "rule-3",
    ruleName: "Gate Controller Disconnection",
    severity: "critical",
    message: "Gate #3 turnstile controller lost heartbeat for 12 minutes.",
    triggeredAt: new Date(Date.now() - 3600000).toISOString(),
    status: "resolved",
  },
];

export async function getAlertRules(): Promise<AlertRule[]> {
  return inMemoryRules;
}

export async function createAlertRule(rule: Omit<AlertRule, "id" | "createdAt">): Promise<AlertRule> {
  const newRule: AlertRule = {
    ...rule,
    id: `rule-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  inMemoryRules.push(newRule);
  return newRule;
}

export async function toggleAlertRule(id: string, enabled: boolean): Promise<AlertRule | null> {
  const rule = inMemoryRules.find((r) => r.id === id);
  if (rule) {
    rule.enabled = enabled;
    return rule;
  }
  return null;
}

export async function getAlertHistory(): Promise<AlertHistory[]> {
  return inMemoryAlerts;
}

export async function dispatchAlertNotification(rule: AlertRule, currentVal: number): Promise<void> {
  const alertItem: AlertHistory = {
    id: `alert-${Date.now()}`,
    ruleId: rule.id,
    ruleName: rule.name,
    severity: rule.severity,
    message: `Metric '${rule.metric}' breached threshold ${rule.threshold} (current value: ${currentVal})`,
    triggeredAt: new Date().toISOString(),
    status: "active",
  };
  inMemoryAlerts.unshift(alertItem);
  console.log(`[Alerting Dispatcher] Sending ${rule.severity.toUpperCase()} alert via ${rule.channel}: ${alertItem.message}`);
}

export async function publishAlert(alert: {
  rule_id: string;
  rule_name: string;
  metric: string;
  current_value: number;
  threshold: number;
  severity: string;
  message: string;
}): Promise<void> {
  const alertItem: AlertHistory = {
    id: `alert-${Date.now()}`,
    ruleId: alert.rule_id,
    ruleName: alert.rule_name,
    severity: alert.severity,
    message: alert.message,
    triggeredAt: new Date().toISOString(),
    status: "active",
  };
  inMemoryAlerts.unshift(alertItem);
}
