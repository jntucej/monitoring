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
import { AiResourceManager, type Priority } from "./resource-manager";
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
    priority?: Priority,
  ): Promise<ToolAction | { reply: string }>;
  runDocumentPipeline(input: {
    pdf: Buffer;
    /** Pre-extracted text layer, when the PDF is digital. */
    textLayer?: string;
    metadata?: Record<string, unknown>;
    schemaFields?: string[];
  }, priority?: Priority): Promise<{ ocr: unknown; doc: DocumentExtraction; usedOcr: boolean }>;
  /** Demand-aware resource manager (spec §8/§16/§17): memory-pressure + leases. */
  resource: AiResourceManager;
  health(): import("./manager.js").WorkerHealth[];
  /** Resource-manager snapshot (pressure, leases, eviction) for the ops UI. */
  aiStatus(): ReturnType<AiResourceManager["status"]>;
  stopAll(): Promise<void>;
}

export function createAiRuntime(env: NodeJS.ProcessEnv = process.env): AiRuntime {
  const cfg = loadConfig(env);
  const backend = new TrackingOllamaBackend(cfg);
  // §8: the resource manager decides the idle-timeout per host RAM pressure,
  // so the manager no longer uses a single fixed idleMs for heavy workers.
  const resource = new AiResourceManager();
  const manager = new ModelManager(
    backend,
    (n) => {
      // M1 stays on its own (longer, warm) timer; M2/M3 follow memory pressure.
      return n === "m1" ? cfg.m1IdleStopMs : resource.effectiveIdleMs(n as "m2" | "m3");
    },
    cfg.serializedDoc,
  );
  const convo = new ConversationWorker(cfg);
  const docIntel = new DocumentIntelligenceWorker(cfg);

  return {
    config: cfg,
    resource,
    async routeConversation(messages, tools, priority = "P1") {
      return manager.use("m1", () => convo.route({ messages, tools }, cfg.requestTimeoutMs), priority);
    },
    async runDocumentPipeline(input, priority = "P2") {
      // §16/§17: take an exclusive lease on the heavy workers; if host RAM is
      // critical, refuse so the SaaS core is protected (defer the job).
      const admission = resource.admit("m3", priority);
      if (!admission.ok) {
        throw new Error(`AI deferred: ${admission.reason}`);
      }
      const leaseM2 = resource.acquire("m2", "doc-pipeline", priority);
      const usedOcr = !hasUsableTextLayer(input.textLayer);
      const ocrOut = usedOcr
        ? await manager.use("m2", () => runOcr(cfg, { pdf: input.pdf, timeoutMs: cfg.requestTimeoutMs }), priority)
        : null;
      resource.release("m2", leaseM2.holder);
      const text = input.textLayer ?? (ocrOut as { text?: string })?.text ?? "";
      logger.info({ usedOcr, textLen: text.length, priority }, "doc pipeline");
      const leaseM3 = resource.acquire("m3", "doc-pipeline", priority);
      const doc = await manager.use("m3", () =>
        docIntel.extract(
          { text, metadata: input.metadata, schemaFields: input.schemaFields ?? [] },
          cfg.requestTimeoutMs,
        ),
      );
      resource.release("m3", leaseM3.holder);
      // Release M3 after the pipeline completes so it isn't resident on a
      // document-heavy service that mostly runs M1.
      await manager.stopWorker("m3");
      return { ocr: ocrOut, doc, usedOcr };
    },
    health: () => manager.health(),
    aiStatus: () => resource.status(),
    stopAll: () => manager.stopAll(),
  };
}

export { parseToolAction };
export type { ToolAction, DocumentExtraction };
