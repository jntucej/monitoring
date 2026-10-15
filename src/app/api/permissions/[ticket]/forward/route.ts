// src/app/api/permissions/[ticket]/forward/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/permissions/[ticket]/forward
//
// Forwards a hostel permission ticket to a strictly-higher level in the
// caretaker → deputy_warden → hostel_manager → principal chain. Pure decision
// logic (target validation + step-up predicate + update fields) lives in
// permission-workflow.forwardTicket; the L4 HTTP/DB plumbing (step-up
// password verification with lockout, persistence, audit, notification) lives
// in the shared @/lib/permission-forward helpers.
//
// Body: { targetRole: string, comment: string, stepupPassword?: string }
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import withAuthorization from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import {
  prepareHostelForward,
  applyHostelForward,
} from "@/lib/permission-forward";

function getTicketParam(req: NextRequest): string {
  // pathname: /api/permissions/{ticket}/forward → second-to-last segment
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 2] || "");
}

async function handlePost(req: NextRequest, ctx: { auth: AuthContext }): Promise<Response> {
  const auth = ctx.auth;
  const ticketParam = getTicketParam(req);

  if (!ticketParam) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Ticket parameter required" } },
      { status: 400 },
    );
  }

  let body: { targetRole?: unknown; comment?: unknown; stepupPassword?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  // Resolve the actor's display name (mirrors the sign/upload routes).
  const { data: actorRow } = await getSupabaseServiceClient()
    .from("users")
    .select("name")
    .eq("id", auth.userId)
    .maybeSingle();
  const actorName = actorRow?.name || auth.email || "Approver";

  const prep = await prepareHostelForward({
    ticketParam,
    authUserId: auth.userId,
    authUserRole: auth.role,
    authUserEmail: auth.email,
    actorName,
    body,
  });
  if (!prep.ok || prep.response) {
    return prep.response ?? NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Forward could not be prepared" } },
      { status: 400 },
    );
  }

  const result = await applyHostelForward({
    ticket: prep.ticket as NonNullable<typeof prep.ticket>,
    actor: prep.actor as NonNullable<typeof prep.actor>,
    targetRole: prep.targetRole as string,
    comment: prep.comment as string,
    stepupVerified: Boolean(prep.stepupVerified),
    authUserRole: auth.role,
    authUserEmail: auth.email,
    authUserId: auth.userId,
  });
  return result.response;
}

export const POST = withRateLimit(
  withAuthorization(handlePost),
  { keyPrefix: "permission_forward", maxRequests: 30 },
);
