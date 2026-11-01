import { NextRequest } from "next/server";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { enqueueTemplatedSms } from "@/lib/sms-templates";
import { normalizePhone } from "@/lib/integrations/sms-provider";
import type { AuthContext } from "@/lib/authContext";

interface Body {
  templateCode?: string;
  rawMessage?: string;
  segment?:
    | "all_parents"
    | "all_students"
    | "hostellers"
    | "day_scholars"
    | "custom";
  recipientIds?: string[];
  phones?: string[];
  vars?: Record<string, string>;
  priority?: "normal" | "urgent";
}

type Recipient = { id: string; name: string; phone: string };

async function resolveRecipients(b: Body): Promise<Recipient[]> {
  if (b.recipientIds?.length) {
    const { rows } = await query<Recipient>(
      `SELECT id, name, phone FROM users
        WHERE id = ANY($1::uuid[]) AND phone IS NOT NULL`,
      [b.recipientIds]
    );
    return rows;
  }
  if (b.phones?.length) {
    return b.phones.map((p, i) => ({ id: `ext-${i}`, name: "", phone: p }));
  }
  if (b.segment === "all_parents") {
    return (
      await query<Recipient>(
        `SELECT id,name,phone FROM users
          WHERE role IN ('parent','guardian') AND phone IS NOT NULL AND status='ACTIVE'`
      )
    ).rows;
  }
  if (b.segment === "all_students") {
    return (
      await query<Recipient>(
        `SELECT id,name,phone FROM users
          WHERE role='student' AND phone IS NOT NULL AND status='ACTIVE'`
      )
    ).rows;
  }
  if (b.segment === "hostellers") {
    return (
      await query<Recipient>(
        `SELECT u.id, u.name, u.phone
           FROM users u JOIN student_details sd ON sd.user_id=u.id
          WHERE u.role='student' AND u.phone IS NOT NULL AND u.status='ACTIVE'
            AND sd.current_entry_type='hosteller'`
      )
    ).rows;
  }
  if (b.segment === "day_scholars") {
    return (
      await query<Recipient>(
        `SELECT u.id, u.name, u.phone
           FROM users u JOIN student_details sd ON sd.user_id=u.id
          WHERE u.role='student' AND u.phone IS NOT NULL AND u.status='ACTIVE'
            AND sd.current_entry_type='day_scholar'`
      )
    ).rows;
  }
  return [];
}

export const POST = withMutationGuard(
  async (req: NextRequest, { auth }: { auth: AuthContext }) => {
    const body = (await req.json().catch(() => ({}))) as Body;
    if (!body.templateCode && !body.rawMessage) {
      return fail("BAD_REQUEST", "templateCode or rawMessage is required", 400);
    }

    const recipients = await resolveRecipients(body);
    if (recipients.length === 0) return fail("NO_RECIPIENTS", "No recipients matched", 400);
    if (recipients.length > 3000)
      return fail("TOO_MANY", "Over 3000 recipients — split into batches", 400);

    let queued = 0;
    for (const r of recipients) {
      const phone = normalizePhone(r.phone);
      if (!phone) continue;
      const vars = { name: r.name, ...(body.vars ?? {}) };
      try {
        await enqueueTemplatedSms({
          templateCode: body.templateCode,
          rawMessage: body.rawMessage,
          to: phone,
          vars,
          priority: body.priority,
          createdBy: auth.userId,
        } as Parameters<typeof enqueueTemplatedSms>[0]);
        queued++;
      } catch {
        // One bad row shouldn't stop the batch; the failed row stays out of the queue.
      }
    }

    await addAudit({
      action: "SMS_BULK_QUEUED",
      userId: auth.userId,
      role: auth.role,
      details: {
        count: queued,
        templateCode: body.templateCode ?? "free-text",
        segment: body.segment ?? "custom",
      },
    });
    return ok({ queued });
  },
  { requiredRole: ["admin", "sysadmin"] }
);
