/**
 * Advanced Alerting & Incident Management Dispatcher
 * Persisted using Postgres `alert_rules` and `alerts` tables.
 *
 * Outbound delivery (2026-11): the `webhook` channel POSTs to the
 * configured ALERT_WEBHOOK_URL; the `email` channel reuses the Brevo SMTP
 * transport that the worker email job uses (BREVO_SMTP_* env vars).
 * `opsgenie` / `pagerduty` remain documented no-ops — their SDKs are not in
 * package.json, and adding them is out of scope; rows are still persisted
 * to the `alerts` table so nothing is lost, and the log line says exactly
 * where to wire a real integration later.
 */
import { createTransport } from "nodemailer";

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  durationMinutes: number;
  severity: "critical" | "warning" | "info";
  channel: "opsgenie" | "pagerduty" | "webhook" | "email";
  webhookUrl?: string;
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

import { query } from "@/lib/postgres";

// Per-rule dedup window: a rule that already fired within this window is not
// re-notified (the DB row is still inserted so history is complete).
const DEDUP_WINDOW_MS = 15 * 60 * 1000;
const dedupSeen = new Map<string, number>();

// ── Postgres persistence (replaces the old Supabase service client) ────────

async function readRulesDb(): Promise<AlertRule[]> {
  try {
    const { rows } = await query<{
      id: string; name: string; metric: string; threshold: number;
      duration_minutes: number; severity: string; channel: string;
      webhook_url: string | null; enabled: boolean; created_at: string;
    }>(
      `SELECT id, name, metric, threshold, duration_minutes, severity,
              channel, webhook_url, enabled, created_at
       FROM public.alert_rules ORDER BY created_at DESC`
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      metric: r.metric,
      threshold: Number(r.threshold),
      durationMinutes: r.duration_minutes,
      severity: r.severity as AlertRule["severity"],
      channel: r.channel as AlertRule["channel"],
      webhookUrl: r.webhook_url ?? undefined,
      enabled: r.enabled,
      createdAt: r.created_at,
    }));
  } catch (err) {
    console.error("[alerting] failed to read alert_rules:", err);
    return [];
  }
}

export async function getAlertRules(): Promise<AlertRule[]> {
  return readRulesDb();
}

export async function createAlertRule(
  rule: Omit<AlertRule, "id" | "createdAt">
): Promise<AlertRule> {
  const id = `rule-${Date.now()}`;
  try {
    await query(
      `INSERT INTO public.alert_rules (id, name, metric, threshold, duration_minutes, severity, channel, webhook_url, enabled, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())`,
      [id, rule.name, rule.metric, rule.threshold, rule.durationMinutes,
       rule.severity, rule.channel, rule.webhookUrl ?? null, rule.enabled]
    );
  } catch (err) {
    console.error("[alerting] failed to insert alert rule:", err);
  }
  return { ...rule, id, createdAt: new Date().toISOString() };
}

export async function toggleAlertRule(id: string, enabled: boolean): Promise<AlertRule | null> {
  try {
    const { rows } = await query(
      `UPDATE public.alert_rules SET enabled = $2 WHERE id = $1 RETURNING *`,
      [id, enabled]
    );
    if (rows[0]) {
      return {
        id: rows[0].id,
        name: rows[0].name,
        metric: rows[0].metric,
        threshold: Number(rows[0].threshold),
        durationMinutes: rows[0].duration_minutes,
        severity: rows[0].severity,
        channel: rows[0].channel,
        webhookUrl: rows[0].webhook_url ?? undefined,
        enabled: rows[0].enabled,
        createdAt: rows[0].created_at,
      };
    }
  } catch (err) {
    console.error("[alerting] failed to toggle alert rule:", err);
  }
  return null;
}

export async function getAlertHistory(): Promise<AlertHistory[]> {
  try {
    const { rows } = await query<{
      id: string; gate_id: string | null; title: string; severity: string;
      message: string; timestamp: string; resolved: boolean;
    }>(
      `SELECT id, gate_id, title, severity, message, timestamp, resolved
       FROM public.alerts ORDER BY timestamp DESC LIMIT 50`
    );
    return rows.map((a) => ({
      id: a.id,
      ruleId: a.gate_id || "rule-system",
      ruleName: a.title || "System Alert",
      severity: a.severity,
      message: a.message,
      triggeredAt: a.timestamp,
      status: a.resolved ? "resolved" as const : "active" as const,
    }));
  } catch (err) {
    console.error("[alerting] failed to read alert history:", err);
    return [];
  }
}

// ── Outbound delivery ────────────────────────────────────────────────────────

let cachedTransport: ReturnType<typeof createTransport> | null = null;

