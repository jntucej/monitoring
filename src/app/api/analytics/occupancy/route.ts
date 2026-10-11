import { withAuthorization } from "@/middleware/authorization";
import { getCurrentOccupancy } from "@/server/services/occupancy/current";
import { ok } from "@/server/http/response";

export const GET = withAuthorization(async () => {
  const stats = await getCurrentOccupancy();
  return ok(stats);
}, { requiredRole: ["admin", "sysadmin", "operator"] });
