// src/lib/validate-body.ts
// U5: Shared Zod-based request-body validation layer.
//
// One contract for every route that validates a JSON body:
//   - malformed JSON      → 400  BAD_REQUEST
//   - schema field errors → 400  VALIDATION_ERROR  (safe field paths only)
//   - oversized body      → 413  PAYLOAD_TOO_LARGE
//
// All errors funnel through the U3 `handleApiError` path so the response
// shape is the single canonical `{ success, error: { code, message, details? } }`
// the whole API already uses. Nothing here invents a new shape.
//
// Security rules:
//   - Field-error `details.fields` carries ONLY our own schema messages and
//     field paths. Raw user input is NEVER echoed back (no passwords, no
//     tokens, no raw body).
//   - `assertBodySize` enforces the ACTUAL streamed byte count, not just the
//     Content-Length header (which can be missing on chunked bodies or lie
//     about the true size).

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, handleApiError } from "@/lib/api-error-handler";

/** Default JSON body cap (U5 decision #2). */
export const DEFAULT_JSON_BODY_LIMIT_BYTES = 1_048_576; // 1 MB

/** Default upload / large-payload cap (U5 decision #2). */
export const DEFAULT_UPLOAD_BODY_LIMIT_BYTES = 25 * 1024 * 1024; // 25 MB

export interface ValidationFailure {
  ok: false;
  response: NextResponse;
}
export interface ValidationSuccess<T> {
  ok: true;
  data: T;
}
export type ValidateBodyResult<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Sanitize a Zod field-error list: keep only the dotted path and our own
 * schema message. Zod messages are authored by us (never raw input), so
 * this is safe to send to the client.
 */
function fieldErrorList(err: z.ZodError): { path: string; message: string }[] {
  return err.issues.map((issue) => ({
    path: issue.path.length ? issue.path.map(String).join(".") : "(root)",
    message:
      issue.message?.trim() ||
      (issue.code === "invalid_type"
        ? "Invalid type."
        : "Invalid value."),
  }));
}

/**
 * Validate a request's JSON body against a Zod schema, with an optional
 * streamed size cap.
 *
 * The body stream is read EXACTLY ONCE: raw bytes are counted (for the size
 * cap) and parsed as JSON in a single pass. This is why `validateBody` owns
 * the size check rather than a separate `assertBodySize` call that would
 * consume the stream first and leave `req.json()` to fail.
 *
 *   const res = await validateBody(req, Schemas.login);
 *   if (!res.ok) return res.response;
 *   const { login, password } = res.data;
 *
 * Responses (all canonical U3 shape, via handleApiError):
 *   - body over maxBytes            → 413 PAYLOAD_TOO_LARGE
 *   - malformed JSON                → 400 BAD_REQUEST
 *   - schema field errors           → 400 VALIDATION_ERROR (safe field paths)
 */
export async function validateBody<T>(
  req: NextRequest,
  schema: z.ZodType<T>,
  opts?: { route?: string; maxBytes?: number }
): Promise<ValidateBodyResult<T>> {
  const ctx = opts?.route ? { route: opts.route } : undefined;
  const cap = opts?.maxBytes ?? DEFAULT_JSON_BODY_LIMIT_BYTES;

  // Read + count + parse in one pass.
  let raw: unknown;
  try {
    let text = "";
    let byteCount = 0;
    if (req.body) {
      const reader = (req.body as ReadableStream<Uint8Array>).getReader();
      const decoder = new TextDecoder();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          byteCount += value?.length ?? 0;
          if (byteCount > cap) {
            // Over the cap — stop reading, reject 413. No JSON parse attempted.
            return {
              ok: false,
              response: handleApiError(
                new ApiError("PAYLOAD_TOO_LARGE", "Request body exceeds the size limit.", 413, { limitBytes: cap }),
                ctx
              ),
            };
          }
          text += decoder.decode(value, { stream: true });
        }
        text += decoder.decode(); // flush
      } finally {
        try { reader.releaseLock(); } catch { /* ignore */ }
      }
    }
    // Empty body → raw stays undefined → schema must accept that (most of
    // our schemas don't, so they'll 400 VALIDATION_ERROR, which is correct).
    raw = text.length ? JSON.parse(text) : undefined;
  } catch {
    // Malformed JSON (JSON.parse threw) or a stream read error.
    return {
      ok: false,
      response: handleApiError(
        new ApiError("BAD_REQUEST", "Malformed JSON body.", 400),
        ctx
      ),
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    // Field errors only — never the schema, never the raw input.
    const fields = fieldErrorList(parsed.error);
    return {
      ok: false,
      response: handleApiError(
        new ApiError("VALIDATION_ERROR", "Validation failed.", 400, { fields }),
        ctx
      ),
    };
  }
  return { ok: true, data: parsed.data };
}

/**
 * Enforce the ACTUAL streamed body size (not just Content-Length).
 *
 * Reads the request body as a byte-counting stream up to `maxBytes`. If the
 * real byte count exceeds the cap, returns a 413 PAYLOAD_TOO_LARGE response.
 * Returns `null` when the body is within the limit (caller then proceeds to
 * validateBody / its own parsing).
 *
 * Why stream-count instead of trusting Content-Length:
 *   - Chunked / transfer-encoding bodies often omit Content-Length.
 *   - A client can send a lying Content-Length header.
 *   - Next.js may have already buffered the body; counting what we actually
 *     read is the only trustworthy measure.
 *
 * NOTE: this consumes `req`'s body stream. Call it BEFORE any `req.json()`
 * or `req.text()` on the same request, and only once.
 */
export async function assertBodySize(
  req: NextRequest,
  maxBytes: number = DEFAULT_JSON_BODY_LIMIT_BYTES,
  ctx?: { route?: string }
): Promise<NextResponse | null> {
  // Fast path: if Content-Length is present and already over the cap, reject
  // without reading the stream at all.
  const clHeader = req.headers.get("content-length");
  if (clHeader !== null) {
    const cl = Number(clHeader);
    if (Number.isFinite(cl) && cl > 0 && cl > maxBytes) {
      return handleApiError(
        new ApiError("PAYLOAD_TOO_LARGE", "Request body exceeds the size limit.", 413, {
          limitBytes: maxBytes,
        }),
        ctx
      );
    }
  }

  // Stream path: count actual bytes, abort on overflow.
  if (!req.body) return null; // no body (GET/HEAD) — nothing to limit.
  const reader = (req.body as ReadableStream<Uint8Array>).getReader();
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value?.length ?? 0;
      if (total > maxBytes) {
        // We already have enough; stop reading.
        break;
      }
    }
  } catch {
    // Body already consumed or errored — treat as OK and let the parser
    // surface a proper 400 (malformed) rather than a 500.
    return null;
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
  }

  if (total > maxBytes) {
    return handleApiError(
      new ApiError("PAYLOAD_TOO_LARGE", "Request body exceeds the size limit.", 413, {
        limitBytes: maxBytes,
      }),
      ctx
    );
  }
  return null;
}
