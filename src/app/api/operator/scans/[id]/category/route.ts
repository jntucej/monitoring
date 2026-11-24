/**
 * PATCH /api/operator/scans/[id]/category
 *
 * Edit a movement_log's category with a mandatory reason (audit).
 * Logs to scan_corrections + audit_logs.
 */

import { NextRequest } from "next/server";
import { query } from "@/lib/postgres";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { TIER } from "@/server/policy/roles";
import type { AuthContext } from "@/lib/authContext";

function getScanId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  // .../scans/<id>/category  ->  the segment before "category"
  const ci = segments.lastIndexOf("category");
  return ci > 0 ? decodeURIComponent(segments[ci - 1] ?? "") : "";
}

async function handlePatch(req: NextRequest, { auth }: { auth: AuthContext }) {
  const id = getScanId(req);
  if (!id) return fail("MISSING_PARAM", "Scan id required", 400);

  const body = await req.json().catch(() => null);
  const category: string = typeof body?.category === "string" ? body.category.trim() : "";
  const reason: string = typeof body?.reason === "string" ? body.reason.trim() : "";

  if (!category) return fail("VALIDATION", "category required");
  if (!reason) return fail("VALIDATION", "reason required (audit)");

  const upd = await query<{ id: string }>(
    `UPDATE movement_logs SET category = $2 WHERE id = $1::uuid RETURNING id::text`,
    [id, category]
  );
  if (upd.rows.length === 0) {
    return fail("NOT_FOUND", "Scan not found or not yours", 404);
  }

  await query(
    `INSERT INTO scan_corrections (log_id, category, reason, corrected_by)
     VALUES ($1::uuid, $2, $3, $4::uuid)`,
    [id, category, reason, auth.userId]
  );

  return ok({ logId: id, category, reason, at: new Date().toISOString() });
}

export const PATCH = withMutationGuard(handlePatch, {
  requiredRole: TIER.OPERATOR,
  rateLimit: { maxRequests: 30, windowMs: 60_000 },
});
