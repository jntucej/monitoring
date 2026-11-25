import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";

async function handleGet() {
  const { rows } = await query(
    `SELECT p.*, cl.name AS location_name, cl.code AS location_code, cl.gate_id
       FROM public.security_posts p
       JOIN public.campus_locations cl ON cl.id = p.location_id
      ORDER BY p.name ASC`,
  );
  return ok({ posts: rows });
}

async function handlePost(req: NextRequest) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => null);
  const code = String(b?.code ?? "").trim().toUpperCase();
  const name = String(b?.name ?? "").trim();
  const kind = String(b?.kind ?? "").trim();
  const locationId = String(b?.location_id ?? "").trim();
  const capabilities = Array.isArray(b?.capabilities) ? b.capabilities.map(String) : [];
  const minGuards = Number(b?.min_guards ?? 1);
  const maxGuards = Number(b?.max_guards ?? 1);

  if (!code || !name || !kind || !locationId) {
    return fail("INVALID_INPUT", "code, name, kind, location_id are required", 400);
  }

  const { rows } = await query(
    `INSERT INTO public.security_posts (code, name, kind, location_id, capabilities, min_guards, max_guards)
     VALUES ($1, $2, $3, $4::uuid, $5::text[], $6, $7)
     RETURNING *`,
    [code, name, kind, locationId, capabilities, minGuards, maxGuards],
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
    `UPDATE public.security_posts
        SET name = COALESCE($2, name),
            active = COALESCE($3, active)
      WHERE id = $1::uuid
      RETURNING *`,
    [id, b?.name ?? null, b?.active ?? null],
  );
  if (!rows[0]) return fail("NOT_FOUND", "Post not found", 404);
  return ok(rows[0]);
}

async function handleDelete(req: NextRequest) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return fail("MISSING_ID", "id is required", 400);

  await query(`UPDATE public.security_posts SET active = false WHERE id = $1::uuid`, [id]);
  return ok({ deactivated: true, id });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["operator", "supervisor", "admin", "sysadmin"],
});
export const POST = withAuthorization(handlePost, {
  requiredRole: ["supervisor", "admin", "sysadmin"],
});
export const PATCH = withAuthorization(handlePatch, {
  requiredRole: ["supervisor", "admin", "sysadmin"],
});
export const DELETE = withAuthorization(handleDelete, {
  requiredRole: ["supervisor", "admin", "sysadmin"],
});
