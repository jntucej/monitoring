import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

const GLOBAL_BODY_CACHE = new Map<string, unknown>();

export async function getRequestBody<T>(req: NextRequest): Promise<T | null> {
  const hash = req.headers.get("x-parsed-body-hash");
  if (hash && GLOBAL_BODY_CACHE.has(hash)) {
    return GLOBAL_BODY_CACHE.get(hash) as T;
  }
  return null;
}

export async function setupBodyCaching(req: NextRequest): Promise<{ req: NextRequest; hash: string | null }> {
  let parsed: unknown = null;
  const raw = await req.text();
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {}

  if (!raw) return { req, hash: null };

  const hash = createHash("sha256").update(raw).digest("hex");
  GLOBAL_BODY_CACHE.set(hash, parsed);

  // Re-construct the request with the hash header
  const headers = new Headers(req.headers);
  headers.set("x-parsed-body-hash", hash);

  // duplex:"half" is required for a Node/Next.js Request with a body stream
  // (undici enforces it); without it a body-carrying request throws at
  // construction time ("RequestInit body not supported with duplex default").
  const newReq = new NextRequest(req.url, {
    method: req.method,
    headers: headers,
    body: raw,
    duplex: "half",
  });

  return { req: newReq, hash };
}
