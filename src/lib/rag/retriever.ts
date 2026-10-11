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

async function getEmbedding(text: string): Promise<number[]> {
  if (!RAG.embedding.key) {
    // Return dummy vector of correct dimension if no key configured
    return new Array(RAG.embedding.dim).fill(0.01);
  }
  try {
    const res = await fetch(`${RAG.embedding.url}/embeddings`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${RAG.embedding.key}` },
      body: JSON.stringify({ model: RAG.embedding.model, input: text }),
    });
    if (!res.ok) return new Array(RAG.embedding.dim).fill(0.01);
    const json = await res.json() as { data: { embedding: number[] }[] };
    return json.data?.[0]?.embedding || new Array(RAG.embedding.dim).fill(0.01);
  } catch {
    return new Array(RAG.embedding.dim).fill(0.01);
  }
}

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
    console.error("Retrieval error:", err);
    return [];
  }
}
