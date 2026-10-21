// src/app/api/visitors/[id]/check-out/route.ts
// POST /api/visitors/[id]/check-out — check a visitor out. The [id] param is the
// visitor user id.

import { NextRequest } from "next/server";
import { assertCsrf } from "@/lib/csrf";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { checkOutVisitor, addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

const GATE_ROLES = ["operator", "admin", "sysadmin", "supervisor"];

function getId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 2] ?? "");
}

async function handlePost(
  req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  if (!GATE_ROLES.includes(auth.role)) {
    return fail("FORBIDDEN", "Not allowed", 403);
  }

  const id = getId(req);
  if (!id) return fail("VALIDATION_ERROR", "id required", 400);

  const success = await checkOutVisitor(id);
  if (!success) return fail("DB_ERROR", "Check-out failed", 500);

  await addAudit({
    action: "VISITOR_CHECK_OUT",
    userId: auth.userId,
    role: auth.role as Role,
    details: { visitorId: id },
  });

  return ok({ id, checkedOut: true });
}

export const POST = withAuthorization(handlePost);
