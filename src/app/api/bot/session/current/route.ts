import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { query } from "@/lib/postgres";
import { TIER } from "@/server/policy/roles";

/**
 * GET /api/bot/session/current — rehydrate the caller's live bot conversation.
 *
 * Returns the most recent conversation (if any) with its newest messages
 * (paginated: `limit` / `before` query params), so a hard refresh / new
 * tab can restore what the bot "remembers". This is the server source of
 * truth for the chat history; the client store is a cache (see
 * src/components/bot/store.ts — only lang/voiceReplies are mirrored to
 * localStorage).
 *
 * Pagination: the previous version loaded every message in the
 * conversation on every panel open. A daily user accumulates thousands
 * of messages; every tab open used to fetch all of them. Now the default
 * is the newest 50; pass `limit` (max 200) and `before` (a message id to
 * page further back, i.e. fetch the 50 messages before that id) to load
 * older history as the user scrolls up.
 */
async function handleGet(
  req: NextRequest,
  context: { auth: { userId: string } },
): Promise<NextResponse> {
  try {
    const userId = context.auth.userId;

    const { searchParams } = new URL(req.url);
    const limitRaw = Number(searchParams.get("limit"));
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 50, 1), 200);
    const before = searchParams.get("before"); // message id to page before (older messages)

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
      return NextResponse.json({
        success: true,
        data: { conversationId: null, messages: [], hasMore: false },
      });
    }

    // Newest-first query so `before` (an id) means "fetch the page of
    // messages older than this one". Order by created_at DESC with id as
    // a stable tiebreaker, then reverse for the client, which expects
    // oldest-first within the returned page. `before` is the id of the
    // oldest message in the previous page; use a correlated subquery to
    // find the created_at boundary so we skip exactly that one message.
    const msgs = await query<{
      id: string;
      role: string;
      content: string;
      lang: string | null;
      citations: unknown;
      feedback: number | null;
      created_at: string;
    }>(
      before
        ? `SELECT id, role, content, lang, citations, feedback, created_at
             FROM public.bot_messages
            WHERE conversation_id = $1
              AND (created_at, id) < (
                   SELECT created_at, id FROM public.bot_messages
                    WHERE id = $3 AND conversation_id = $1
                 )
            ORDER BY created_at DESC, id DESC
            LIMIT $2`
        : `SELECT id, role, content, lang, citations, feedback, created_at
             FROM public.bot_messages
            WHERE conversation_id = $1
            ORDER BY created_at DESC, id DESC
            LIMIT $2`,
      before ? [conversationId, limit, before] : [conversationId, limit],
    );

    // Map rows to the client BotMsg shape (src/components/bot/store.ts).
    // Reverse to restore oldest-first order within this page.
    const messages = [...msgs.rows]
      .reverse()
      .map((m) => ({
        id: m.id,
        dbId: m.id,
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
        citations: Array.isArray(m.citations)
          ? m.citations
          : m.citations
            ? [m.citations]
            : undefined,
        feedback: typeof m.feedback === "number" ? (m.feedback === 1 ? 1 : -1) : undefined,
        status: "done" as const,
      }));

    // hasMore: there are older messages still not returned in this page.
    const hasMore = messages.length === limit && (messages[0]?.id ? true : false);

    return NextResponse.json({
      success: true,
      data: {
        conversationId,
        messages,
        hasMore,
        // id of the oldest message in this page — the client passes it
        // back as `before` to fetch the previous page.
        oldestId: messages[0]?.id ?? null,
      },
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
