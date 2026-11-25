import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const blockFilter = req.nextUrl.searchParams.get("block_id");
  const isWorker = auth.role === "worker";

  const { rows: logs } = await query(
    isWorker
      ? `SELECT l.*, rc.label AS worker_type_label
           FROM public.worker_attendance_logs l
           LEFT JOIN public.worker_assignments wa ON wa.id = l.assignment_id
           LEFT JOIN public.ref_categories rc ON rc.domain = 'worker_type' AND rc.code = wa.worker_type_code
          WHERE l.worker_id = $1::uuid
          ORDER BY l.logged_at DESC
          LIMIT 50`
      : `SELECT l.*, u.name AS worker_name, u.unique_id AS worker_code,
                rc.label AS worker_type_label
           FROM public.worker_attendance_logs l
           JOIN public.users u ON u.id = l.worker_id
           LEFT JOIN public.worker_assignments wa ON wa.id = l.assignment_id
           LEFT JOIN public.ref_categories rc ON rc.domain = 'worker_type' AND rc.code = wa.worker_type_code
          WHERE ($1::text IS NULL OR l.block_id = $1)
          ORDER BY l.logged_at DESC
          LIMIT 100`,
    isWorker ? [auth.userId] : [blockFilter || null],
  );

  const currentState = isWorker ? (logs[0]?.direction ?? "OUT") : null;
  return ok({ current_state: currentState, logs });
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => null);
  const targetWorkerId =
    auth.role === "worker" ? auth.userId : String(b?.worker_id ?? auth.userId).trim();
  const direction = String(b?.direction ?? "").toUpperCase();
  const notes = b?.notes ? String(b.notes).trim() : null;
  const lat = b?.lat != null && Number.isFinite(Number(b.lat)) ? Number(b.lat) : null;
  const lng = b?.lng != null && Number.isFinite(Number(b.lng)) ? Number(b.lng) : null;

  if (!["IN", "OUT", "PING"].includes(direction)) {
    return fail("INVALID_DIRECTION", "direction must be IN, OUT, or PING", 400);
  }

  const { rows: assignRows } = await query<{ id: string; block_id: string | null }>(
    `SELECT id, block_id FROM public.worker_assignments
      WHERE worker_id = $1::uuid AND active = true
      ORDER BY created_at DESC LIMIT 1`,
    [targetWorkerId],
  );
  const assign = assignRows[0];

  const { rows } = await query(
    `INSERT INTO public.worker_attendance_logs
       (worker_id, assignment_id, block_id, direction, logged_by, lat, lng, notes)
     VALUES ($1::uuid, $2::uuid, $3, $4, $5::uuid, $6, $7, $8)
     RETURNING *`,
    [
      targetWorkerId,
      assign?.id ?? null,
      b?.block_id ? String(b.block_id) : assign?.block_id ?? null,
      direction === "PING" ? "IN" : direction,
      auth.userId,
      lat,
      lng,
      direction === "PING" ? notes ?? "Location ping" : notes,
    ],
  );
  return ok(rows[0], 201);
}

async function handleDelete(_req: NextRequest, { auth }: { auth: AuthContext }) {
  await query(
    `DELETE FROM public.worker_attendance_logs
      WHERE worker_id = $1::uuid AND notes = 'Location ping'`,
    [auth.userId],
  );
  await query(
    `UPDATE public.worker_attendance_logs
        SET lat = NULL, lng = NULL
      WHERE worker_id = $1::uuid AND (lat IS NOT NULL OR lng IS NOT NULL)`,
    [auth.userId],
  );
  return ok({ cleared: true });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["worker", "supervisor", "hostel_manager", "principal", "admin", "sysadmin"],
});
export const POST = withAuthorization(handlePost, {
  requiredRole: ["worker", "supervisor", "hostel_manager", "principal", "admin", "sysadmin"],
});
export const DELETE = withAuthorization(handleDelete, {
  requiredRole: ["worker"],
});
