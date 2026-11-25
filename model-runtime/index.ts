// model-runtime/index.ts
// Public surface of the 3-model AI layer. Wires config + backend + manager and
// exposes the two high-level entry points the app calls:
//   - routeConversation(...)  -> M1
//   - runDocumentPipeline(...) -> M2 (OCR, only if scanned) -> M3 (doc intel)
//
// The Ollama backend implements start/stop as Ollama /api/load + /api/unload so
// a stopped worker genuinely releases its resident memory (the core
// resource-efficiency requirement).

import { loadConfig, type AiConfig } from "./config";
import { ModelManager, type WorkerName, type WorkerBackend } from "./manager";
import { ConversationWorker } from "./conversation/index";
import { runOcr, hasUsableTextLayer } from "./ocr/index";
import { DocumentIntelligenceWorker } from "./document-intelligence/index";
import { parseToolAction, type ToolAction, type ToolSpec } from "./schemas/m1";
import type { DocumentExtraction } from "./schemas/doc";
import { log } from "./logger";

const logger = log("ai-runtime");

export class OllamaBackend implements WorkerBackend {
  constructor(private cfg: AiConfig) {}
  private modelFor(n: WorkerName): string {
    return n === "m1" ? this.cfg.m1.model : this.cfg.m3.model;
  }
  private urlFor(n: WorkerName): string {
    return n === "m1" ? this.cfg.m1.url : this.cfg.m3.url;
  }

  async start(n: WorkerName): Promise<number> {
    const t0 = Date.now();
    // Ollama has no explicit "load"; hitting /api/generate with keep_alive warms
    // the model into memory. We record the wall time as the start metric.
    await fetch(`${this.urlFor(n)}/api/tags`); // health probe
    if (n === "m1" || n === "m3") {
      await fetch(`${this.urlFor(n)}/api/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: this.modelFor(n), prompt: "", keep_alive: true, stream: false }),
      }).catch(() => {});
    }
    return Date.now() - t0;
  }

  async stop(n: WorkerName): Promise<void> {
    // Release resident memory: unload the model. OCR (m2) is a per-burst
    // process — nothing to unload; the child is already killed after the batch.
    if (n === "m2") return;
    await fetch(`${this.urlFor(n)}/api/unload`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: this.modelFor(n) }),
    }).catch(() => {});
  }

  isResident(n: WorkerName): boolean {
    // Ollama keeps the model resident until unloaded. We track it ourselves.
    return false;
  }

  async run<T>(n: WorkerName, job: () => Promise<T>): Promise<T> {
    void n;
    return job();
  }
}

/** A backend that tracks residency itself (used by tests + the real manager). */
export class TrackingOllamaBackend extends OllamaBackend {
  private resident = new Set<WorkerName>();
  override isResident(n: WorkerName): boolean {
    return this.resident.has(n);
  }
  override async start(n: WorkerName): Promise<number> {
    const ms = await super.start(n);
    this.resident.add(n);
    return ms;
  }
  override async stop(n: WorkerName): Promise<void> {
    await super.stop(n);
    this.resident.delete(n);
  }
}

export interface AiRuntime {
  config: AiConfig;
  routeConversation(
    messages: { role: "system" | "user" | "assistant"; content: string }[],
    tools?: ToolSpec[],
  ): Promise<ToolAction | { reply: string }>;
  runDocumentPipeline(input: {
    pdf: Buffer;
    /** Pre-extracted text layer, when the PDF is digital. */
    textLayer?: string;
    metadata?: Record<string, unknown>;
    schemaFields?: string[];
  }): Promise<{ ocr: unknown; doc: DocumentExtraction; usedOcr: boolean }>;
  health(): import("./manager.js").WorkerHealth[];
  stopAll(): Promise<void>;
}

export function createAiRuntime(env: NodeJS.ProcessEnv = process.env): AiRuntime {
  const cfg = loadConfig(env);
  const backend = new TrackingOllamaBackend(cfg);
  const manager = new ModelManager(
    backend,
    (n) => (n === "m1" ? cfg.m1IdleStopMs : cfg.idleStopMs),
    cfg.serializedDoc,
  );
  const convo = new ConversationWorker(cfg);
  const docIntel = new DocumentIntelligenceWorker(cfg);

  return {
    config: cfg,
    async routeConversation(messages, tools) {
      return manager.use("m1", () => convo.route({ messages, tools }, cfg.requestTimeoutMs));
    },
    async runDocumentPipeline(input) {
      const usedOcr = !hasUsableTextLayer(input.textLayer);
      const ocrOut = usedOcr ? await manager.use("m2", () => runOcr(cfg, { pdf: input.pdf, timeoutMs: cfg.requestTimeoutMs })) : null;
      const text = input.textLayer ?? (ocrOut as { text?: string })?.text ?? "";
      logger.info({ usedOcr, textLen: text.length }, "doc pipeline");
      const doc = await manager.use("m3", () =>
        docIntel.extract(
          { text, metadata: input.metadata, schemaFields: input.schemaFields ?? [] },
          cfg.requestTimeoutMs,
        ),
      );
      // Release M3 after the pipeline completes so it isn't resident on a
      // document-heavy service that mostly runs M1.
      await manager.stopWorker("m3");
      return { ocr: ocrOut, doc, usedOcr };
    },
    health: () => manager.health(),
    stopAll: () => manager.stopAll(),
  };
}

export { parseToolAction };
export type { ToolAction, DocumentExtraction };
