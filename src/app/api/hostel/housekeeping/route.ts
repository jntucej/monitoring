import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

async function handleGet() {
  const { rows } = await query(
    `SELECT * FROM public.housekeeping_scores ORDER BY scored_at DESC LIMIT 50`,
  );
  return ok({ scores: rows });
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => null);
  const blockId = String(b?.block_id ?? "").trim();
  const score = Number(b?.score);
  if (!blockId || !Number.isFinite(score) || score < 1 || score > 10) {
    return fail("INVALID_INPUT", "block_id and score (1-10) are required", 400);
  }

  const { rows } = await query(
    `INSERT INTO public.housekeeping_scores (block_id, score, notes, scored_by)
     VALUES ($1, $2, $3, $4::uuid) RETURNING *`,
    [blockId, Math.round(score), b?.notes ?? null, auth.userId],
  );
  return ok(rows[0], 201);
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["caretaker", "deputy_warden", "hostel_manager", "principal", "admin", "sysadmin"],
});
export const POST = withAuthorization(handlePost, {
  requiredRole: ["caretaker", "deputy_warden", "hostel_manager", "admin", "sysadmin"],
});
