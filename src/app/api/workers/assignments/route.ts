import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  const { rows } = await query(
    auth.role === "worker"
      ? `SELECT wa.*, rc.label AS worker_type_label, u.name AS worker_name, u.unique_id AS worker_code,
                cl.kind AS location_kind, cl.occupant_type
           FROM public.worker_assignments wa
           JOIN public.users u ON u.id = wa.worker_id
           LEFT JOIN public.ref_categories rc ON rc.domain = 'worker_type' AND rc.code = wa.worker_type_code
           LEFT JOIN public.campus_locations cl ON (cl.name = wa.block_id OR cl.code = wa.block_id)
          WHERE wa.worker_id = $1::uuid AND wa.active = true
          ORDER BY wa.created_at DESC`
      : `SELECT wa.*, rc.label AS worker_type_label, u.name AS worker_name, u.unique_id AS worker_code,
                cl.kind AS location_kind, cl.occupant_type
           FROM public.worker_assignments wa
           JOIN public.users u ON u.id = wa.worker_id
           LEFT JOIN public.ref_categories rc ON rc.domain = 'worker_type' AND rc.code = wa.worker_type_code
           LEFT JOIN public.campus_locations cl ON (cl.name = wa.block_id OR cl.code = wa.block_id)
          WHERE wa.active = true
          ORDER BY wa.block_id NULLS LAST, u.name ASC`,
    auth.role === "worker" ? [auth.userId] : [],
  );

  const { rows: workers } =
    auth.role === "worker"
      ? { rows: [] }
      : await query(
          `SELECT id, unique_id, name, status FROM public.users
            WHERE role = 'worker' AND deleted_at IS NULL ORDER BY name ASC`,
        );

  return ok({ assignments: rows, workers });
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => null);
  const workerId = String(b?.worker_id ?? "").trim();
  const workerTypeCode = String(b?.worker_type_code ?? "general").trim();
  const blockId = b?.block_id ? String(b.block_id).trim() : null;
  const shiftName = String(b?.shift_name ?? "Morning").trim();
  const startsAt = String(b?.starts_at ?? "06:00:00").trim();
  const endsAt = String(b?.ends_at ?? "14:00:00").trim();

  if (!workerId) return fail("INVALID_INPUT", "worker_id is required", 400);

  await query(
    `UPDATE public.worker_assignments SET active = false WHERE worker_id = $1::uuid AND active = true`,
    [workerId],
  );

  const { rows } = await query(
    `INSERT INTO public.worker_assignments
       (worker_id, worker_type_code, block_id, shift_name, starts_at, ends_at, assigned_by, active)
     VALUES ($1::uuid, $2, $3, $4, $5::time, $6::time, $7::uuid, true)
     RETURNING *`,
    [workerId, workerTypeCode, blockId, shiftName, startsAt, endsAt, auth.userId],
  );
  return ok(rows[0], 201);
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["worker", "supervisor", "hostel_manager", "principal", "admin", "sysadmin"],
});
export const POST = withAuthorization(handlePost, {
  requiredRole: ["admin", "principal", "hostel_manager", "supervisor", "sysadmin"],
});
