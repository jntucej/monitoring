import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { nearestLocation } from "@/lib/security/geo";
import { dispatchSos, logSosEvent, type SosRow } from "@/lib/security/dispatch";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  // Rate limit: 1 SOS per 60 seconds per student
  const { rows: recent } = await query<{ id: string }>(
    `SELECT id FROM public.sos_requests
      WHERE student_id = $1::uuid AND created_at > NOW() - INTERVAL '60 seconds'
      LIMIT 1`,
    [auth.userId],
  );
  if (recent[0]) {
    return fail("RATE_LIMITED", "Please wait 60 seconds before sending another SOS", 429);
  }

  const b = await req.json().catch(() => null);
  const category = String(b?.category ?? "unsafe").trim();
  const priority = (["normal", "urgent", "critical"].includes(String(b?.priority))
    ? String(b.priority)
    : "normal") as "normal" | "urgent" | "critical";
  const lat = b?.lat != null ? Number(b.lat) : null;
  const lng = b?.lng != null ? Number(b.lng) : null;
  const chosenLocId = b?.chosen_loc_id ? String(b.chosen_loc_id) : null;
  const description = b?.description ? String(b.description) : null;
  const photoUrl = b?.photo_url ? String(b.photo_url) : null;

  const nearest =
    lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)
      ? await nearestLocation(lat, lng)
      : null;

  const { rows } = await query<SosRow>(
    `INSERT INTO public.sos_requests
       (student_id, category, priority, student_lat, student_lng, nearest_loc_id, chosen_loc_id, description, photo_url)
     VALUES ($1::uuid, $2, $3, $4, $5, $6::uuid, $7::uuid, $8, $9)
     RETURNING id, student_id, category, priority, status, student_lat::float8, student_lng::float8, nearest_loc_id, chosen_loc_id`,
    [auth.userId, category, priority, lat, lng, nearest?.id ?? null, chosenLocId, description, photoUrl],
  );
  const sos = rows[0];

  await logSosEvent(sos.id, auth.userId, auth.role, "created", {
    category: sos.category,
    priority: sos.priority,
    nearest_loc_id: sos.nearest_loc_id,
  });

  const dispatchResult = await dispatchSos(sos);

  return ok(
    {
      id: sos.id,
      status: sos.status,
      nearest_location: nearest,
      ...dispatchResult,
    },
    201,
  );
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["student"],
});
