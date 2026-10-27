import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { query } from "@/lib/postgres";
import { TIER } from "@/server/policy/roles";

/**
 * GET /api/bot/session/current — rehydrate the caller's live bot conversation.
 *
 * Returns the most recent conversation (if any) with its messages in order,
 * so a hard refresh / new tab can restore what the bot "remembers". This is
 * the server source of truth for the chat history; the client store is a
 * cache (see src/components/bot/store.ts — only lang/voiceReplies are
 * mirrored to localStorage).
 */
async function handleGet(req: NextRequest, context: { auth: { userId: string } }): Promise<NextResponse> {
  try {
    const userId = context.auth.userId;

    // Latest conversation for this user (by updated_at).
    const conv = await query<{ id: string; title: string | null }>(
      `SELECT id, title FROM public.bot_conversations
        WHERE user_id = $1
        ORDER BY updated_at DESC NULLS LAST
        LIMIT 1`,
      [userId],
    );
    const conversationId = conv.rows[0]?.id ?? null;

    if (!conversationId) {
      return NextResponse.json({ success: true, data: { conversationId: null, messages: [] } });
    }

    const msgs = await query<{
      id: string;
      role: string;
      content: string;
      lang: string | null;
      citations: unknown;
      feedback: number | null;
      created_at: string;
    }>(
      `SELECT id, role, content, lang, citations, feedback, created_at
         FROM public.bot_messages
        WHERE conversation_id = $1
        ORDER BY created_at ASC, id::text ASC`,
      [conversationId],
    );

    // Map rows to the client BotMsg shape (src/components/bot/store.ts).
    const messages = msgs.rows.map((m) => ({
      id: m.id,
      dbId: m.id,
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
      citations: Array.isArray(m.citations) ? m.citations : m.citations ? [m.citations] : undefined,
      feedback: typeof m.feedback === "number" ? (m.feedback === 1 ? 1 : -1) : undefined,
      status: "done" as const,
    }));

    return NextResponse.json({
      success: true,
      data: { conversationId, messages },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load bot session";
    console.error("GET /api/bot/session/current failed:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: [...TIER.APP] }),
  { keyPrefix: "bot_session_get", maxRequests: 60 },
);
