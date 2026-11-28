import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/agent/llm-circuit — exposes the LLM circuit-breaker state.
 * The Authority Bridge UI uses this to show "Fast-lookup mode" when the
 * circuit is open. No data is fabricated — the table row is the source.
 */
async function implGet(_req: NextRequest, _ctx: { auth: AuthContext }) {
  const { rows } = await query<{ circuit_open: boolean; last_failure_at: string | null; last_success_at: string | null }>(
    `SELECT circuit_open, last_failure_at, last_success_at
       FROM public.llm_circuit_state
      ORDER BY updated_at DESC NULLS LAST LIMIT 1`,
  ).catch(() => ({ rows: [] as { circuit_open: boolean; last_failure_at: string | null; last_success_at: string | null }[] }));
  const r = rows[0];
  return ok({
    circuitOpen: r?.circuit_open ?? false,
    lastFailureAt: r?.last_failure_at ?? null,
    lastSuccessAt: r?.last_success_at ?? null,
  });
}

export const GET = withApiChain(implGet, {
  route: "/api/agent/llm-circuit",
  auth: "user",
  rateLimit: { keyPrefix: "llm_circuit", maxRequests: 60 },
});
