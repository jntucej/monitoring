// src/app/api/permissions/[ticket]/can-act/route.ts
// GET /api/permissions/[ticket]/can-act — check whether the current
// actor can act on this ticket. Returns the CanAct decision + the
// next escalation target (via nextActor) when blocked.
//
// Additive: doesn't change ticket state; pure read.

import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import { makeActor, canAct, type Domain, type TicketRequirements } from "@/lib/permission-model";
import { nextActor } from "@/lib/escalation-ladder";
import { getRoleTier } from "@/lib/alert-hierarchy";

const WORKFLOW_TO_DOMAIN: Record<string, Domain> = {
  hostel: "hostel",
  exam: "exam",
  memo: "academics",
  staff_leave: "governance",
  lab_access: "infrastructure",
};

async function implGet(_req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;

  // Find the ticket from the URL path segment.
  const segments = new URL(_req.url).pathname.split("/").filter(Boolean);
  const ticketParam = decodeURIComponent(segments[segments.length - 2] ?? "");
  if (!ticketParam) return fail("MISSING_TICKET", "Ticket param required", 400);

  const { rows } = await query<{
    id: string;
    workflow_type: string;
    status: string;
    current_stage: string;
  }>(
    `SELECT id, workflow_type, status, current_stage
       FROM public.permission_requests
      WHERE ticket_number = $1 OR id = $1
      LIMIT 1`,
    [ticketParam]
  );

  const ticket = rows[0];
  if (!ticket) return fail("TICKET_NOT_FOUND", "Ticket not found", 404);

  const domain: Domain = WORKFLOW_TO_DOMAIN[ticket.workflow_type] ?? "hostel";

  // Build the actor from the auth context.
  const actor = makeActor(auth.userId, auth.role, {
    stepUpVerified: false, // server-side: assume step-up not yet done
  });

  // Build ticket requirements from the domain + workflow.
  const requirements: TicketRequirements = {
    requiredTier: 30, // base tier; real per-ticket tier comes from config in a later phase
    requiredDomain: domain,
    requiresStepUp: ticket.workflow_type === "hostel" && ticket.status === "PENDING",
    allowedFlags: ["clear", "watch"], // probation+ can't act
  };

  const decision = canAct(actor, requirements);

  // If blocked, find the next escalation target.
  let nextTarget: { role: string; reason: string } | null = null;
  if (!decision.allowed) {
    const esc = nextActor(auth.role, domain, decision);
    if (esc) nextTarget = { role: esc.targetRole, reason: esc.explanation };
  }

  return ok({
    ticketId: ticket.id,
    ticketNumber: ticketParam,
    status: ticket.status,
    currentStage: ticket.current_stage,
    domain,
    actor: {
      role: actor.role,
      tier: actor.tier,
      domains: actor.domains,
      flag: actor.flag,
    },
    decision,
    nextTarget,
  });
}

export const GET = withApiChain(implGet, {
  route: "/api/permissions/[ticket]/can-act",
  auth: "user",
  requiredRole: ["admin", "principal", "deputy_warden", "hostel_manager", "caretaker", "faculty", "hod", "vice_principal", "exam_branch", "sysadmin", "oie", "mess_incharge"],
  rateLimit: { keyPrefix: "perm-can-act", maxRequests: 60, windowMs: 60_000 },
});
