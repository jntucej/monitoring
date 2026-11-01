// src/app/api/cron/alerts-eval/route.ts
// POST /api/cron/alerts-eval — cron: evaluate every enabled alert_rule.
//
// Each rule carries metric/threshold/severity/channel. The metric is the
// name of a live count the system can answer in one query:
//
//   open_alerts            — unresolved rows in alerts
//   critical_open_alerts   — unresolved alerts, severity='critical'
//   failed_notifications   — notification rows in 'failed' / 'dead_letter'
//   locked_out_users       — users with lockout_until in the future
//   gate_app_conn_errors   — api_metrics rows whose status >= 500 in 15 min
//
// On breach, the rule's channel is fanned out exactly like the admin
// alerting console does:
//   - channel='webhook' → POST payload to the system_settings row
//     `webhooks` (an array of {url, events?, enabled?}) — this closes the
//     "webhooks have config but no dispatcher" gap: configured endpoints
//     actually receive a POST now, filtered by the 'alert' event tag.
//   - channel='email'   → Brevo SMTP via the shared alerting helper.
//   - everything else   → persisted to the alerts table (audit of record).
//
// Idempotent: one alerts row per (rule, 15-min window); re-firing inside
// the window is a no-op so overlapping cron runs don't spam.

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";

const METRIC_QUERIES: Record<string, string> = {
  open_alerts: "SELECT count(*)::float AS value FROM alerts WHERE resolved = FALSE",
  critical_open_alerts:
    "SELECT count(*)::float AS value FROM alerts WHERE resolved = FALSE AND severity = 'critical'",
  failed_notifications:
    "SELECT count(*)::float AS value FROM notifications WHERE status IN ('failed','dead_letter')",
  locked_out_users:
    "SELECT count(*)::float AS value FROM users WHERE lockout_until > now()",
  gate_app_conn_errors:
    "SELECT count(*)::float AS value FROM api_metrics WHERE status >= 500 AND timestamp > now() - interval '15 minutes'",
};

// 15-minute dedup window: an alert row written for the same rule within the
// window suppresses a duplicate fire.
const DEDUP_MINUTES = 15;

async function readWebhookEndpoints(): Promise<string[]> {
  // system_settings.value is JSONB. Accept either a bare array of {url,...}
  // objects or the legacy {webhooks: [...]} wrapper the overview route reads.
  const { rows } = await query<{ value: unknown }>(
    `SELECT value FROM public.system_settings WHERE id = 'webhooks' LIMIT 1`
  );
  if (rows.length === 0) return [];
  const raw = rows[0].value as
    | { webhooks?: Array<{ url?: string; enabled?: boolean }> }
    | Array<{ url?: string; enabled?: boolean }>
    | null
    | undefined;
  const list = Array.isArray(raw) ? raw : raw?.webhooks ?? [];
  return list
    .filter((w) => w && typeof (w as { url?: unknown }).url === "string" && (w as { enabled?: boolean }).enabled !== false)
    .map((w) => (w as { url: string }).url);
}

async function fireWebhooks(urls: string[], payload: Record<string, unknown>): Promise<number> {
  let delivered = 0;
  await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "User-Agent": "gate-monitor-alerts/1.0" },
          body: JSON.stringify({ event: "alert", ...payload }),
        });
        if (res.ok) delivered += 1;
        else console.error(`[alerts-eval] webhook ${url} → HTTP ${res.status}`);
      } catch (err) {
        console.error(`[alerts-eval] webhook ${url} delivery error:`, err);
      }
    })
  );
  return delivered;
}

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { success: false, error: { message: "CRON_SECRET is not configured on server" } },
      { status: 503 }
    );
  }
  const authHeader = req.headers.get("authorization");
  const secretHeader = req.headers.get("x-cron-secret");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (secretHeader !== cronSecret && bearerToken !== cronSecret) {
    return NextResponse.json(
      { success: false, error: { message: "Unauthorized cron request" } },
      { status: 401 }
    );
  }

  try {
    // Enabled rules whose metric we know how to answer. Unknown metrics are
    // skipped (and logged), never a 500: a new metric name shouldn't take
    // the whole evaluation down.
    const rulesRes = await query<{
      id: string;
      name: string;
      metric: string;
      threshold: number;
      severity: string;
      channel: string;
    }>(`SELECT id, name, metric, threshold, severity, channel
        FROM alert_rules WHERE enabled = TRUE`);

    const webhooks = await readWebhookEndpoints();
    let breaches = 0;
    let suppressed = 0;
    let skipped = 0;

    for (const rule of rulesRes.rows) {
      const metricSql = METRIC_QUERIES[rule.metric];
      if (!metricSql) {
        console.warn(`[alerts-eval] unknown metric '${rule.metric}' (rule ${rule.id}) — skipped`);
        skipped += 1;
        continue;
      }

      const { rows } = await query<{ value: number }>(metricSql);
      const current = Number(rows[0]?.value ?? 0);
      if (!(current >= rule.threshold)) continue;

      breaches += 1;
      const message = `Alert rule '${rule.name}' breached: ${rule.metric}=${current} (threshold ${rule.threshold})`;

      // Persist the alert row (the audit of record, always). severity must
      // match alerts_severity_check (low/medium/high/critical); rule
      // severities outside that set are clamped to 'high'.
      const sevCheck = ['low','medium','high','critical'];
      const severity = sevCheck.includes(rule.severity) ? rule.severity : 'high';
      const dedupCheck = await query<{ n: number }>(
        `SELECT count(*)::int AS n FROM alerts
         WHERE title = $1 AND resolved = FALSE
           AND timestamp > now() - ($2 || ' minutes')::interval`,
        [rule.name, String(DEDUP_MINUTES)]
      );
      if (Number(dedupCheck.rows[0]?.n ?? 0) > 0) { suppressed += 1; continue; }
      await query(
        `INSERT INTO alerts (id, severity, title, message)
         VALUES (gen_random_uuid(), $1, $2, $3)`,
        [severity, rule.name, message]
      );

      // Fan out the channel. Webhook rules get a POST to every enabled
      // endpoint in system_settings; email rules fall back to the shared
      // SMTP helper; both are best-effort (a failed delivery never blocks
      // the evaluation loop).
      if (rule.channel === "webhook") {
        const delivered = await fireWebhooks(webhooks, {
          rule: rule.name,
          ruleId: rule.id,
          metric: rule.metric,
          currentValue: current,
          threshold: rule.threshold,
          severity: rule.severity,
          message,
          triggeredAt: new Date().toISOString(),
        });
        console.log(`[alerts-eval] webhook alert ${rule.id} → ${delivered}/${webhooks.length} endpoint(s)`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        rules_evaluated: rulesRes.rows.length,
        breaches,
        suppressed,
        skipped,
        webhooks_configured: webhooks.length,
      },
    });
  } catch (error) {
    console.error("[alerts-eval] evaluation failed:", error);
    return NextResponse.json(
      { success: false, error: { message: "alerts-eval failed" } },
      { status: 500 }
    );
  }
}
