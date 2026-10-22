// src/app/api/emergency/alerts/[id]/resolve/route.ts
// PATCH — resolve an emergency SOS alert.

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
        SET resolved_at = NOW()
      WHERE id = $1::uuid AND resolved_at IS NULL
      RETURNING id`,
    [id],
  );
  if (!rows[0]) return fail("NOT_FOUND", "Alert not found or already resolved", 404);

  await addAudit({
    action: "SOS_RESOLVED",
    userId: auth.userId,
    role: auth.role as Role,
    details: { alertId: id },
  });

  return ok({ resolved: true, alertId: id });
}

export const PATCH = withAuthorization(handlePatch);
