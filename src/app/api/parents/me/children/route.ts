// src/app/api/parents/me/children/route.ts
// GET /api/parents/me/children — list the caller's linked children.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { getLinkedPersons } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(
  _req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  const children = await getLinkedPersons(auth.userId, "children_of");
  return ok({
    children: children.map((c) => ({
      id: c.id,
      name: c.fullName,
      roll: c.uniqueId,
      child_id: (c as { child_id?: string }).child_id ?? c.id,
    })),
  });
}

export const GET = withAuthorization(handleGet);
