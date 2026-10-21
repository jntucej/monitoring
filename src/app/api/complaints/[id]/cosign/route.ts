// src/app/api/complaints/[id]/cosign/route.ts
// POST — student co-signs a complaint.

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

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  if (auth.role !== "student") return fail("FORBIDDEN", "Only students can co-sign complaints", 403);

  const complaintId = getId(req);
  if (!complaintId) return fail("VALIDATION_ERROR", "ID required", 400);

  const { rows: complaints } = await query<{ raised_by: string | null }>(
    `SELECT raised_by FROM public.complaints WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [complaintId],
  );
  if (!complaints[0]) return fail("NOT_FOUND", "Complaint not found", 404);
  if (complaints[0].raised_by === auth.userId) {
    return fail("CANT_COSIGN_OWN", "Cannot co-sign your own complaint", 409);
  }

  await query(
    `INSERT INTO public.complaint_co_signers (complaint_id, user_id)
     VALUES ($1, $2::uuid)
     ON CONFLICT (complaint_id, user_id) DO NOTHING`,
    [complaintId, auth.userId],
  );

  await addAudit({
    action: "COMPLAINT_COSIGNED",
    userId: auth.userId,
    role: auth.role as Role,
    details: { complaintId },
  });

  return ok({ cosigned: true });
}

export const POST = withAuthorization(handlePost);
