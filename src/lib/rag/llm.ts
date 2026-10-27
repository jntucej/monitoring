import { RAG } from "./config";

export async function* streamCompletion(messages: { role: "system" | "user" | "assistant"; content: string }[]): AsyncGenerator<string, void, unknown> {
  if (!RAG.llm.key) {
    yield "LLM API key (RAG_LLM_API_KEY) is not configured. Please set it in your environment to enable Harbor AI responses.";
    return;
  }

  const res = await fetch(`${RAG.llm.url}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${RAG.llm.key}` },
    body: JSON.stringify({
      model: RAG.llm.model,
      stream: true,
      temperature: 0.3,
      messages,
    }),
  });

  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => "");
    throw new Error(`LLM upstream error ${res.status}: ${errText}`);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += dec.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const json = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
        const content = json.choices?.[0]?.delta?.content;
        if (content) yield content;
      } catch {}
    }
  }
}
