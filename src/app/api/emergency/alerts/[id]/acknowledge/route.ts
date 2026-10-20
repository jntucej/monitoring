// src/app/api/emergency/alerts/[id]/acknowledge/route.ts
// PATCH — acknowledge an emergency SOS alert.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

function getId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 2] ?? "");
}

async function handlePatch(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  if (!["caretaker", "deputy_warden", "hostel_manager", "principal", "supervisor", "admin", "sysadmin"].includes(auth.role)) {
    return fail("FORBIDDEN", "Not allowed", 403);
  }

  const id = getId(req);
  if (!id) return fail("VALIDATION_ERROR", "ID required", 400);

  const { rows } = await query<{ id: string }>(
    `UPDATE public.emergency_alerts
        SET acknowledged_by = $2::uuid, acknowledged_at = NOW()
      WHERE id = $1::uuid AND acknowledged_at IS NULL
      RETURNING id`,
    [id, auth.userId],
  );
  if (!rows[0]) return fail("NOT_FOUND", "Alert not found or already acknowledged", 404);

  await addAudit({
    action: "SOS_ACKNOWLEDGED",
    userId: auth.userId,
    role: auth.role as Role,
    details: { alertId: id },
  });

  return ok({ acknowledged: true, alertId: id });
}

export const PATCH = withAuthorization(handlePatch);
