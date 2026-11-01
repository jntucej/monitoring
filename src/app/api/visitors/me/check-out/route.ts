// /api/visitors/me/check-out — self-scoped visitor check-out (thin wrapper
// around checkOutVisitor; mirrors /api/visitors/me/check-in).

import { NextRequest } from "next/server";
import { assertCsrf } from "@/lib/csrf";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { checkOutVisitor, addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

async function handleCheckOut(
  req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const success = await checkOutVisitor(auth.userId);
  if (!success) return fail("DB_ERROR", "Check-out failed", 500);

  await addAudit({
    action: "VISITOR_CHECK_OUT_SELF",
    userId: auth.userId,
    role: auth.role as Role,
    details: { visitorId: auth.userId },
  });

  return ok({ checkedOut: true });
}

export const POST = withAuthorization(handleCheckOut, { requiredRole: ["visitor"] as Role[] });
