// src/app/api/parents/me/children/[childId]/passes/route.ts
// GET /api/parents/me/children/[childId]/passes — a linked child's passes.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query, getLinkedPersons } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

function getChildId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 2] ?? "");
}

async function handleGet(
  req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  const childId = getChildId(req);
  if (!childId) return fail("VALIDATION_ERROR", "childId required", 400);

  const children = await getLinkedPersons(auth.userId, "children_of");
  const linked = children.find((c) => c.id === childId);
  if (!linked) return fail("FORBIDDEN", "Not your child", 403);

  const { rows } = await query(
    `SELECT id, ticket_number, workflow_type, reason, from_date, to_date,
            status, current_stage, created_at, updated_at
       FROM public.permissions
      WHERE requester_user_id = $1
      ORDER BY created_at DESC
      LIMIT 100`,
    [childId],
  );

  return ok({ childId, passes: rows });
}

export const GET = withAuthorization(handleGet);