function getSmtpTransport(): ReturnType<typeof createTransport> | null {
  if (cachedTransport) return cachedTransport;
  const host = process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com";
  const port = Number(process.env.BREVO_SMTP_PORT || 587);
  const user = process.env.BREVO_SMTP_LOGIN;
  const pass = process.env.BREVO_SMTP_KEY;
  if (!user || !pass) return null;
  cachedTransport = createTransport({
    host,
    port,
    secure: false,
    pool: true,
    auth: { user, pass },
  });
  return cachedTransport;
}

/**
 * Send an alert via the rule's configured channel.
 *
 *   - webhook: POST { rule, metric, value, threshold, severity, message } to
 *     rule.webhookUrl ?? ALERT_WEBHOOK_URL. Non-2xx → logged, not fatal.
 *   - email:   Brevo SMTP (BREVO_SMTP_LOGIN/BREVO_SMTP_KEY), to ALERT_EMAIL_TO
 *     (falls back to the SMTP login address if unset — the operator is the
 *     fallback recipient).
 *   - opsgenie / pagerduty: documented no-ops (no SDK in package.json). The
 *     alert is still persisted to the `alerts` table above, so the history
 *     is intact; wire a real integration by adding a case here.
 */
async function deliverOutbound(
  rule: Pick<AlertRule, "channel" | "webhookUrl" | "name" | "severity">,
  payload: { metric: string; currentValue: number; threshold: number; message: string }
): Promise<void> {
  switch (rule.channel) {
    case "webhook": {
      const url = rule.webhookUrl || process.env.ALERT_WEBHOOK_URL;
      if (!url) {
        console.warn("[alerting] webhook channel: no URL (rule.webhookUrl / ALERT_WEBHOOK_URL) — alert persisted only, not sent");
        return;
      }
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rule: rule.name,
            severity: rule.severity,
            metric: payload.metric,
            currentValue: payload.currentValue,
            threshold: payload.threshold,
            message: payload.message,
            triggeredAt: new Date().toISOString(),
          }),
        });
        if (!res.ok) {
          console.error(`[alerting] webhook ${url} → HTTP ${res.status}`);
        }
      } catch (err) {
        console.error("[alerting] webhook delivery error:", err);
      }
      break;
    }
    case "email": {
      const transport = getSmtpTransport();
      if (!transport) {
        console.warn("[alerting] email channel: BREVO_SMTP_LOGIN/BREVO_SMTP_KEY not configured — alert persisted only, not sent");
        return;
      }
      const to = process.env.ALERT_EMAIL_TO || process.env.BREVO_SMTP_LOGIN || "";
      if (!to) {
        console.warn("[alerting] email channel: no recipient (ALERT_EMAIL_TO / BREVO_SMTP_LOGIN) — alert persisted only, not sent");
        return;
      }
      try {
        await transport.sendMail({
          from: process.env.BREVO_SMTP_FROM || "alerts@campus-access.local",
          to,
          subject: `[${rule.severity.toUpperCase()}] ${rule.name}: ${payload.message}`,
          text: payload.message,
        });
      } catch (err) {
        console.error("[alerting] email delivery error:", err);
      }
      break;
    }
    case "opsgenie":
    case "pagerduty": {
      // No SDK in package.json — documented no-op. The alert is persisted to
      // the `alerts` table; wire OpsGenie/PagerDuty here (their REST APIs
      // are simple HTTP POSTs) when their credentials are in scope.
      console.warn(`[alerting] ${rule.channel} channel is a documented no-op (no SDK wired) — alert persisted only`);
      break;
    }
  }
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
    channel: rule.channel,
    webhookUrl: rule.webhookUrl,
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
  channel?: AlertRule["channel"];
  webhookUrl?: string;
}): Promise<void> {
  // Deduplication: suppress outbound re-delivery within the window. The DB
  // row is still inserted so history stays complete.
  const now = Date.now();
  const last = dedupSeen.get(alert.rule_id) ?? 0;
  const deduped = now - last < DEDUP_WINDOW_MS;
  dedupSeen.set(alert.rule_id, now);

  const dbSeverity = ["low", "medium", "high", "critical", "warning", "info"].includes(alert.severity)
    ? alert.severity
    : "high";

  try {
    await query(
      `INSERT INTO public.alerts (severity, title, message, timestamp, resolved)
       VALUES ($1, $2, $3, now(), false)`,
      [dbSeverity, alert.rule_name || "Anomaly Alert", alert.message]
    );
  } catch (err) {
    console.error("[alerting] failed to persist alert row:", err);
  }

  if (deduped) {
    console.log(`[alerting] ${alert.rule_name}: dedup window active — outbound suppressed, row persisted`);
    return;
  }

  const channel = alert.channel ?? "webhook";
  await deliverOutbound(
    { channel, webhookUrl: alert.webhookUrl, name: alert.rule_name, severity: alert.severity as AlertRule["severity"] },
    {
      metric: alert.metric,
      currentValue: alert.current_value,
      threshold: alert.threshold,
      message: alert.message,
    }
  );
}
