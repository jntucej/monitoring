import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

async function handleGet() {
  const { rows } = await query(
    `SELECT id, code, name, kind, parent_id, lat::float8, lng::float8, radius_m, gate_id, active, created_at
       FROM public.campus_locations
      ORDER BY name ASC`,
  );
  return ok({ locations: rows });
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => null);
  const code = String(b?.code ?? "").trim().toUpperCase();
  const name = String(b?.name ?? "").trim();
  const kind = String(b?.kind ?? "").trim();
  const lat = Number(b?.lat);
  const lng = Number(b?.lng);
  const radiusM = Number(b?.radius_m ?? 30);
  const gateId = b?.gate_id ? String(b.gate_id) : null;
  const parentId = b?.parent_id ? String(b.parent_id) : null;

  if (!code || !name || !kind || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return fail("INVALID_INPUT", "code, name, kind, lat, lng are required", 400);
  }

  const { rows } = await query(
    `INSERT INTO public.campus_locations (code, name, kind, parent_id, lat, lng, radius_m, gate_id, created_by)
     VALUES ($1, $2, $3, $4::uuid, $5, $6, $7, $8::uuid, $9::uuid)
     RETURNING id, code, name, kind, lat::float8, lng::float8, radius_m, gate_id, active`,
    [code, name, kind, parentId, lat, lng, radiusM, gateId, auth.userId],
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
    `UPDATE public.campus_locations
        SET name = COALESCE($2, name),
            lat = COALESCE($3, lat),
            lng = COALESCE($4, lng),
            radius_m = COALESCE($5, radius_m),
            active = COALESCE($6, active)
      WHERE id = $1::uuid
      RETURNING id, code, name, kind, lat::float8, lng::float8, radius_m, active`,
    [id, b?.name ?? null, b?.lat ?? null, b?.lng ?? null, b?.radius_m ?? null, b?.active ?? null],
  );
  if (!rows[0]) return fail("NOT_FOUND", "Location not found", 404);
  return ok(rows[0]);
}

async function handleDelete(req: NextRequest) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return fail("MISSING_ID", "id is required", 400);

  await query(`UPDATE public.campus_locations SET active = false WHERE id = $1::uuid`, [id]);
  return ok({ deactivated: true, id });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["student", "operator", "supervisor", "admin", "sysadmin"],
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
