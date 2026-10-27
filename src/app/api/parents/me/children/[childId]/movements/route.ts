// src/app/api/parents/me/children/[childId]/movements/route.ts
// GET /api/parents/me/children/[childId]/movements — a linked child's recent movement logs.

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
  if (!children.some((c) => c.id === childId)) {
    return fail("FORBIDDEN", "Not your child", 403);
  }

  const { rows } = await query(
    `SELECT m.id, m.direction, m.reason, m.gate_name AS gate_name,
            m.timestamp, m.operator_name AS operator_name
       FROM public.movement_logs m
      WHERE m.user_id = $1
      ORDER BY m.timestamp DESC
      LIMIT 100`,
    [childId],
  );

  return ok({ childId, movements: rows });
}

export const GET = withAuthorization(handleGet);
