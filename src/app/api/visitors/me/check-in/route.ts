// /api/visitors/me/check-in — self-scoped visitor check-in. The operator gate
// route /api/visitors/[id]/check-in stays operator-only; this thin wrapper is
// the visitor's own check-in from the /visitor/visit page.

import { NextRequest } from "next/server";
import { assertCsrf } from "@/lib/csrf";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { checkInVisitor, addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

async function handleCheckIn(
  req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const body = (await req.json().catch(() => ({}))) as { hostPersonId?: string; purpose?: string };

  const success = await checkInVisitor(auth.userId, body.hostPersonId, body.purpose);
  if (!success) return fail("DB_ERROR", "Check-in failed", 500);

  await addAudit({
    action: "VISITOR_CHECK_IN_SELF",
    userId: auth.userId,
    role: auth.role as Role,
    details: { visitorId: auth.userId, hostPersonId: body.hostPersonId ?? null },
  });

  return ok({ checkedIn: true });
}

// Self-scoped visitor check-in (a visitor checks themselves in; operators use
// /api/visitors/[id]/check-in).
export const POST = withAuthorization(handleCheckIn, { requiredRole: ["visitor"] as Role[] });
