// PR-12 — /api/principal/attention/:id/resolve
import { NextRequest } from "next/server";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { resolveAttention } from "@/lib/institutional/attention";
import type { AuthContext } from "@/lib/authContext";

import type { Role } from "@/lib/types";
const WRITE_ROLES: Role[] = ["principal", "admin", "sysadmin"];

async function impl(req: NextRequest, ctx: { auth: AuthContext }) {
  const auth = ctx.auth;
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const id = segments[3] ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("BAD_REQUEST", "Item id must be a uuid", 400);
  try {
    const item = await resolveAttention(id, {
      id: auth.userId, name: auth.email, role: auth.role, roleContext: "administrative",
    });
    return ok({ item });
  } catch (e) {
    return fail("NOT_FOUND", e instanceof Error ? e.message : "Failed to resolve item", 404);
  }
}

export const POST = withMutationGuard(impl, { requiredRole: WRITE_ROLES });
