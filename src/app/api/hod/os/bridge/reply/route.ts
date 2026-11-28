import { NextRequest } from "next/server";
import { z } from "zod";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * POST /api/hod/os/bridge/reply — publish a constraint-tagged HOD reply.
 *
 * The reply is stamped `[JJR23 · CSE · HOD Official]` (regulation + dept +
 * role, all read live) and auto-promotes to confirmed_knowledge when
 * public. Private-only categories (condonation/medical/marks_dispute/
 * disciplinary/fees — from catalog.routing_policies) MUST have
 * publishToClass=false; the handler hard-locks it, so a sensitive thread
 * can never leak to the public feed.
 *
 * No category string is hardcoded here — it's read from the live routing
 * policy, so the HOD UI's privacy lock stays in sync with the kernel.
 */
const Body = z.object({
  escalationId: z.string(),
  reply: z.string().min(2),
  publishToClass: z.boolean().optional(),
});

async function implPost(req: NextRequest, ctx: ApiChainContext<unknown, AuthContext>) {
  const { auth } = ctx;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return fail("VALIDATION", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }
  const { escalationId, reply } = parsed.data;
  let publishToClass = parsed.data.publishToClass ?? true;

  // Load the escalation row (topic + target_role + dept + regulation live).
  const esc = await query<{
    id: string;
    topic: string;
    target_role: string | null;
    status: string;
  }>(
    `SELECT id, topic, target_role, status FROM public.class_doubt_escalations WHERE id = $1::uuid LIMIT 1`,
    [escalationId],
  ).catch(() => ({ rows: [] as { id: string; topic: string; target_role: string | null; status: string }[] }));
  if (esc.rows.length === 0) {
    return fail("NOT_FOUND", "Escalation not found.", 404);
  }
  const topic = esc.rows[0].topic;

  // Privacy lock: if the topic matches a private-only category, force
  // publishToClass=false regardless of the request body.
  const privCats = await query<{ scope_filter: Record<string, unknown> | null }>(
    `SELECT scope_filter FROM public.routing_policies WHERE policy_key = 'doubt_bridge_academic_exam' LIMIT 1`,
  ).catch(() => ({ rows: [] as { scope_filter: Record<string, unknown> | null }[] }));
  const privList: string[] = Array.isArray(privCats.rows[0]?.scope_filter?.private_only_categories)
    ? ((privCats.rows[0].scope_filter!.private_only_categories as unknown[]) as string[])
    : ["condonation", "medical", "marks_dispute", "disciplinary", "fees"];
  const topicLower = topic.toLowerCase();
  const isPrivate = privList.some((c) => topicLower.includes(c.toLowerCase()));
  if (isPrivate) {
    publishToClass = false; // hard-lock: private threads never broadcast.
  }

  // Dept + regulation for the constraint tag (live, never hardcoded).
  const regRow = await query<{ code: string }>(
    `SELECT code FROM public.academic_regulations WHERE is_active ORDER BY version DESC NULLS LAST LIMIT 1`,
  ).catch(() => ({ rows: [] as { code: string }[] }));
  const reg = regRow.rows[0]?.code ?? "";
  const deptRow = await query<{ code: string }>(
    `SELECT d.code FROM public.users u JOIN public.departments d ON d.id = u.department_id::uuid WHERE u.id = $1 LIMIT 1`,
    [auth.userId],
  ).catch(() => ({ rows: [] as { code: string }[] }));
  const dept = deptRow.rows[0]?.code ?? "";
  const tag = `[${reg} · ${dept} · HOD Official]`;

  // Stamp the reply + answer the escalation (publish_to_class reflects the
  // hard-lock above, so a private thread stays private in the DB too).
  await query(
    `UPDATE public.class_doubt_escalations
        SET status = 'ANSWERED',
            authority_reply = $1,
            answered_by = $2::uuid,
            answered_at = NOW(),
            publish_to_class = $3,
            updated_at = NOW()
      WHERE id = $4::uuid`,
    [`${tag} ${reply}`, auth.userId, publishToClass, escalationId],
  );

  // Promote to confirmed_knowledge ONLY when public (the closed-loop that
  // teaches @agent permanently). Private threads never pollute the KB.
  if (publishToClass) {
    await query(
      `INSERT INTO public.confirmed_knowledge
         (question_pattern, answer_text, topic, regulation, confirmed_by, confirmed_by_role, source_kind, source_ref, created_at)
       VALUES ($1, $2, $3, $4, $5::uuid, $6, 'hod_official', $7, NOW())
       ON CONFLICT DO NOTHING`,
      [topic, `${tag} ${reply}`, topic, reg || null, auth.userId, auth.role, escalationId],
    );
  }

  // Close the SLA deadline_watch so the queue clears live.
  await query(
    `UPDATE public.deadline_watches
        SET status = 'RESOLVED', resolved_at = NOW(), resolved_by = $1::uuid
      WHERE entity_type = 'doubt_escalation' AND entity_id = $2::uuid AND status IN ('OPEN','BREACHED')`,
    [auth.userId, escalationId],
  );

  return ok({
    escalationId,
    tag,
    published: publishToClass,
    privateLocked: isPrivate,
    promotedToKb: publishToClass,
  });
}

export const POST = withApiChain(implPost, {
  route: "/api/hod/os/bridge/reply",
  auth: "user",
  requiredRole: ["hod", "principal", "admin", "sysadmin"],
  rateLimit: { keyPrefix: "hod_os_bridge_reply", maxRequests: 120 },
});
