import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { getDailyStats } from "@/server/services/analytics/daily-stats";
import { ok } from "@/server/http/response";

export const GET = withAuthorization(
  async (req: NextRequest) => {
    const { searchParams } = req.nextUrl;
    const { date, stats } = await getDailyStats({
      date: searchParams.get("date") ?? undefined,
      gateId: searchParams.get("gateId") ?? undefined,
    });
    return ok({ date, stats });
  },
  { requiredRole: ["admin", "sysadmin"] },
);
