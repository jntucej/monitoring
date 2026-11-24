// src/app/api/class-level-issues/[id]/resolve/route.ts
// POST — HOD/VP/admin resolves a class-level issue; flips all linked requests.

import { NextRequest } from "next/server";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { resolveClassLevelIssue } from "@/lib/class-requests";

function getIssueId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[2] ?? "");
}

async function implPost(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!["hod", "vice_principal", "admin", "sysadmin"].includes(auth.role)) {
    return fail("FORBIDDEN", "Only HOD/VP/admin may resolve class-level issues", 403);
  }
  const id = getIssueId(req);
  if (!id) return fail("MISSING_PARAM", "Issue id required", 400);
  const body = await req.json().catch(() => null);
  const resolution = body?.resolution ? String(body.resolution).slice(0, 500) : "Resolved";

  try {
    const result = await resolveClassLevelIssue(id, auth.userId, resolution);
    return ok(result);
  } catch (e) {
    return fail("DOMAIN_ERROR", e instanceof Error ? e.message : "Failed to resolve issue", 400);
  }
}

export const POST = withMutationGuard(implPost, {});
