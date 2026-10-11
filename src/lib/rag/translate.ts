import { RAG } from "./config";
import type { BotLang } from "./config";

export async function translate(
  text: string,
  from: BotLang | "auto",
  to: BotLang,
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (from === to) return trimmed;

  if (!RAG.llm.key) return trimmed;

  const srcLabel = from === "auto" ? "the detected source language" : from === "te" ? "Telugu" : "English";
  const dstLabel = to === "te" ? "Telugu" : "English";

  const res = await fetch(`${RAG.llm.url}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${RAG.llm.key}` },
    body: JSON.stringify({
      model: RAG.llm.translateModel,
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            `You are a translator. Translate the user's message from ${srcLabel} to ${dstLabel}. ` +
            `Preserve names, roll numbers, codes (like daily_outing, home_out), and technical terms verbatim. ` +
            `Return ONLY the translation — no quotes, no explanation.`,
        },
        { role: "user", content: trimmed },
      ],
    }),
  });
  if (!res.ok) return trimmed;
  const body = await res.json() as { choices: { message: { content: string } }[] };
  return body.choices?.[0]?.message?.content?.trim() || trimmed;
}
