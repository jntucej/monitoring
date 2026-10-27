import { NextRequest, NextResponse } from "next/server";
import withAuthorization from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";
import type { AuthContext } from "@/lib/authContext";
import {
  prepareHostelForward,
  applyHostelForward,
} from "@/lib/permission-forward";

function getTicketParam(req: NextRequest): string {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("permissions");
  return idx >= 0 ? parts[idx + 1] ?? "" : "";
}

async function handlePost(
  req: NextRequest,
  ctx: { auth: AuthContext }
): Promise<Response> {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const ticket = getTicketParam(req);
  const body = await req.json().catch(() => ({}));

  const prep = await prepareHostelForward({
    ticketParam: ticket,
    authUserId: ctx.auth.userId,
    authUserRole: ctx.auth.role,
    authUserEmail: ctx.auth.email,
    actorName: ctx.auth.email ?? ctx.auth.userId,
    body: {
      targetRole: body.targetRole,
      comment: body.comment,
      stepupPassword: body.stepupPassword,
    },
  });

  if (!prep.ok) {
    return prep.response ?? NextResponse.json(
      { success: false, error: { code: "PREP_FAILED", message: "Forward preparation failed" } },
      { status: 400 }
    );
  }

  const result = await applyHostelForward({
    ticket: prep.ticket!,
    actor: prep.actor!,
    targetRole: prep.targetRole!,
    comment: prep.comment ?? "",
    stepupVerified: Boolean(prep.stepupVerified),
    authUserRole: ctx.auth.role,
    authUserEmail: ctx.auth.email,
    authUserId: ctx.auth.userId,
  });

  if ("response" in result && result.response) return result.response;

  return NextResponse.json({
    success: true,
    data: { ticket, targetRole: prep.targetRole },
  });
}

export const POST = withRateLimit(withAuthorization(handlePost), {
  windowMs: 60_000,
  maxRequests: 30,
});
