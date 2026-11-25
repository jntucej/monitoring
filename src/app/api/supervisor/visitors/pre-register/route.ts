import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

async function handleGet() {
  const [cats, regs] = await Promise.all([
    query(
      `SELECT code, label, description FROM public.ref_categories
        WHERE domain = 'visitor_category' AND active = true ORDER BY sort_order ASC`,
    ),
    query(
      `SELECT v.*, rc.label AS category_label
         FROM public.visitor_pre_registrations v
         LEFT JOIN public.ref_categories rc ON rc.domain = 'visitor_category' AND rc.code = v.category_code
        ORDER BY v.visit_date DESC, v.created_at DESC LIMIT 50`,
    ),
  ]);
  return ok({ categories: cats.rows, pre_registrations: regs.rows });
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => null);
  const name = String(b?.name ?? "").trim();
  const phone = String(b?.phone ?? "").trim();
  const purpose = String(b?.purpose ?? "").trim();
  const visitDate = String(b?.visit_date ?? new Date().toISOString().slice(0, 10)).trim();
  const visitTime = String(b?.visit_time ?? "10:00").trim();
  const categoryCode = String(b?.category_code ?? "guest").trim();

  if (!name || !phone || !purpose) {
    return fail("INVALID_INPUT", "name, phone, and purpose are required", 400);
  }

  const { rows } = await query(
    `INSERT INTO public.visitor_pre_registrations
       (name, email, phone, purpose, visit_date, visit_time, category_code, host_user_id, status)
     VALUES ($1, $2, $3, $4, $5::date, $6, $7, $8::uuid, 'approved')
     RETURNING *`,
    [name, b?.email ?? null, phone, purpose, visitDate, visitTime, categoryCode, auth.userId],
  );
  return ok(rows[0], 201);
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["operator", "supervisor", "admin", "sysadmin", "faculty", "staff"],
});
export const POST = withAuthorization(handlePost, {
  requiredRole: ["operator", "supervisor", "admin", "sysadmin", "faculty", "staff"],
});
