// src/app/api/complaints/[id]/viewers/route.ts
// GET — list who has viewed a complaint (student sees role-summary only; authority sees names).

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

function getId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 2] ?? "");
}

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const complaintId = getId(req);
  if (!complaintId) return fail("VALIDATION_ERROR", "ID required", 400);

  const { rows: complaints } = await query<{ raised_by: string | null; visible_to_roles: string[]; current_owner_role: string | null }>(
    `SELECT raised_by, visible_to_roles, current_owner_role FROM public.complaints WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [complaintId],
  );
  const complaint = complaints[0];
  if (!complaint) return fail("NOT_FOUND", "Complaint not found", 404);

  const isRaiser = complaint.raised_by === auth.userId;
  const isAuthority = complaint.visible_to_roles.includes(auth.role) || complaint.current_owner_role === auth.role;
  if (!isRaiser && !isAuthority) return fail("FORBIDDEN", "Not allowed", 403);

  const { rows } = await query(
    `SELECT v.viewer_role AS role,
            COUNT(*)::int AS "viewerCount",
            MIN(v.first_viewed_at) AS "firstViewedAt",
            MAX(v.last_viewed_at) AS "lastViewedAt",
            SUM(v.view_count)::int AS "totalViews"
       FROM public.complaint_viewers v
      WHERE v.complaint_id = $1
      GROUP BY v.viewer_role
      ORDER BY MAX(v.last_viewed_at) DESC`,
    [complaintId],
  );

  if (!isAuthority) {
    return ok({ complaintId, viewers: rows, detail: "role-only" });
  }

  const { rows: detailed } = await query(
    `SELECT v.user_id AS "userId", u.name, v.viewer_role AS role,
            v.first_viewed_at AS "firstViewedAt", v.last_viewed_at AS "lastViewedAt",
            v.view_count AS "viewCount"
       FROM public.complaint_viewers v
       JOIN public.users u ON u.id = v.user_id
      WHERE v.complaint_id = $1
      ORDER BY v.last_viewed_at DESC`,
    [complaintId],
  );

  return ok({ complaintId, viewers: rows, detailed, detail: "full" });
}

export const GET = withAuthorization(handleGet);
