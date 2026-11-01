import { query } from "@/lib/postgres";
import { RAG } from "./config";
import type { Role } from "@/lib/types";

export interface RetrievedChunk {
  id: string;
  documentId: string;
  title: string;
  source: string | null;
  content: string;
  score: number;
}

// Fail-closed: when the embedding service is unavailable we must NOT
// return a plausible-but-wrong vector — the LLM would get random chunks
// and answer confidently with fabricated context. Throw a typed error the
// chat route maps to a 503 RAG_UNAVAILABLE (UI: "KB search is offline").
class RagUnavailableError extends Error {
  code = "RAG_UNAVAILABLE";
  constructor() { super("RAG embedding service unavailable"); }
}

async function getEmbedding(text: string): Promise<number[]> {
  if (!RAG.embedding.key) {
    throw new RagUnavailableError();
  }
  const res = await fetch(`${RAG.embedding.url}/embeddings`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${RAG.embedding.key}` },
    body: JSON.stringify({ model: RAG.embedding.model, input: text }),
  });
  if (!res.ok) {
    throw new RagUnavailableError();
  }
  const json = (await res.json()) as { data: { embedding: number[] }[] };
  const vector = json.data?.[0]?.embedding;
  if (!vector?.length) {
    throw new RagUnavailableError();
  }
  return vector;
}

export { RagUnavailableError };

export async function retrieve(text: string, userRole: Role): Promise<RetrievedChunk[]> {
  const vector = await getEmbedding(text);
  const vectorStr = `[${vector.join(",")}]`;

  try {
    const { rows } = await query<RetrievedChunk & { similarity: number }>(
      `SELECT c.id, c.document_id as "documentId", d.title, d.source, c.content,
              (1 - (c.embedding <=> $1::vector)) as score
         FROM public.kb_chunks c
         JOIN public.kb_documents d ON d.id = c.document_id
        WHERE d.is_active = TRUE
          AND ($2::text = ANY(d.roles) OR 'all' = ANY(d.roles))
          AND (1 - (c.embedding <=> $1::vector)) >= $3
        ORDER BY c.embedding <=> $1::vector ASC
        LIMIT $4`,
      [vectorStr, userRole, RAG.minScore, RAG.topK],
    );
    return rows.map((r) => ({ ...r, score: Number(r.score) }));
  } catch (err) {
    // Propagate the fail-closed signal (RAG_UNAVAILABLE) so the chat route
    // returns a 503 instead of an empty-context hallucination. Other
    // retrieval errors still degrade to no-context.
    if (err instanceof RagUnavailableError) throw err;
    console.error("Retrieval error:", err);
    return [];
  }
}
