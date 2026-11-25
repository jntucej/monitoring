import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";

async function handleGet() {
  const { rows } = await query(
    `SELECT * FROM public.security_shift_templates ORDER BY start_time ASC`,
  );
  return ok({ templates: rows });
}

async function handlePost(req: NextRequest) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => null);
  const name = String(b?.name ?? "").trim();
  const startTime = String(b?.start_time ?? "").trim();
  const endTime = String(b?.end_time ?? "").trim();
  const daysOfWeek = Array.isArray(b?.days_of_week) ? b.days_of_week.map(Number) : [1, 2, 3, 4, 5, 6, 7];

  if (!name || !startTime || !endTime) {
    return fail("INVALID_INPUT", "name, start_time, end_time are required", 400);
  }

  const { rows } = await query(
    `INSERT INTO public.security_shift_templates (name, start_time, end_time, days_of_week)
     VALUES ($1, $2::time, $3::time, $4::int[])
     RETURNING *`,
    [name, startTime, endTime, daysOfWeek],
  );
  return ok(rows[0], 201);
}

async function handlePatch(req: NextRequest) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => null);
  const id = String(b?.id ?? "").trim();
  if (!id) return fail("MISSING_ID", "id is required", 400);

  const { rows } = await query(
    `UPDATE public.security_shift_templates
        SET name = COALESCE($2, name),
            active = COALESCE($3, active)
      WHERE id = $1::uuid
      RETURNING *`,
    [id, b?.name ?? null, b?.active ?? null],
  );
  if (!rows[0]) return fail("NOT_FOUND", "Template not found", 404);
  return ok(rows[0]);
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["supervisor", "admin", "sysadmin"],
});
export const POST = withAuthorization(handlePost, {
  requiredRole: ["supervisor", "admin", "sysadmin"],
});
export const PATCH = withAuthorization(handlePatch, {
  requiredRole: ["supervisor", "admin", "sysadmin"],
});
