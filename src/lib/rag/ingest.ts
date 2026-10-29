import { createHash } from "node:crypto";
import { query } from "@/lib/postgres";
import { RAG } from "./config";

const MAX_CHUNK_CHARS = 1600;

/**
 * Control 6: Ingestion sanitization.
 * Strips zero-width characters, HTML comments, and hidden/white-on-white CSS trickery
 * from knowledge base content before chunking and embedding.
 */
export function sanitizeKbContent(content: string): string {
  if (!content) return "";
  let clean = content;
  // 1. Remove zero-width characters (\u200B-\u200D, \uFEFF, \u202A-\u202E, etc.)
  clean = clean.replace(/[\u200B-\u200D\uFEFF\u202A-\u202E\u2060-\u206F]/g, "");

  // 2. Remove HTML comments (frequent vector for indirect prompt injection)
  clean = clean.replace(/<!--[\s\S]*?-->/g, "");

  // 3. Remove suspicious script and style tags or hidden styling
  clean = clean.replace(/<script[\s\S]*?<\/script>/gi, "");
  clean = clean.replace(/<style[\s\S]*?<\/style>/gi, "");
  clean = clean.replace(/<\/?(?:untrusted_context|system_prompt|instructions)>/gi, "");
  clean = clean.replace(/(?:display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0|opacity\s*:\s*0|color\s*:\s*(?:white|#fff(?:fff)?|rgba?\([^)]+\)))/gi, "");

  // 4. Normalize newlines
  return clean.replace(/\r\n/g, "\n");
}

function splitIntoChunks(content: string): string[] {
  const clean = content.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];
  const paragraphs = clean.split(/\n{2,}/);
  const chunks: string[] = [];
  let cur = "";
  for (const p of paragraphs) {
    if ((cur + "\n\n" + p).length > MAX_CHUNK_CHARS && cur) {
      chunks.push(cur);
      cur = p;
    } else {
      cur = cur ? cur + "\n\n" + p : p;
    }
  }
  if (cur) chunks.push(cur);
  const out: string[] = [];
  for (const c of chunks) {
    for (let i = 0; i < c.length; i += MAX_CHUNK_CHARS) {
      out.push(c.slice(i, i + MAX_CHUNK_CHARS));
    }
  }
  return out;
}

function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

/** Zero-vector placeholder (retrieval degrades gracefully, never crashes). */
function zeroVectors(n: number): number[][] {
  return Array.from({ length: n }, () => new Array(RAG.embedding.dim).fill(0.01));
}

async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!RAG.embedding.key || !texts.length) return zeroVectors(texts.length);
  try {
    const res = await fetch(`${RAG.embedding.url}/embeddings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${RAG.embedding.key}`,
      },
      body: JSON.stringify({ model: RAG.embedding.model, input: texts }),
    });
    if (!res.ok) {
      console.warn("[kb] embedding API error, using fallback vectors:", res.status);
      return zeroVectors(texts.length);
    }
    const json = (await res.json()) as { data: { embedding?: number[]; index?: number }[] };
    const items = json.data ?? [];
    const sorted = [...items].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    if (sorted.length !== texts.length || sorted.some((d) => !d.embedding || !d.embedding.length)) {
      console.warn("[kb] embedding response shape mismatch, using fallback vectors");
      return zeroVectors(texts.length);
    }
    return sorted.map((d) => d.embedding as number[]);
  } catch (err) {
    console.warn("[kb] embedding request failed, using fallback vectors:", err);
    return zeroVectors(texts.length);
  }
}

export interface IngestResult {
  documentId: string;
  chunkCount: number;
  deduped: boolean;
}

/**
 * Ingest a KB document: upsert kb_documents (keyed by source, content-hash for
 * dedupe), compute chunk embeddings, and replace the document's chunks.
 */
export async function ingestKbDocument(input: {
  title: string;
  source: string;
  content: string;
  roles: string[];
}): Promise<IngestResult> {
  const { title, source, content, roles } = input;
  const sanitizedContent = sanitizeKbContent(content);
  const rolesNorm = roles.length ? roles : ["all"];
  const hash = sha256Hex(sanitizedContent);

  const { rows: docRows } = await query<{ id: string; content_hash: string | null }>(
    `SELECT id, content_hash FROM public.kb_documents WHERE source = $1 LIMIT 1`,
    [source]
  );
  const existing = docRows[0];

  let documentId: string;
  let deduped = false;
  if (existing && existing.content_hash === hash) {
    documentId = existing.id;
    deduped = true;
    await query(`UPDATE public.kb_documents SET roles=$1 WHERE id=$2`, [rolesNorm, documentId]);
  } else if (existing) {
    documentId = existing.id;
    await query(
      `UPDATE public.kb_documents SET title=$1, content=$2, content_hash=$3, roles=$4, is_active=TRUE WHERE id=$5`,
      [title, sanitizedContent, hash, rolesNorm, existing.id]
    );
  } else {
    const { rows: insRows } = await query<{ id: string }>(
      `INSERT INTO public.kb_documents (title, source, content, content_hash, roles, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [title, source, sanitizedContent, hash, rolesNorm]
    );
    if (!insRows.length) {
      // Lost the race: row appeared between SELECT and INSERT.
      const { rows: refetched } = await query<{ id: string }>(
        `SELECT id FROM public.kb_documents WHERE source = $1 LIMIT 1`,
        [source]
      );
      documentId = refetched[0].id;
    } else {
      documentId = insRows[0].id;
    }
  }

  const chunks = splitIntoChunks(sanitizedContent);

  // Replace semantics: clear stale chunks, then insert fresh ones.
  await query(`DELETE FROM public.kb_chunks WHERE document_id = $1`, [documentId]);

  if (chunks.length) {
    const embeddings = await embedTexts(chunks);
    for (let i = 0; i < chunks.length; i++) {
      await query(
        `INSERT INTO public.kb_chunks (document_id, content, embedding)
         VALUES ($1, $2, $3::vector)`,
        [documentId, chunks[i], `[${embeddings[i].join(",")}]`]
      );
    }
  }

  return { documentId, chunkCount: chunks.length, deduped };
}
