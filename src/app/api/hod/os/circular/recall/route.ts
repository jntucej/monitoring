import { NextRequest } from "next/server";
import { z } from "zod";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * POST /api/hod/os/circular/recall — recall a published department circular.
 *
 * Stamps SUPERSEDED on the circular (operational_announcements.state =
 * RECALLED), and tombstones the linked RAG chunk so @agent stops quoting the
 * withdrawn text (institutional_knowledge_chunks.tombstone_at). A
 * corrigendum reference is carried in payload_json for the audit trail.
 */
const Body = z.object({
  circularId: z.string(),
  corrigendum: z.string().optional(),
});

async function implPost(req: NextRequest, ctx: ApiChainContext<unknown, AuthContext>) {
  const { auth } = ctx;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return fail("VALIDATION", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }
  const { circularId, corrigendum } = parsed.data;

  const circ = await query<{ id: string; title: string }>(
    `SELECT id, title FROM public.operational_announcements WHERE id = $1::uuid LIMIT 1`,
    [circularId],
  ).catch(() => ({ rows: [] as { id: string; title: string }[] }));
  if (circ.rows.length === 0) {
    return fail("NOT_FOUND", "Circular not found.", 404);
  }

  // Stamp RECALLED (SUPERSEDED) on the live circular.
  await query(
    `UPDATE public.operational_announcements
        SET state = 'RECALLED', updated_at = NOW()
      WHERE id = $1::uuid`,
    [circularId],
  );

  // Tombstone any linked RAG chunk so the agent stops citing it.
  // institutional_knowledge_chunks uses is_tombstoned (boolean), not
  // tombstone_at. source_document_id is a uuid, not a text ref.
  await query(
    `UPDATE public.institutional_knowledge_chunks
        SET is_tombstoned = true, valid_until = NOW()
      WHERE source_document_id = $1::uuid AND is_tombstoned = false`,
    [circularId],
  ).catch(() => ({ rows: [] as never[] }));

  // Audit the recall + corrigendum link.
  await query(
    `INSERT INTO public.policy_change_requests
       (change_type, target_ref, payload_json, drafted_by, status, created_at)
     VALUES ($1, $2, $3::jsonb, $4::uuid, 'DRAFT', NOW())`,
    [
      "circular_recall",
      circularId,
      JSON.stringify({ title: circ.rows[0].title, corrigendum: corrigendum ?? null, recalledBy: auth.userId }),
      auth.userId,
    ],
  );
  return ok({ circularId, recalled: true, corrigendum: corrigendum ?? null });
}

export const POST = withApiChain(implPost, {
  route: "/api/hod/os/circular/recall",
  auth: "user",
  requiredRole: ["hod", "principal", "admin", "sysadmin"],
  rateLimit: { keyPrefix: "hod_os_circular_recall", maxRequests: 60 },
});
