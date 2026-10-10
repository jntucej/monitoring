import { NextRequest } from "next/server";
import { withRoute } from "@/middleware/authorization";
import { getDailyStats } from "@/server/services/analytics/daily-stats";
import { ok } from "@/server/http/response";
import { TIER } from "@/server/policy/roles";

export const GET = withRoute(
  async (req: NextRequest) => {
    const { searchParams } = req.nextUrl;
    const { date, stats } = await getDailyStats({
      date: searchParams.get("date") ?? undefined,
      gateId: searchParams.get("gateId") ?? undefined,
    });
    return ok({ date, stats });
  },
  { requiredRole: TIER.SELF },
);
