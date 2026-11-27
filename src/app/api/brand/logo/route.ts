/**
 * /api/brand/logo — serves the canonical UCEJ crest as a high-res,
 * alpha-channel PNG from a dedicated endpoint (the physical/server logo).
 *
 * Public, read-only, no auth. Supports on-demand sizing:
 *   GET /api/brand/logo                -> full hires (1754x2400, alpha)
 *   GET /api/brand/logo?size=1024      -> resized to 1024px height (alpha kept)
 *   GET /api/brand/logo?size=512&bg=1  -> 512px height composited onto white
 *
 * The source is `public/brand/logo-hires.png` (generated from the 494x676
 * original at 2400px). The crest already carries a real alpha channel
 * (anti-aliased edges, transparent background) so it drops onto any
 * surface/nameplate without a white box.
 */
import { NextRequest } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const HIRES_PATH = path.join(process.cwd(), "public", "brand", "logo-hires.png");
const FALLBACK_PATH = path.join(process.cwd(), "public", "brand", "logo.png");

/** Clamp requested height to a sane range (min 32, max 4096). */
function clampSize(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) return null;
  return Math.min(4096, Math.max(32, n));
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.nextUrl);
    const targetHeight = clampSize(url.searchParams.get("size"));
    const compositeWhite = url.searchParams.get("bg") === "1";

    // Prefer the hires source; fall back to the smaller logo.png if missing.
    let source = HIRES_PATH;
    try {
      await fs.access(HIRES_PATH);
    } catch {
      source = FALLBACK_PATH;
    }

    let pipeline = sharp(source);
    if (targetHeight) pipeline = pipeline.resize({ height: targetHeight, withoutEnlargement: false });
    if (compositeWhite) {
      pipeline = pipeline.flatten({ background: [255, 255, 255, 1] });
    }
    const buf = await pipeline.png({ compressionLevel: 6 }).toBuffer();

    const cacheControl = "public, max-age=86400, s-maxage=86400"; // 1 day
    return new Response(buf as unknown as BodyInit, {
      status: 200,
      headers: {
        "content-type": "image/png",
        "content-length": String(buf.length),
        "cache-control": cacheControl,
        "x-content-type-options": "nosniff",
        "access-control-allow-origin": "*", // brand asset is safe to hotlink
        "x-source": targetHeight ? `logo-hires?size=${targetHeight}` : "logo-hires",
      },
    });
  } catch (error) {
    console.error("Brand logo endpoint error:", error);
    return new Response("logo unavailable", {
      status: 500,
      headers: { "content-type": "text/plain" },
    });
  }
}
