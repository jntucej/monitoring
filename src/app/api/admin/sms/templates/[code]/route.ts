import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { invalidateSmsTemplateCache } from "@/lib/sms-templates";
import type { AuthContext } from "@/lib/authContext";

function getCode(req: NextRequest): string {
  const segs = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segs[segs.length - 1] ?? "");
}

export const GET = withAuthorization(
  async (req: NextRequest) => {
    const code = getCode(req);
    const { rows } = await query(
      `SELECT code, label, body, variables, sender_id, dlt_template_id,
              category, is_active, created_at, updated_at
         FROM sms_templates WHERE code = $1`,
      [code]
    );
    if (!rows[0]) return fail("NOT_FOUND", `Template ${code} not found`, 404);
    return ok(rows[0]);
  },
  { requiredRole: ["admin", "sysadmin"] }
);

export const PATCH = withMutationGuard(
  async (req: NextRequest, { auth }: { auth: AuthContext }) => {
    const code = getCode(req);
    const body = (await req.json().catch(() => ({}))) as {
      label?: string;
      body?: string;
      variables?: string[];
      sender_id?: string;
      dlt_template_id?: string | null;
      category?: string;
      is_active?: boolean;
    };

    const { rows: existing } = await query<{ code: string }>(
      `SELECT code FROM sms_templates WHERE code = $1`,
      [code]
    );
    if (!existing[0]) return fail("NOT_FOUND", `Template ${code} not found`, 404);

    const updates: string[] = [];
    const params: unknown[] = [];
    for (const [col, val] of [
      ["label", body.label],
      ["body", body.body],
      ["variables", body.variables],
      ["sender_id", body.sender_id],
      ["dlt_template_id", body.dlt_template_id],
      ["category", body.category],
      ["is_active", body.is_active],
    ] as const) {
      if (val !== undefined) {
        params.push(val);
        updates.push(`${col} = $${params.length}`);
      }
    }
    if (updates.length === 0)
      return fail("BAD_REQUEST", "No fields to update", 400);

    params.push(code, auth.userId);
    await query(
      `UPDATE sms_templates
          SET ${updates.join(", ")}, updated_at = NOW(), updated_by = $${params.length - 1}
        WHERE code = $${params.length}`,
      params
    );

    // Snapshot history row
    const { rows: hist } = await query<{ body: string; dlt_template_id: string | null }>(
      `SELECT body, dlt_template_id FROM sms_templates WHERE code = $1`,
      [code]
    );
    if (hist[0]) {
      await query(
        `INSERT INTO sms_template_history (code, version, body, dlt_template_id, updated_by)
         VALUES ($1, (SELECT COALESCE(MAX(version), 0) + 1 FROM sms_template_history h WHERE h.code = $1), $2, $3, $4)`,
        [code, hist[0].body, hist[0].dlt_template_id, auth.userId]
      );
    }

    invalidateSmsTemplateCache(code);

    await addAudit({
      action: "SMS_TEMPLATE_UPDATED",
      userId: auth.userId,
      role: auth.role,
      details: { code, fields: updates.map((u) => u.split(" =")[0]) },
    });

    return ok({ code, updated: updates.map((u) => u.split(" =")[0]) });
  },
  { requiredRole: ["admin", "sysadmin"] }
);
