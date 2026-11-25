import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { awardAchievement } from "@/lib/student/achievements";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => null);
  const studentId = String(b?.student_id ?? "").trim();
  const templateId = String(b?.template_id ?? "").trim();
  if (!studentId || !templateId) {
    return fail("INVALID_INPUT", "student_id and template_id are required", 400);
  }

  const res = await awardAchievement({
    studentId,
    templateId,
    awardedBy: auth.userId,
    awardedByRole: auth.role,
    note: b?.note ? String(b.note) : undefined,
    evidenceUrl: b?.evidence_url ? String(b.evidence_url) : undefined,
  });
  if (!res.ok) return fail("AWARD_FAILED", res.error, res.status);
  return ok(res, 201);
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["faculty", "hod", "dean", "principal", "admin", "sysadmin"],
});
