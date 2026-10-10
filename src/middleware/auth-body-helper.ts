
const GLOBAL_BODY_CACHE = new Map<string, unknown>();
const crypto = await import("crypto");

async function readBodyOnce(req: NextRequest): Promise<{ parsed: unknown, hash: string }> {
  // Try to parse
  let parsed: unknown = null;
  const raw = await req.text();
  try {
     parsed = raw ? JSON.parse(raw) : null;
  } catch {}
  
  const hash = crypto.createHash("sha256").update(raw || "").digest("hex");
  GLOBAL_BODY_CACHE.set(hash, parsed);
  return { parsed, hash };
}
