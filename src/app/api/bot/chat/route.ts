import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { retrieve } from "@/lib/rag/retriever";
import { buildPrompt, type Turn } from "@/lib/rag/prompt";
import { streamCompletion } from "@/lib/rag/llm";
import { translate } from "@/lib/rag/translate";
import type { BotLang } from "@/lib/rag/config";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

async function handler(req: NextRequest, { auth }: { auth: AuthContext }): Promise<Response> {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const body = await req.json().catch(() => null) as
    { conversationId?: string; message?: string; lang?: BotLang; sourceLang?: BotLang | "auto" } | null;

  const message = (body?.message ?? "").trim();
  const lang: BotLang = body?.lang === "te" ? "te" : "en";
  const sourceLang: BotLang | "auto" = body?.sourceLang ?? "auto";

  if (!message || message.length > 4000) {
    return new Response(JSON.stringify({ error: "invalid_message" }), { status: 400 });
  }

  await query(`UPDATE public.users SET bot_lang=$1 WHERE id=$2`, [lang, auth.userId]);

  let conversationId = body?.conversationId;
  if (conversationId) {
    const { rows } = await query<{ id: string }>(
      `SELECT id FROM public.bot_conversations WHERE id=$1 AND user_id=$2`,
      [conversationId, auth.userId],
    );
    if (!rows.length) conversationId = undefined;
  }
  if (!conversationId) {
    const { rows } = await query<{ id: string }>(
      `INSERT INTO public.bot_conversations (user_id, title) VALUES ($1,$2) RETURNING id`,
      [auth.userId, message.slice(0, 60)],
    );
    conversationId = rows[0].id;
  }

  const { rows: hist } = await query<{ role: Turn["role"]; content: string }>(
    `SELECT role, content FROM public.bot_messages
      WHERE conversation_id=$1 AND role <> 'system' ORDER BY created_at DESC LIMIT 8`,
    [conversationId],
  );
  const history: Turn[] = hist.reverse() as Turn[];

  await query(
    `INSERT INTO public.bot_messages (conversation_id, role, content, lang, source_lang)
     VALUES ($1,'user',$2,$3,$4)`,
    [conversationId, message, lang, sourceLang === "auto" ? null : sourceLang],
  );

  const retrievalQuery = lang === "te"
    ? await translate(message, "te", "en")
    : message;

  const ctx = await retrieve(retrievalQuery, auth.role as Role);
  const { messages, citations } = buildPrompt(message, ctx, history, lang);

  const encoder = new TextEncoder();
  const conv = conversationId;
  const userId = auth.userId;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));

      send("meta", { conversationId: conv, citations, lang });

      let full = "";
      try {
        for await (const delta of streamCompletion(messages)) {
          full += delta;
          send("token", { delta });
        }
      } catch (err) {
        send("error", { message: err instanceof Error ? err.message : "llm_error" });
      } finally {
        await query(
          `INSERT INTO public.bot_messages (conversation_id, role, content, citations, lang)
           VALUES ($1,'assistant',$2,$3::jsonb,$4)`,
          [conv, full || "(no response)", JSON.stringify(citations), lang],
        );
        await query(`UPDATE public.bot_conversations SET updated_at=NOW() WHERE id=$1 AND user_id=$2`, [conv, userId]);
        send("done", {});
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}

export const POST = withRateLimit(withAuthorization(handler), { windowMs: 60_000, maxRequests: 20 });
