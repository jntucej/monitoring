import { NextRequest, NextResponse } from "next/server";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { addAudit } from "@/lib/db";
import type { Role } from "@/lib/types";

/**
 * POST /api/visitors/freeze — pause visitor intake campus-wide.
 * Toggles system_config key `visitor_intake_frozen`; the visitor
 * registration/check-in flow reads it first and rejects new visitors
 * while it is true.
 */
async function handlePost(req: NextRequest, { auth }: { auth: { userId: string; role: Role } }) {
  const db = getSupabaseServiceClient();
  const body = await req.json().catch(() => ({}));
  const enabled = Boolean(body?.enabled ?? true);

  const { data: row, error: rowErr } = await db
    .from("system_config")
    .select("key, value")
    .eq("key", "visitor_intake_frozen")
    .maybeSingle();

  if (rowErr) throw rowErr;

  if (row) {
    const { error } = await db
      .from("system_config")
      .update({ value: enabled ? "true" : "false", updated_at: new Date().toISOString() })
      .eq("key", "visitor_intake_frozen");
    if (error) throw error;
  } else {
    const { error } = await db
      .from("system_config")
      .insert({ key: "visitor_intake_frozen", value: enabled ? "true" : "false" });
    if (error) throw error;
  }

  await addAudit({
    action: "VISITOR_FREEZE",
    userId: auth.userId,
    role: auth.role,
    details: `Visitor intake ${enabled ? "frozen" : "unfrozen"} by emergency playbook.`,
  });

  return NextResponse.json({ success: true, data: { frozen: enabled } });
}

export const POST = withMutationGuard(handlePost, {requiredRole: ["admin", "sysadmin", "principal", "supervisor"], rateLimit: { keyPrefix: "visitors_freeze", maxRequests: 10 }});
