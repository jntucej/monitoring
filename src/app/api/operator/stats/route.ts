import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { getOperatorStats } from "@/server/services/operator/stats";
import { resolveOperatorGateScope } from "@/server/policy/gate-scope";
import { ok } from "@/server/http/response";
import { TIER } from "@/server/policy/roles";
import type { AuthContext } from "@/lib/authContext";

export const GET = withAuthorization(
  async (req: NextRequest, { auth }: { auth: AuthContext }) => {
    const hintedGateId = req.nextUrl.searchParams.get("gateId") || null;
    const gateId = resolveOperatorGateScope(auth, hintedGateId);
    const stats = await getOperatorStats({
      role: auth.role,
      gateId,
    });
    return ok(stats);
  },
  { requiredRole: TIER.OPERATOR },
);
