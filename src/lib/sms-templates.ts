/**
 * SMS template registry + renderer.
 *
 * Templates live in the sms_templates table (seeded by migration
 * 20261101160000). Variable syntax is DLT-compliant {#var#}; {{var}} is
 * also accepted for back-compat.
 *
 * enqueueTemplatedSms() renders the template body, validates length, and
 * inserts a row into notification_sms_queue with all fields the worker and
 * admin UI need. The actual send is owned by worker/jobs/send_sms.js.
 */

import { query } from "@/lib/postgres";

export interface SmsTemplate {
  code: string;
  label: string;
  body: string;
  variables: string[];
  sender_id: string;
  dlt_template_id: string | null;
  category: "transactional" | "service" | "promotional";
  is_active: boolean;
}

const cache = new Map<string, SmsTemplate & { fetchedAt: number }>();
const TTL_MS = 60_000;

export async function getSmsTemplate(code: string): Promise<SmsTemplate> {
  const c = cache.get(code);
  if (c && Date.now() - c.fetchedAt < TTL_MS) return c;
  const { rows } = await query<SmsTemplate>(
    `SELECT code, label, body, variables, sender_id, dlt_template_id, category, is_active
       FROM sms_templates WHERE code = $1`,
    [code]
  );
  if (!rows[0]) throw new Error(`SMS template not found: ${code}`);
  if (!rows[0].is_active) throw new Error(`SMS template ${code} is inactive`);
  const t = { ...rows[0], fetchedAt: Date.now() };
  cache.set(code, t);
  return t;
}

export function invalidateSmsTemplateCache(code?: string) {
  if (code) cache.delete(code);
  else cache.clear();
}

/**
 * Render with DLT-style {#var#} syntax. Also accepts {{var}} for back-compat.
 * Missing variables are left in place so the rendered text makes it obvious
 * what's missing rather than silently blanking it.
 */
export function renderSms(body: string, vars: Record<string, string>): string {
  return body
    .replace(/\{#\s*(\w+)\s*#\}/g, (_, k) => vars[k] ?? `{#${k}#}`)
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

export interface EnqueueSmsInput {
  templateCode: string;
  to: string;
  vars?: Record<string, string>;
  createdBy?: string | null;
  notificationId?: string | null;
  priority?: "normal" | "urgent" | "otp";
  /** Override the rendered message (e.g. free-text admin compose). */
  rawMessage?: string;
}

export async function enqueueTemplatedSms(
  input: EnqueueSmsInput
): Promise<{ queueId: string; rendered: string }> {
  let rendered: string;
  let tpl: SmsTemplate | null = null;

  if (input.rawMessage !== undefined) {
    // Free-text: no template lookup needed
    rendered = input.rawMessage;
    if (rendered.length > 1600)
      throw new Error("SMS body exceeds 1600 chars (10 concatenated parts)");
  } else {
    if (!input.templateCode) throw new Error("templateCode or rawMessage required");
    tpl = await getSmsTemplate(input.templateCode);
    rendered = renderSms(tpl.body, input.vars ?? {});
    if (rendered.length > 1600)
      throw new Error(
        `Rendered SMS for template '${tpl.code}' exceeds 1600 chars (${rendered.length})`
      );
  }

  const to = (await import("@/lib/integrations/sms-provider")).normalizePhone(input.to);
  if (!to) throw new Error(`Invalid phone number: ${input.to}`);

  const { rows } = await query<{ id: string }>(
    `INSERT INTO notification_sms_queue
       (phone_number, message, status, priority, sender_id, dlt_template_id,
        template_code, template_vars, notification_id, created_by, next_attempt_at)
     VALUES ($1,$2,'pending',$3,$4,$5,$6,$7,$8,$9,NOW())
     RETURNING id`,
    [
      to,
      rendered,
      input.priority ?? "normal",
      tpl?.sender_id ?? null,
      tpl?.dlt_template_id ?? null,
      tpl?.code ?? null,
      input.vars ? JSON.stringify(input.vars) : null,
      input.notificationId ?? null,
      input.createdBy ?? null,
    ]
  );
  return { queueId: rows[0].id, rendered };
}
