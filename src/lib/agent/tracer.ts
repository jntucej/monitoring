import { query } from "@/lib/postgres";

export interface AgentTraceInput {
  requestId: string;
  sessionId?: string | null;
  userId?: string | null;
  actorRole: string;
  lane: "chat" | "tool" | "ocr" | "classifier";
  toolName?: string | null;
  toolStatus?: "ok" | "denied" | "empty" | "error" | null;
  knowledgeMatchType?: "exact" | "partial" | "none" | null;
  draftEmitted?: boolean;
  latencyMs: number;
}

export async function recordAgentTrace(entry: AgentTraceInput): Promise<void> {
  await query(
    `INSERT INTO public.agent_traces
       (request_id, session_id, user_id, actor_role, lane, tool_name, tool_status,
        knowledge_match_type, draft_emitted, latency_ms)
     VALUES ($1, $2, $3::uuid, $4, $5, $6, $7, $8, $9, $10)`,
    [
      entry.requestId,
      entry.sessionId ?? null,
      entry.userId ?? null,
      entry.actorRole,
      entry.lane,
      entry.toolName ?? null,
      entry.toolStatus ?? null,
      entry.knowledgeMatchType ?? null,
      Boolean(entry.draftEmitted),
      Math.max(0, Math.round(entry.latencyMs)),
    ],
  ).catch(() => {});
}
