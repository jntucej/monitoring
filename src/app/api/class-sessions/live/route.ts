// src/app/api/class-sessions/live/route.ts
// GET /api/class-sessions/live?scope=<self|department|academic|campus>
// Live class-session state for the caller, scoped server-side by role.
// The client's `scope` param is advisory — the server clamps it to what the
// caller's role is actually allowed to see (a HOD can't widen to campus).

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { getLiveSessions, resolveLiveScope } from "@/lib/class-live-state";
import type { AuthContext } from "@/lib/authContext";

const ACADEMIC = ["faculty", "hod", "vice_principal", "principal", "admin", "sysadmin"] as const;

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!(ACADEMIC as readonly string[]).includes(auth.role)) {
    return fail("FORBIDDEN", "No live-class scope for this role", 403);
  }

  // Server-authoritative scope from the role. The client's ?scope= only NARROWS
  // (self is the tightest); it can never widen past the role's maximum.
  const serverScope = resolveLiveScope(auth);
  const requested = new URL(req.url).searchParams.get("scope");

  let scope = serverScope;
  if (requested === "self" && auth.role === "faculty") {
    scope = { facultyIds: [auth.userId] };
  } else if (requested === "department" && serverScope.departmentId) {
    scope = { facultyIds: null, departmentId: serverScope.departmentId };
  }
  // 'academic' / 'campus' / no param → keep the role's maximum scope.

  const sessions = await getLiveSessions(scope);
  return ok({
    now: new Date().toISOString(),
    scope: {
      role: auth.role,
      departmentId: scope.departmentId ?? null,
      facultyOnly: scope.facultyIds !== null,
    },
    counts: {
      total: sessions.length,
      live: sessions.filter((s) => s.state === "LIVE").length,
      upcoming: sessions.filter((s) => s.state === "UPCOMING").length,
      missed: sessions.filter((s) => s.state === "MISSED").length,
      substituted: sessions.filter((s) => s.state === "SUBSTITUTED").length,
    },
    sessions,
  });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: [...ACADEMIC],
});
