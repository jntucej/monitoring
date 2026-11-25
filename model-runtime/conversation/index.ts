import type { ToolAction, ToolSpec } from "../schemas/m1";
import { parseToolAction } from "../schemas/m1";
import type { AiConfig } from "../config";
import { log } from "../logger";

const logger = log("m1-conversation");

export interface ConversationRequest {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  /** Optional tool registry the model may route to. */
  tools?: ToolSpec[];
}

export interface OllamaClient {
  chat(endpoint: AiConfig["m1"], messages: ConversationRequest["messages"], signal: AbortSignal): Promise<string>;
}

/**
 * Default Ollama /v1 chat-completions client. M1 (qwen3:1.7b) is asked to reply
 * with ONLY a JSON object matching the M1 schema when tools are available.
 */
export class OllamaConversationClient implements OllamaClient {
  async chat(endpoint: AiConfig["m1"], messages: ConversationRequest["messages"], signal: AbortSignal): Promise<string> {
    const body = {
      model: endpoint.model,
      num_ctx: endpoint.ctx,
      temperature: 0.2,
      format: "json",
      stream: false,
      messages,
    };
    const res = await fetch(`${endpoint.url}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`M1 upstream ${res.status}: ${text}`);
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("M1 returned no content");
    return content;
  }
}

/**
 * M1 conversation / tool routing. Validates model output against the M1 schema
 * and retries once on a schema violation. Throws a typed error after that.
 */
export class ConversationWorker {
  private client: OllamaClient;
  constructor(private cfg: AiConfig, client?: OllamaClient) {
    this.client = client ?? new OllamaConversationClient();
  }

  async route(req: ConversationRequest, timeoutMs: number): Promise<ToolAction | { reply: string }> {
    const withTools =
      req.tools && req.tools.length
        ? [{ role: "system" as const, content: toolSystemPrompt(req.tools) }, ...req.messages]
        : req.messages;

    const signal = AbortSignal.timeout(timeoutMs);
    let raw = await this.client.chat(this.cfg.m1, withTools, signal);
    try {
      if (req.tools?.length) return parseToolAction(raw);
      const obj = JSON.parse(raw);
      return { reply: typeof obj?.reply === "string" ? obj.reply : raw };
    } catch {
      // One correction retry: tell the model it must return valid JSON.
      const retry: ConversationRequest["messages"] = [
        ...withTools,
        { role: "assistant" as const, content: raw },
        { role: "user" as const, content: "Your last output was not valid JSON. Return ONLY the JSON object." },
      ];
      raw = await this.client.chat(this.cfg.m1, retry, AbortSignal.timeout(timeoutMs));
      if (req.tools?.length) return parseToolAction(raw);
      const obj = JSON.parse(raw) as { reply?: string };
      return { reply: obj.reply ?? raw };
    }
  }

  async plainReply(question: string, timeoutMs: number): Promise<string> {
    const out = await this.route(
      { messages: [{ role: "user", content: question }] },
      timeoutMs,
    );
    return "reply" in out ? out.reply : JSON.stringify(out);
  }
}

function toolSystemPrompt(tools: ToolSpec[]): string {
  const catalog = tools
    .map((t) => `${t.name}: ${t.description} (params: ${Object.keys(t.parameters).join(", ") || "none"})`)
    .join("\n");
  return [
    "You route a campus assistant's request to a tool or a clarification.",
    "Reply with ONLY a JSON object:",
    '{"action": "<tool name or reply>", "parameters": { ... }, "clarify"?: "...", "confidence"?: 0..1}',
    "Use 'reply' as the action when the request just needs a conversational answer.",
    "Extract dates as ISO (YYYY-MM-DD). Do not invent parameters.",
    "Available tools:",
    catalog,
  ].join("\n");
}
