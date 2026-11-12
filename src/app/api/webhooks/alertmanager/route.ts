import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { query } from "@/lib/postgres";
import { requireSecret } from "@/lib/env";

interface AlertmanagerAlert {
  status: "firing" | "resolved";
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt: string;
  endsAt: string;
  generatorURL?: string;
}

interface AlertmanagerPayload {
  version: string;
  status: "firing" | "resolved";
  receiver: string;
  alerts: AlertmanagerAlert[];
  groupLabels: Record<string, string>;
  commonLabels: Record<string, string>;
  commonAnnotations: Record<string, string>;
  externalURL?: string;
}

/**
 * Verify the Bearer token Alertmanager attaches to every webhook call.
 *
 * Two distinct failure modes, kept distinct on purpose:
 *  - token not configured → 503 (the service is misconfigured, not the
 *    caller; Alertmanager will retry and the operator must set the env).
 *  - token configured but wrong → 401 (a hostile or misrouted caller).
 *
 * requireSecret throws when the variable is absent (it falls back to a
 * dev constant in dev/test, which is acceptable inside this check because
 * the same constant is what a dev Alertmanager would be configured with).
 */
function verifyAlertmanagerToken(req: NextRequest): NextResponse | null {
  let expected: string;
  try {
    expected = requireSecret("ALERTMANAGER_WEBHOOK_TOKEN", 16);
  } catch {
    // Fail closed: no token configured means no webhook acceptance.
    return NextResponse.json(
      { success: false, error: { code: "SERVICE_UNAVAILABLE" } },
      { status: 503 },
    );
  }

  const supplied =
    req.headers.get("x-alertmanager-token") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  ) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED" } },
      { status: 401 },
    );
  }
  return null;
}

const EMOJI: Record<string, string> = {
  critical: "🚨",
  warning: "⚠️",
  info: "ℹ️",
};

function formatAlert(a: AlertmanagerAlert): string {
  const severity = a.labels.severity ?? "warning";
  const emoji = EMOJI[severity] ?? "⚠️";
  const status = a.status === "resolved" ? "✅ RESOLVED" : `${emoji} FIRING`;
  const name = a.labels.alertname ?? "alert";
  const summary = a.annotations.summary ?? "";
  const desc = a.annotations.description ?? "";
  return `${status}: *${name}*\n${summary}${desc ? "\n" + desc : ""}`;
}

async function sendTelegram(text: string, severity: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat =
    severity === "critical"
      ? (process.env.TELEGRAM_CRITICAL_CHAT_ID ?? process.env.TELEGRAM_CHAT_ID)
      : process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chat,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  const denied = verifyAlertmanagerToken(req);
  if (denied) return denied;

  const payload = (await req.json().catch(() => null)) as
    | AlertmanagerPayload
    | null;
  if (!payload || !Array.isArray(payload.alerts)) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST" } },
      { status: 400 },
    );
  }

  let delivered = 0;
  for (const a of payload.alerts.slice(0, 20)) {
    const text = formatAlert(a);
    const severity = a.labels.severity ?? "warning";
    const ok = await sendTelegram(text, severity);
    if (ok) delivered += 1;
    // Persist every firing alert into the app's own alerts table so the
    // admin Alerts page is a mirror of Prometheus, not a separate universe.
    if (a.status === "firing") {
      await query(
        `INSERT INTO public.system_alerts (severity, message, details, resolved, created_at)
         VALUES ($1, $2, $3, FALSE, $4)`,
        [
          severity === "critical" ? "critical" : "warning",
          a.annotations.summary ?? a.labels.alertname ?? "prometheus alert",
          JSON.stringify({
            source: "prometheus",
            labels: a.labels,
            annotations: a.annotations,
          }),
          a.startsAt,
        ],
      ).catch(() => undefined);
    }
  }

  return NextResponse.json({
    success: true,
    delivered,
    received: payload.alerts.length,
  });
}
