import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { emitActivity, type ActivityCategory } from "@/lib/student/activity";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => null);
  const studentId = String(b?.student_id ?? "").trim();
  const category = String(b?.category ?? "academic") as ActivityCategory;
  const title = String(b?.title ?? "").trim();
  if (!studentId || !title) {
    return fail("INVALID_INPUT", "student_id and title are required", 400);
  }

  const row = await emitActivity({
    studentId,
    category,
    eventType: "authority_added",
    title,
    body: b?.body ? String(b.body) : undefined,
    actorId: auth.userId,
    actorRole: auth.role,
  });
  return ok(row, 201);
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["hod", "faculty", "deputy_warden", "dean", "admin", "sysadmin"],
});
