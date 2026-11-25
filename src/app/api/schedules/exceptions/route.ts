import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(req: NextRequest) {
  const targetType = req.nextUrl.searchParams.get("target_type");
  const { rows } = await query(
    `SELECT * FROM public.schedule_exceptions
      WHERE ($1::text IS NULL OR target_type = $1)
      ORDER BY exception_date DESC LIMIT 50`,
    [targetType],
  );
  return ok({ exceptions: rows });
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => null);
  const targetType = String(b?.target_type ?? "campus").trim();
  const targetId = String(b?.target_id ?? "all").trim();
  const exceptionDate = String(b?.exception_date ?? "").trim();
  const overrideMode = String(b?.override_mode ?? "holiday").trim();
  const reason = String(b?.reason ?? "").trim();

  if (!exceptionDate || !reason) {
    return fail("INVALID_INPUT", "exception_date and reason are required", 400);
  }

  const { rows } = await query(
    `INSERT INTO public.schedule_exceptions
       (target_type, target_id, exception_date, override_mode, open_time, close_time, reason, created_by)
     VALUES ($1, $2, $3::date, $4, $5::time, $6::time, $7, $8::uuid)
     ON CONFLICT (target_type, target_id, exception_date) DO UPDATE
       SET override_mode = EXCLUDED.override_mode, open_time = EXCLUDED.open_time,
           close_time = EXCLUDED.close_time, reason = EXCLUDED.reason
     RETURNING *`,
    [targetType, targetId, exceptionDate, overrideMode, b?.open_time ?? null, b?.close_time ?? null, reason, auth.userId],
  );
  return ok(rows[0], 201);
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["operator", "supervisor", "faculty", "hod", "principal", "admin", "sysadmin"],
});
export const POST = withAuthorization(handlePost, {
  requiredRole: ["supervisor", "principal", "admin", "sysadmin"],
});
