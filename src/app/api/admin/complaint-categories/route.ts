// src/app/api/admin/complaint-categories/route.ts
// GET — list all complaint categories for admin configuration.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { getCategories } from "@/lib/complaint-taxonomy";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!["admin", "sysadmin", "principal"].includes(auth.role)) {
    return fail("FORBIDDEN", "Not allowed", 403);
  }
  const categories = await getCategories();
  return ok({ categories });
}

export const GET = withAuthorization(handleGet);
