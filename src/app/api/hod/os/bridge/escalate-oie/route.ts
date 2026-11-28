import { NextRequest } from "next/server";
import { z } from "zod";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * POST /api/hod/os/bridge/escalate-oie — formally escalate an unresolved
 * academic / exam thread to OIE / Exam Branch (protected top-brass path).
 *
 * The HOD is the gatekeeper who can push a department doubt upward. The
 * escalation is written to class_doubt_escalations (target_role=oie) + an
 * audit row in policy_change_requests, so the top-brass chain is fully
 * traceable. Nothing here is a solo institutional act — OIE still owns the
 * final decision (see the governance matrix).
 */
const Body = z.object({
  escalationId: z.string(),
  reason: z.string().min(2),
});

async function implPost(req: NextRequest, ctx: ApiChainContext<unknown, AuthContext>) {
  const { auth } = ctx;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return fail("VALIDATION", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }
  const { escalationId, reason } = parsed.data;

  const esc = await query<{ id: string; topic: string }>(
    `SELECT id, topic FROM public.class_doubt_escalations WHERE id = $1::uuid LIMIT 1`,
    [escalationId],
  ).catch(() => ({ rows: [] as { id: string; topic: string }[] }));
  if (esc.rows.length === 0) {
    return fail("NOT_FOUND", "Escalation not found.", 404);
  }

  // Route the doubt up to OIE (target_role + escalation_chain).
  await query(
    `UPDATE public.class_doubt_escalations
        SET target_role = 'oie',
            escalation_chain = (escalation_chain || ' → oie'),
            status = 'ESCALATED',
            updated_at = NOW()
      WHERE id = $1::uuid`,
    [escalationId],
  );

  // Audit the protected top-brass handoff.
  await query(
    `INSERT INTO public.policy_change_requests
       (change_type, target_ref, payload_json, drafted_by, status, created_at)
     VALUES ($1, $2, $3::jsonb, $4::uuid, 'DRAFT', NOW())`,
    [
      "odt_escalation_to_oie",
      escalationId,
      JSON.stringify({ topic: esc.rows[0].topic, reason, escalatedBy: auth.userId, role: auth.role }),
      auth.userId,
    ],
  );

  return ok({ escalationId, escalatedTo: "oie", auditStatus: "DRAFT" });
}

export const POST = withApiChain(implPost, {
  route: "/api/hod/os/bridge/escalate-oie",
  auth: "user",
  requiredRole: ["hod", "principal", "admin", "sysadmin"],
  rateLimit: { keyPrefix: "hod_os_escalate_oie", maxRequests: 60 },
});
