import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { buildRequestContextEnvelope } from "@/lib/agent/contextEnvelope";
import type { AuthContext } from "@/lib/authContext";

const ALL_ROLES = [
  "student", "faculty", "staff", "hod", "deputy_warden", "hostel_manager",
  "oie", "exam_branch", "exam_superintendent", "vice_principal", "principal",
  "admin", "sysadmin", "operator", "supervisor", "caretaker", "emo",
  "mess_incharge", "dean", "chief_warden", "controller_examinations",
  "addl_controller_academic", "addl_controller_results", "addl_controller_automation",
  "guardian", "parent",
] as const;

async function handleGet(req: Request, { auth }: { auth: AuthContext }) {
  const url = new URL(req.url);
  const envelope = await buildRequestContextEnvelope(auth, {
    route: url.searchParams.get("route"),
    groupId: url.searchParams.get("group_id"),
    classId: url.searchParams.get("class_id"),
    subjectCode: url.searchParams.get("subject_code"),
  });

  return ok({ envelope });
}

export const GET = withAuthorization(handleGet, { requiredRole: [...ALL_ROLES] });
