// src/app/api/permissions/[ticket]/escalate/route.ts
// POST /api/permissions/[ticket]/escalate — student-initiated escalation to the
// next hostel level after a rejection. Body: { reason?: string }

import { NextRequest } from "next/server";
import { assertCsrf } from "@/lib/csrf";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { prepareEscalateUp, applyEscalateUp } from "@/lib/permission-forward";
import type { AuthContext } from "@/lib/authContext";

function getTicket(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 2] ?? "");
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }): Promise<Response> {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const ticket = getTicket(req);
  const { reason } = (await req.json().catch(() => ({}))) as { reason?: string };

  const prep = await prepareEscalateUp({
    ticketParam: ticket,
    authUserId: auth.userId,
    authUserRole: auth.role,
  });
  if (!prep.ok) return prep.response ?? fail("ESCALATE_FAILED", "Escalation failed", 400);
  if (!prep.ticket || !prep.nextStage) {
    return fail("INTERNAL", "Missing ticket state", 500);
  }

  const result = await applyEscalateUp({
    ticket: prep.ticket,
    nextStage: prep.nextStage,
    actor: { id: auth.userId, name: auth.email ?? "", role: auth.role },
    authUserEmail: auth.email ?? "",
    reason,
  });

  return result.response ?? ok({ ticket, escalatedTo: prep.nextStage });
}

export const POST = withAuthorization(handlePost);
