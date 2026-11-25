import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { getActiveShift } from "@/lib/security/shift";
import { publishSecurityEvent } from "@/lib/security/sse";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => null);
  const lat = Number(b?.lat);
  const lng = Number(b?.lng);
  const accuracyM = b?.accuracy_m != null ? Number(b.accuracy_m) : null;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return fail("INVALID_COORDS", "lat and lng are required", 400);
  }

  const shift = await getActiveShift(auth.userId);
  if (!shift) {
    return fail("NO_ACTIVE_SHIFT", "No active shift assignment found", 403);
  }

  // Auto check-in on first ping if still 'assigned'
  if (shift.assignment_status === "assigned") {
    await query(
      `UPDATE public.shift_post_assignments
          SET status = 'checked_in', checked_in_at = NOW()
        WHERE id = $1::uuid AND status = 'assigned'`,
      [shift.assignment_id],
    );
    await query(
      `UPDATE public.security_shifts SET status = 'active' WHERE id = $1::uuid AND status = 'published'`,
      [shift.shift_id],
    );
  }

  await query(
    `INSERT INTO public.guard_live_location (operator_id, shift_id, lat, lng, accuracy_m)
     VALUES ($1::uuid, $2::uuid, $3, $4, $5)`,
    [auth.userId, shift.shift_id, lat, lng, accuracyM],
  );

  publishSecurityEvent("guard_ping", {
    operator_id: auth.userId,
    shift_id: shift.shift_id,
    lat,
    lng,
  });

  return ok({ recorded: true, shift_id: shift.shift_id, post_kind: shift.post_kind, gate_id: shift.gate_id });
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["operator"],
});
