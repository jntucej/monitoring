import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  const { rows } = await query(
    `SELECT * FROM public.institutional_deadlines
      WHERE ($1::text IS NULL OR status = $1)
      ORDER BY COALESCE(extended_until, deadline_at) ASC LIMIT 50`,
    [status],
  );
  return ok({ deadlines: rows });
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => null);
  const name = String(b?.name ?? "").trim();
  const deadlineType = String(b?.deadline_type ?? "academic").trim();
  const deadlineAt = String(b?.deadline_at ?? "").trim();
  if (!name || !deadlineAt) return fail("INVALID_INPUT", "name and deadline_at are required", 400);

  const { rows } = await query(
    `INSERT INTO public.institutional_deadlines
       (name, deadline_type, description, academic_year_code, semester, scope, owner_role, deadline_at, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9::uuid)
     RETURNING *`,
    [
      name,
      deadlineType,
      b?.description ?? null,
      b?.academic_year_code ?? null,
      b?.semester ?? null,
      String(b?.scope ?? "campus"),
      String(b?.owner_role ?? auth.role),
      deadlineAt,
      auth.userId,
    ],
  );
  await addAudit({ action: "DEADLINE_CREATED", userId: auth.userId, role: auth.role, details: { id: rows[0].id, name } });
  return ok(rows[0], 201);
}

async function handlePatch(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => null);
  const id = String(b?.id ?? "").trim();
  if (!id) return fail("INVALID_INPUT", "id is required", 400);

  if (b?.extended_until) {
    const { rows } = await query(
      `UPDATE public.institutional_deadlines
          SET extended_until = $2::timestamptz, status = 'extended'
        WHERE id = $1::uuid RETURNING *`,
      [id, b.extended_until],
    );
    await addAudit({ action: "DEADLINE_EXTENDED", userId: auth.userId, role: auth.role, details: { id, extended_until: b.extended_until } });
    return ok(rows[0]);
  }

  const { rows } = await query(
    `UPDATE public.institutional_deadlines SET status = 'archived' WHERE id = $1::uuid RETURNING *`,
    [id],
  );
  await addAudit({ action: "DEADLINE_ARCHIVED", userId: auth.userId, role: auth.role, details: { id } });
  return ok(rows[0]);
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["student", "faculty", "staff", "hod", "dean", "oie", "vice_principal", "principal", "admin", "sysadmin"],
});
export const POST = withAuthorization(handlePost, {
  requiredRole: ["hod", "dean", "oie", "vice_principal", "principal", "admin", "sysadmin"],
});
export const PATCH = withAuthorization(handlePatch, {
  requiredRole: ["hod", "dean", "oie", "vice_principal", "principal", "admin", "sysadmin"],
});
