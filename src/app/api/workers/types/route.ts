import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";

async function handleGet() {
  const { rows } = await query(
    `SELECT id, code, label, description, sort_order, active
       FROM public.ref_categories
      WHERE domain = 'worker_type' AND active = true
      ORDER BY sort_order ASC, label ASC`,
  );
  return ok({ types: rows });
}

async function handlePost(req: NextRequest) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => null);
  const code = String(b?.code ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  const label = String(b?.label ?? "").trim();
  const description = b?.description ? String(b.description).trim() : null;

  if (!code || !label) {
    return fail("INVALID_INPUT", "code and label are required", 400);
  }

  const { rows } = await query(
    `INSERT INTO public.ref_categories (domain, code, label, description, sort_order, active)
     VALUES ('worker_type', $1, $2, $3, 99, true)
     ON CONFLICT (domain, code) DO UPDATE
       SET label = EXCLUDED.label, description = COALESCE(EXCLUDED.description, public.ref_categories.description), active = true
     RETURNING id, code, label, description`,
    [code, label, description],
  );
  return ok(rows[0], 201);
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["worker", "supervisor", "hostel_manager", "principal", "admin", "sysadmin"],
});
export const POST = withAuthorization(handlePost, {
  requiredRole: ["admin", "principal", "hostel_manager", "supervisor", "sysadmin"],
});
