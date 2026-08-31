/**
 * Advanced Alerting & Incident Management Dispatcher
 * Persisted using Supabase `alert_rules` and `alerts` tables.
 */
import { getSupabaseServiceClient } from "./supabaseClient";

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

let inMemoryRules: AlertRule[] = [];

let inMemoryAlerts: AlertHistory[] = [];

export async function getAlertRules(): Promise<AlertRule[]> {
  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase.from("alert_rules").select("*").order("created_at", { ascending: false });
    if (!error && data && data.length > 0) {
      return data.map((r: any) => ({
        id: r.id,
        name: r.name,
        metric: r.metric,
        threshold: r.threshold,
        durationMinutes: r.duration_minutes,
        severity: r.severity,
        channel: r.channel,
        enabled: r.enabled,
        createdAt: r.created_at,
      }));
    }
  } catch (err) {
    console.error("Error fetching alert rules from DB:", err);
  }
  return inMemoryRules;
}

export async function createAlertRule(rule: Omit<AlertRule, "id" | "createdAt">): Promise<AlertRule> {
  const newRule: AlertRule = {
    ...rule,
    id: `rule-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  try {
    const supabase = getSupabaseServiceClient();
    await supabase.from("alert_rules").insert({
      id: newRule.id,
      name: newRule.name,
      metric: newRule.metric,
      threshold: newRule.threshold,
      duration_minutes: newRule.durationMinutes,
      severity: newRule.severity,
      channel: newRule.channel,
      enabled: newRule.enabled,
      created_at: newRule.createdAt,
    });
  } catch (err) {
    console.error("Error creating alert rule in DB:", err);
  }

  inMemoryRules.push(newRule);
  return newRule;
}

export async function toggleAlertRule(id: string, enabled: boolean): Promise<AlertRule | null> {
  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase.from("alert_rules").update({ enabled }).eq("id", id).select().single();
    if (!error && data) {
      return {
        id: data.id,
        name: data.name,
        metric: data.metric,
        threshold: data.threshold,
        durationMinutes: data.duration_minutes,
        severity: data.severity,
        channel: data.channel,
        enabled: data.enabled,
        createdAt: data.created_at,
      };
    }
  } catch (err) {
    console.error("Error toggling alert rule in DB:", err);
  }

  const rule = inMemoryRules.find((r) => r.id === id);
  if (rule) {
    rule.enabled = enabled;
    return rule;
  }
  return null;
}

export async function getAlertHistory(): Promise<AlertHistory[]> {
  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase.from("alerts").select("*").order("timestamp", { ascending: false }).limit(50);
    if (!error && data && data.length > 0) {
      return data.map((a: any) => ({
        id: a.id,
        ruleId: a.gate_id || "rule-system",
        ruleName: a.title || "System Alert",
        severity: a.severity,
        message: a.message,
        triggeredAt: a.timestamp,
        status: a.resolved ? "resolved" : "active",
      }));
    }
  } catch (err) {
    console.error("Error fetching alert history from DB:", err);
  }
  return inMemoryAlerts;
}

export async function dispatchAlertNotification(rule: AlertRule, currentVal: number): Promise<void> {
  const message = `Metric '${rule.metric}' breached threshold ${rule.threshold} (current value: ${currentVal})`;
  await publishAlert({
    rule_id: rule.id,
    rule_name: rule.name,
    metric: rule.metric,
    current_value: currentVal,
    threshold: rule.threshold,
    severity: rule.severity,
    message,
  });
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

  try {
    const supabase = getSupabaseServiceClient();
    const dbSeverity = ["low", "medium", "high", "critical"].includes(alert.severity) ? alert.severity : "high";
    await supabase.from("alerts").insert({
      severity: dbSeverity,
      title: alert.rule_name || "Anomaly Alert",
      message: alert.message,
      timestamp: alertItem.triggeredAt,
      resolved: false,
    });
  } catch (err) {
    console.error("Error publishing alert to DB:", err);
  }
}
