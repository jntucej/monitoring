// src/app/api/complaints/categories/route.ts
// GET — list all active complaint categories grouped by domain.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { getCategories } from "@/lib/complaint-taxonomy";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(_req: NextRequest, _ctx: { auth: AuthContext }) {
  const categories = await getCategories();
  const byDomain: Record<string, typeof categories> = {};
  for (const c of categories) {
    byDomain[c.domain] = byDomain[c.domain] ?? [];
    byDomain[c.domain].push(c);
  }
  return ok({ categories, byDomain });
}

export const GET = withAuthorization(handleGet);
