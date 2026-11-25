import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { listTemplates } from "@/lib/student/achievements";

async function handleGet() {
  const templates = await listTemplates();
  return ok({ templates });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["student", "faculty", "hod", "dean", "principal", "admin", "sysadmin"],
});
