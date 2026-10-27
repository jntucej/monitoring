// src/app/api/anti-ragging/cases/[id]/route.ts
// PATCH — update an anti-ragging case status or committee notes (principal/sysadmin).

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
  return decodeURIComponent(segments[segments.length - 1] ?? "");
}

async function handlePatch(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  if (!["principal", "sysadmin", "admin"].includes(auth.role)) {
    return fail("FORBIDDEN", "Not allowed", 403);
  }

  const id = getId(req);
  if (!id) return fail("VALIDATION_ERROR", "ID required", 400);

  const body = (await req.json().catch(() => ({}))) as {
    status?: string;
    committeeNotes?: string;
    assignedTo?: string;
  };

  const { rows } = await query<{ id: string }>(
    `UPDATE public.anti_ragging_cases
        SET status = COALESCE($2, status),
            committee_notes = COALESCE($3, committee_notes),
            assigned_to = COALESCE($4::uuid, assigned_to),
            updated_at = NOW()
      WHERE id = $1::uuid
      RETURNING id`,
    [id, body.status ?? null, body.committeeNotes ?? null, body.assignedTo ?? null],
  );
  if (!rows[0]) return fail("NOT_FOUND", "Case not found", 404);

  await addAudit({
    action: "ANTI_RAGGING_CASE_UPDATED",
    userId: auth.userId,
    role: auth.role as Role,
    details: { caseId: id, status: body.status },
  });

  return ok({ updated: true, caseId: id });
}

export const PATCH = withAuthorization(handlePatch);
