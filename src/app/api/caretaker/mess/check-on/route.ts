import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { publishNotification } from "@/lib/notifications/bus";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const body = await req.json().catch(() => null);
  const studentId = String(body?.student_id ?? "").trim();
  const note = String(body?.note ?? "Missed meal — please check on resident").trim();

  if (!studentId) {
    return fail("INVALID_INPUT", "student_id is required", 400);
  }

  const { rows: stuRows } = await query<{ name: string; unique_id: string; hostel_block: string | null }>(
    `SELECT name, unique_id, hostel_block FROM public.users WHERE id = $1::uuid LIMIT 1`,
    [studentId],
  );
  const stu = stuRows[0];
  if (!stu) return fail("NOT_FOUND", "Student not found", 404);

  await addAudit({
    action: "CARETAKER_CHECK_ON_RESIDENT",
    userId: auth.userId,
    role: auth.role,
    details: { studentId, rollNo: stu.unique_id, hostelBlock: stu.hostel_block, note },
  });

  const scope = stu.hostel_block ? `hostel:${stu.hostel_block}` : "mess";
  await publishNotification({
    eventType: "mess.resident.check_on",
    actorId: auth.userId,
    actorRole: auth.role,
    scope,
    title: `Check on resident: ${stu.name} (${stu.unique_id})`,
    message: note,
    payload: { student_id: studentId, roll_no: stu.unique_id, hostel_block: stu.hostel_block },
    priority: "normal",
    channels: ["in_app"],
  }).catch(() => {});

  return ok({ flagged: true, student_id: studentId });
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["caretaker", "hostel_manager", "admin", "sysadmin"],
});
