import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { getOccupancyHistory } from "@/server/services/occupancy/history";
import { ok } from "@/server/http/response";

export const GET = withAuthorization(async (req: NextRequest) => {
  const hours = req.nextUrl.searchParams.get("hours");
  const history = await getOccupancyHistory(hours ? Number(hours) : undefined);
  return ok(history);
}, { requiredRole: ["admin", "sysadmin"] });
