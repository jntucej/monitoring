import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { verifyIdentityQr } from "@/lib/student/qr";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => null);
  const qr = String(b?.qr ?? "").trim();
  const context = String(b?.context ?? "attendance").trim();
  if (!qr) return fail("MISSING_QR", "qr is required", 400);

  const v = await verifyIdentityQr(qr);
  if (!v.ok) {
    return fail("INVALID_QR", `QR verification failed: ${v.reason}`, 400);
  }

  await query(
    `INSERT INTO public.student_qr_scan_log (student_id, scanned_by, scanner_role, context, result)
     VALUES ($1::uuid, $2::uuid, $3, $4, 'ok')`,
    [v.studentId, auth.userId, auth.role, context],
  ).catch(() => {});

  return ok({ valid: true, student_id: v.studentId, roll: v.roll, context });
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["faculty", "operator", "staff", "hod", "admin", "sysadmin"],
});
