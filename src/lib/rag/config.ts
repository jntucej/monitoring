export type BotLang = "en" | "te";

export const LANGS: Record<BotLang, { stt: string; tts: string; label: string; nativeLabel: string }> = {
  en: { stt: "en-IN", tts: "en-IN", label: "English", nativeLabel: "English" },
  te: { stt: "te-IN", tts: "te-IN", label: "Telugu",  nativeLabel: "తెలుగు"  },
};

export const RAG = {
  embedding: {
    url:   process.env.RAG_EMBEDDING_API_URL || process.env.HERMES_API_BASE || "https://api.openai.com/v1",
    key:   process.env.RAG_EMBEDDING_API_KEY || process.env.HERMES_API_KEY || "",
    model: process.env.RAG_EMBEDDING_MODEL || "agnes/agnes-3.0-flash",
    dim:   Number(process.env.RAG_EMBEDDING_DIM || 1536),
  },
  llm: {
    url:   process.env.RAG_LLM_API_URL || process.env.HERMES_API_BASE || "https://api.openai.com/v1",
    key:   process.env.RAG_LLM_API_KEY || process.env.HERMES_API_KEY || "",
    model: process.env.RAG_LLM_MODEL || "agnes/agnes-3.0-flash",
    translateModel: process.env.RAG_TRANSLATE_MODEL || "agnes/agnes-3.0-flash",
  },
  topK:     Number(process.env.RAG_TOP_K || 6),
  minScore: Number(process.env.RAG_MIN_SCORE || 0.25),
} as const;
