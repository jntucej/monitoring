import type { DocumentExtraction } from "../schemas/doc.js";
import { parseDocumentExtraction } from "../schemas/doc.js";
import { extractJson as extractM1Json } from "../schemas/m1.js";
import type { AiConfig } from "../config.js";
import { log } from "../logger.js";

const logger = log("m3-doc-intel");

export interface DocIntelRequest {
  /** OCR / extracted document text (already OCR'd for scanned PDFs). */
  text: string;
  /** Document metadata (source, type hint, upload time). */
  metadata?: Record<string, unknown>;
  /** The JSON schema description the model must fill. */
  schemaFields: string[];
}

export class DocumentIntelligenceWorker {
  constructor(private cfg: AiConfig) {}

  async extract(req: DocIntelRequest, timeoutMs: number): Promise<DocumentExtraction> {
    const system = docIntelSystemPrompt(req.schemaFields);
    const user = userBlock(req);
    const signal = AbortSignal.timeout(timeoutMs);

    const raw = await this.chat([
      { role: "system", content: system },
      { role: "user", content: user },
    ], signal);

    try {
      return parseDocumentExtraction(raw, extractM1Json);
    } catch (e) {
      logger.warn({ err: (e as Error).message }, "doc extraction schema violation, retrying");
      const retrySignal = AbortSignal.timeout(timeoutMs);
      const retry = await this.chat(
        [
          { role: "system", content: system },
          { role: "user", content: user },
          { role: "assistant", content: raw },
          { role: "user", content: "Not valid against the schema. Return ONLY the JSON object." },
        ],
        retrySignal,
      );
      return parseDocumentExtraction(retry, extractM1Json);
    }
  }

  private async chat(
    messages: { role: "system" | "user" | "assistant"; content: string }[],
    signal: AbortSignal,
  ): Promise<string> {
    const res = await fetch(`${this.cfg.m3.url}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal,
      body: JSON.stringify({
        model: this.cfg.m3.model,
        num_ctx: this.cfg.m3.ctx,
        temperature: 0.1,
        format: "json",
        stream: false,
        messages,
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`M3 upstream ${res.status}: ${t}`);
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("M3 returned no content");
    return content;
  }
}

function docIntelSystemPrompt(fields: string[]): string {
  return [
    "You extract structured facts from a document. Return ONLY a JSON object.",
    "Required fields: document_type, confidence, document_number, issue_date, valid_from, valid_until, issuer, recipient, amount, currency.",
    "Use null for unknown fields. Dates are ISO YYYY-MM-DD (or YYYY-MM / YYYY). amount is a number.",
    `Additional fields to fill when present: ${fields.join(", ")}.`,
    "Never invent values. When text is insufficient, set confidence low and leave fields null.",
  ].join("\n");
}

function userBlock(req: DocIntelRequest): string {
  const meta = req.metadata ? JSON.stringify(req.metadata) : "{}";
  return `Metadata: ${meta}\n\nDocument text:\n"""\n${req.text}\n"""`;
}
