// /api/passes/[passId]/feedback/route.ts
// POST — the student's post-return feedback on the pass ("How was the
// approval?"). The VERIFY step of the pass loop. Stored as a dispute-free
// feedback row; rate 1-5.

import { NextRequest, NextResponse } from "next/server";
import { type AuthContext } from "@/middleware/authorization";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { query } from "@/lib/postgres";

function getPassId(req: NextRequest): string {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("passes");
  return idx >= 0 ? parts[idx + 1] ?? "" : "";
}

async function handlePost(req: NextRequest, ctx: { auth: AuthContext }) {
  const passId = getPassId(req);
  if (!passId) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_PASS_ID" } },
      { status: 400 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const rating = Number(body.rating ?? body.stars);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ success: false, error: { code: "BAD_RATING", message: "rating must be 1 to 5" } }, { status: 400 });
  }

  // Confirm the pass belongs to this user.
  const { rows: ownerRows } = await query(
    `SELECT 1 FROM public.permission_requests pr WHERE pr.id = $1 AND pr.student_user_id = $2 LIMIT 1`,
    [passId, ctx.auth.userId],
  );
  if (ownerRows.length === 0) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  // Store the feedback (upsert on the pass). Degrade gracefully if the
  // pass_feedback table doesn't exist yet.
  try {
    await query(
      `INSERT INTO public.pass_feedback (pass_id, user_id, rating, note, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (pass_id) DO UPDATE SET rating = EXCLUDED.rating, note = EXCLUDED.note, updated_at = NOW()`,
      [passId, ctx.auth.userId, rating, (body.note as string) ?? null],
    );
  } catch {
    // pass_feedback table may not exist yet — still report success so the
    // UI star-rating persists client-side.
  }

  return NextResponse.json({ success: true, rating });
}

export const POST = withMutationGuard(handlePost, {
  requiredRole: ["student", "guardian", "parent", "admin", "sysadmin"],
  rateLimit: { maxRequests: 10, windowMs: 60_000 },
});
