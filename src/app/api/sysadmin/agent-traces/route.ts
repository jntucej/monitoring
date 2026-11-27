import { withAuthorization } from "@/middleware/authorization";
import { query } from "@/lib/postgres";
import { ok } from "@/server/http/response";
import { sanitizeAgentPayload } from "@/lib/agent/redactor";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(_req: Request, { auth }: { auth: AuthContext }) {
  const { rows } = await query<{
    id: string;
    request_id: string;
    session_id: string | null;
    actor_role: string;
    lane: string;
    tool_name: string | null;
    tool_status: string | null;
    knowledge_match_type: string | null;
    draft_emitted: boolean;
    latency_ms: number;
    created_at: string;
  }>(
    `SELECT id, request_id, session_id, actor_role, lane, tool_name, tool_status,
            knowledge_match_type, draft_emitted, latency_ms, created_at
       FROM public.agent_traces
      WHERE created_at >= NOW() - INTERVAL '7 days'
      ORDER BY created_at DESC
      LIMIT 100`,
    [],
    { currentUserId: auth.userId, currentRole: auth.role },
  );

  return ok({ traces: sanitizeAgentPayload(rows, auth.role) });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["sysadmin", "admin"],
});
