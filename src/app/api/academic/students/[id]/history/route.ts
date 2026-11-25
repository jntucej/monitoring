import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { recordAcademicTransition, resolveStudentAcademicState } from "@/lib/academic/resolver";

async function handleGet(req: NextRequest) {
  const parts = new URL(req.url).pathname.split("/");
  const studentId = parts[parts.length - 2];

  const [current, timeline] = await Promise.all([
    resolveStudentAcademicState(studentId),
    query(
      `SELECT sah.*, ab.short_name AS branch_short_name
         FROM public.student_academic_history sah
         JOIN public.academic_branches ab ON ab.code = sah.branch_code
        WHERE sah.student_id = $1::uuid
        ORDER BY sah.effective_from DESC`,
      [studentId],
    ),
  ]);

  return ok({ current, timeline: timeline.rows });
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const parts = new URL(req.url).pathname.split("/");
  const studentId = parts[parts.length - 2];
  const b = await req.json().catch(() => null);

  const status = String(b?.academic_status ?? "").trim();
  if (!["active", "detained", "year_back", "branch_change", "readmitted", "graduated"].includes(status)) {
    return fail("INVALID_STATUS", "Invalid academic_status", 400);
  }

  const row = await recordAcademicTransition({
    studentId,
    academicYearCode: String(b?.academic_year_code ?? "2026-27"),
    programCode: String(b?.program_code ?? "BTECH"),
    branchCode: String(b?.branch_code ?? "05"),
    entryModeCode: String(b?.entry_mode_code ?? "1A"),
    regulationCode: b?.regulation_code ?? "R22",
    yearOfStudy: Number(b?.year_of_study ?? 1),
    section: b?.section ?? null,
    academicStatus: status as "active" | "detained" | "year_back" | "branch_change" | "readmitted" | "graduated",
    eventReason: String(b?.event_reason ?? "Academic transition"),
    createdBy: auth.userId,
  });

  return ok(row, 201);
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["faculty", "hod", "dean", "oie", "vice_principal", "principal", "admin", "sysadmin"],
});
export const POST = withAuthorization(handlePost, {
  requiredRole: ["hod", "dean", "oie", "vice_principal", "principal", "admin", "sysadmin"],
});
