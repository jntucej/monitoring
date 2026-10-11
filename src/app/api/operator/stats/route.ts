import { NextRequest } from "next/server";
import { withRoute } from "@/middleware/authorization";
import { getOperatorStats } from "@/server/services/operator/stats";
import { ok } from "@/server/http/response";
import { TIER } from "@/server/policy/roles";
import type { AuthContext } from "@/lib/authContext";

export const GET = withRoute(
  async (_req: NextRequest, { auth }: { auth: AuthContext }) => {
    const stats = await getOperatorStats({
      role: auth.role,
      gateId: auth.gateId ?? null,
    });
    return ok(stats);
  },
  { requiredRole: TIER.OPERATOR },
);
