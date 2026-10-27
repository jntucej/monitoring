// src/app/api/admin/consent/stats/route.ts
import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { RATE_LIMITS } from "@/config/app-constants";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

const ALLOWED: Role[] = ["sysadmin", "admin"];

export const GET = withAuthorization(async (_req: NextRequest, { auth }: { auth: AuthContext }) => {
  void auth;
  const svc = getSupabaseServiceClient();
  const { data, error } = await svc
    .from("consent_records")
    .select("scope, granted_at, revoked_at");

  if (error) return fail("DB_ERROR", error.message, 500);

  const byScope = new Map<string, { granted: number; revoked: number; total: number }>();
  for (const row of data ?? []) {
    const scope = (row as { scope?: string }).scope ?? "unknown";
    const rec = byScope.get(scope) ?? { granted: 0, revoked: 0, total: 0 };
    rec.total += 1;
    if ((row as { revoked_at?: string | null }).revoked_at) rec.revoked += 1;
    else rec.granted += 1;
    byScope.set(scope, rec);
  }

  return ok([...byScope.entries()].map(([scope, s]) => ({ scope, ...s })));
}, { requiredRole: ALLOWED, rateLimit: RATE_LIMITS.read } as never);
