import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

async function handleGet() {
  const { rows } = await query(
    `SELECT v.*, u.name AS student_name, u.unique_id AS roll_number
       FROM public.mess_rule_violations v
       JOIN public.users u ON u.id = v.student_id
      ORDER BY v.created_at DESC LIMIT 50`,
  );
  return ok({ violations: rows });
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => null);
  const studentId = String(b?.student_id ?? "").trim();
  const ruleCode = String(b?.rule_code ?? "").trim();
  const description = String(b?.description ?? "").trim();
  const severity = ["low", "medium", "high"].includes(String(b?.severity)) ? String(b.severity) : "medium";
  if (!studentId || !ruleCode || !description) {
    return fail("INVALID_INPUT", "student_id, rule_code, and description are required", 400);
  }

  const { rows } = await query(
    `INSERT INTO public.mess_rule_violations (student_id, rule_code, description, severity, reported_by)
     VALUES ($1::uuid, $2, $3, $4, $5::uuid) RETURNING *`,
    [studentId, ruleCode, description, severity, auth.userId],
  );
  return ok(rows[0], 201);
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["mess_incharge", "caretaker", "deputy_warden", "hostel_manager", "principal", "admin", "sysadmin"],
});
export const POST = withAuthorization(handlePost, {
  requiredRole: ["mess_incharge", "caretaker", "deputy_warden", "hostel_manager", "admin", "sysadmin"],
});
