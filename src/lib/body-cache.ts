import { NextRequest } from "next/server";
import { createHash } from "crypto";

const GLOBAL_BODY_CACHE = new Map<string, unknown>();

export const DEFAULT_JSON_LIMIT_BYTES = 1_048_576; // 1 MB
export const DEFAULT_UPLOAD_LIMIT_BYTES = 26_214_400; // 25 MB

export class PayloadTooLargeError extends Error {
  public readonly status = 413;
  public readonly code = "PAYLOAD_TOO_LARGE";
  constructor(public readonly limitBytes: number) {
    super("Request body too large.");
    this.name = "PayloadTooLargeError";
  }
}

export async function getRequestBody<T>(req: NextRequest): Promise<T | null> {
  const hash = req.headers.get("x-parsed-body-hash");
  if (hash && GLOBAL_BODY_CACHE.has(hash)) {
    return GLOBAL_BODY_CACHE.get(hash) as T;
  }
  return null;
}

function resolveBodyLimit(req: NextRequest, overrideMaxBytes?: number): number {
  if (typeof overrideMaxBytes === "number" && overrideMaxBytes > 0) {
    return overrideMaxBytes;
  }
  const pathname = req.nextUrl?.pathname ?? "";
  const ct = (req.headers.get("content-type") ?? "").toLowerCase();
  const isUpload =
    pathname.includes("/upload") ||
    pathname.includes("/attachments") ||
    ct.includes("multipart/form-data");
  return isUpload
    ? Number(process.env.MAX_UPLOAD_BODY_BYTES) || DEFAULT_UPLOAD_LIMIT_BYTES
    : Number(process.env.MAX_API_BODY_BYTES) || DEFAULT_JSON_LIMIT_BYTES;
}

async function readStreamBounded(req: NextRequest, maxBytes: number): Promise<Uint8Array> {
  if (!req.body) return new Uint8Array(0);
  const reader = (req.body as ReadableStream<Uint8Array>).getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          /* ignore */
        }
        throw new PayloadTooLargeError(maxBytes);
      }
      chunks.push(value);
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

export async function setupBodyCaching(
  req: NextRequest,
  maxBytes?: number
): Promise<{ req: NextRequest; hash: string | null }> {
  const cap = resolveBodyLimit(req, maxBytes);
  const clHeader = req.headers.get("content-length");
  if (clHeader !== null) {
    const cl = Number(clHeader);
    if (Number.isFinite(cl) && cl > cap) {
      throw new PayloadTooLargeError(cap);
    }
  }

  const bytes = await readStreamBounded(req, cap);
  if (bytes.byteLength === 0) return { req, hash: null };

  const ct = (req.headers.get("content-type") ?? "").toLowerCase();
  const isMultipart = ct.includes("multipart/form-data");

  const hash = createHash("sha256").update(bytes).digest("hex");
  if (!isMultipart) {
    try {
      const rawText = new TextDecoder().decode(bytes);
      const parsed = rawText ? JSON.parse(rawText) : null;
      GLOBAL_BODY_CACHE.set(hash, parsed);
    } catch {
      // Non-JSON or malformed JSON — let downstream handler/validateBody handle 400
    }
  }

  const headers = new Headers(req.headers);
  headers.set("x-parsed-body-hash", hash);

  // duplex:"half" is required for a Node/Next.js Request with a body stream
  const newReq = new NextRequest(req.url, {
    method: req.method,
    headers,
    body: Buffer.from(bytes),
    duplex: "half",
  });

  return { req: newReq, hash };
}
