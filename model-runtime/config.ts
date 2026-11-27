// model-runtime/config.ts
// Single source of truth for AI worker configuration. Reads the documented
// environment variables (see docs/AI_ARCHITECTURE.md §7) with safe defaults.
// No secret material is read here — credentials live in the permission engine
// and are injected only at tool-execution time.

export interface OllamaEndpoint {
  url: string;      // base, e.g. http://ollama:11434
  model: string;    // model tag, e.g. qwen3:0.6b (M1) / qwen3:1.7b (M3)
  ctx: number;      // num_ctx
}

export interface AiConfig {
  m1: OllamaEndpoint;
  m3: OllamaEndpoint;
  ocrCmd: string;
  maxConcurrency: number;
  idleStopMs: number;
  m1IdleStopMs: number;
  requestTimeoutMs: number;
  serializedDoc: boolean;
  killSwitchRow: string;
}

function num(v: string | undefined, dflt: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : dflt;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AiConfig {
  return {
    m1: {
      url: env.AI_M1_URL || "http://ollama:11434",
      // M1 = narrow command router (intent + tool selection). Spec: Qwen3-0.6B
      // (tiny, agent-oriented, 32K ctx). Kept warm while active.
      model: env.AI_M1_MODEL || "qwen3:0.6b",
      ctx: num(env.AI_M1_CTX, 4096),
    },
    m3: {
      url: env.AI_M3_URL || "http://ollama:11434",
      // M3 = document classification/extraction. Spec: Qwen3-1.7B Q4 (not the
      // heavier 3B — 8 GB CPU server). On-demand; never simultaneous with M2.
      model: env.AI_M3_MODEL || "qwen3:1.7b",
      ctx: num(env.AI_M3_CTX, 8192),
    },
    ocrCmd: env.AI_OCR_CMD || "python3 -m model_runtime.ocr",
    maxConcurrency: num(env.AI_MAX_CONCURRENCY, 1),
    idleStopMs: num(env.AI_IDLE_STOP_MS, 120_000),
    m1IdleStopMs: num(env.AI_M1_IDLE_STOP_MS, 600_000),
    requestTimeoutMs: num(env.AI_REQUEST_TIMEOUT_MS, 30_000),
    serializedDoc: (env.AI_SERIALIZED_DOC ?? "true") !== "false",
    killSwitchRow: env.AI_KILL_SWITCH || "ai_models_enabled",
  };
}

export type AiConfigLike = AiConfig;
