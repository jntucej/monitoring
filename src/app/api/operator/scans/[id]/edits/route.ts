/**
 * GET /api/operator/scans/[id]/edits
 *
 * Returns the category-edit (correction) trail for a movement_log.
 */

import { NextRequest } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { TIER } from "@/server/policy/roles";
import type { AuthContext } from "@/lib/authContext";

function getScanId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  // .../scans/<id>/edits  ->  the segment before "edits"
  const ei = segments.lastIndexOf("edits");
  return ei > 0 ? decodeURIComponent(segments[ei - 1] ?? "") : "";
}

async function handleGet(req: NextRequest, _ctx: { auth: AuthContext }) {
  const id = getScanId(req);
  if (!id) return fail("MISSING_PARAM", "Scan id required", 400);

  const rows = await query<{
    category: string;
    reason: string;
    corrected_by: string;
    corrected_at: string;
    operator_name: string;
  }>(
    `SELECT sc.category,
            sc.reason,
            u.name AS operator_name,
            to_char(sc.corrected_at, 'YYYY-MM-DD HH24:MI') AS corrected_at,
            sc.corrected_by::text
       FROM scan_corrections sc
       JOIN users u ON u.id = sc.corrected_by
      WHERE sc.log_id = $1::uuid
      ORDER BY sc.corrected_at DESC`,
    [id]
  );

  return ok(
    rows.rows.map((r) => ({
      scanId: id,
      category: r.category,
      reason: r.reason,
      editedBy: r.operator_name,
      editedAt: r.corrected_at,
    }))
  );
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: TIER.OPERATOR }),
  { keyPrefix: "operator-scan-edits", maxRequests: 30, windowMs: 60_000 }
);
