// src/app/api/complaints/[id]/feedback/route.ts
// POST — student submits feedback for a resolved/awaiting_verification complaint, closing it.

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

  const complaintId = getId(req);
  if (!complaintId) return fail("VALIDATION_ERROR", "ID required", 400);

  const { rows: complaints } = await query<{ raised_by: string | null; status: string }>(
    `SELECT raised_by, status FROM public.complaints WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [complaintId],
  );
  const complaint = complaints[0];
  if (!complaint) return fail("NOT_FOUND", "Complaint not found", 404);
  if (complaint.raised_by !== auth.userId) return fail("FORBIDDEN", "Only the raiser can leave feedback", 403);
  if (!["resolved", "awaiting_verification"].includes(complaint.status)) {
    return fail("NOT_RESOLVED", "Complaint must be resolved before leaving feedback", 409);
  }

  const { rating, comment } = (await req.json().catch(() => ({}))) as {
    rating?: number;
    comment?: string;
  };
  const numRating = Number(rating);
  if (!numRating || numRating < 1 || numRating > 5) {
    return fail("VALIDATION_ERROR", "rating between 1 and 5 required", 400);
  }

  await query(
    `INSERT INTO public.complaint_feedback (complaint_id, rating, comment)
     VALUES ($1, $2, $3)
     ON CONFLICT (complaint_id) DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment`,
    [complaintId, numRating, comment ? comment.trim().slice(0, 1000) : null],
  );

  await query(
    `UPDATE public.complaints SET status = 'closed', closed_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [complaintId],
  );

  await addAudit({
    action: "COMPLAINT_FEEDBACK_RECEIVED",
    userId: auth.userId,
    role: auth.role as Role,
    details: { complaintId, rating: numRating },
  });

  return ok({ closed: true, rating: numRating });
}

export const POST = withAuthorization(handlePost);
