// src/lib/api-error-handler.ts
// U3: Shared API error normalization.
//
// Single source of truth for API error bodies. Every route's catch path
// should funnel through handleApiError() so clients see exactly one shape:
//
//   { success: false, error: { code, message, details? } }
//
// Security contract (U3 step 8):
//   - 500 responses NEVER carry the raw error message, stack, SQL text or
//     secrets. Clients get a fixed generic message.
//   - The full error (including cause chain) is logged server-side with the
//     route context so operators can diagnose without the client knowing.
//   - Auth errors keep their status (401/403) — never demoted to 500.

import { NextResponse } from "next/server";
import { log, sanitizeLogString } from "@/lib/log";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "ACCOUNT_INACTIVE"
  | "NOT_FOUND"
  | "CONFLICT"
  | "CSRF_FAILED"
  | "RATE_LIMIT_EXCEEDED"
  | "INTERNAL_ERROR"
  | "DB_ERROR"
  | "SERVICE_UNAVAILABLE"
  | "UPDATE_ERROR"
  | (string & {});

export interface ApiErrorBody {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
}

/** Class of error → (code, http status). */
export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public status: number,
    public details?: unknown,
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = "ApiError";
  }
}

/** pg error codes that map to 4xx rather than 500. */
const PG_CLIENT_ERRORS: Record<string, { code: ApiErrorCode; status: number }> = {
  "23503": { code: "NOT_FOUND", status: 404 }, // foreign_key_violation
  "23505": { code: "CONFLICT", status: 409 }, // unique_violation
  "23514": { code: "VALIDATION_ERROR", status: 400 }, // check_violation
  "22P02": { code: "VALIDATION_ERROR", status: 400 }, // invalid_text_representation
  "22023": { code: "VALIDATION_ERROR", status: 400 }, // invalid_parameter_value
  "0LPRS": { code: "VALIDATION_ERROR", status: 400 }, // insufficient_privilege (nonstandard)
};

/**
 * Classify an unknown thrown value into an ApiError.
 * - ApiError instances pass through (already normalized).
 * - PostgreSQL errors: known client-error codes → 4xx with safe messages;
 *   anything else → generic 500 INTERNAL_ERROR.
 * - Errors whose message starts with UNAUTHORIZED:/FORBIDDEN:/ACCOUNT_INACTIVE:
 *   (thrown by the auth layer) keep their 401/403 semantics.
 * - Everything else → generic 500 with a safe message.
 *
 * The returned ApiError for 500-class errors NEVER contains the raw message.
 * The raw error is returned separately (loggedOnly) for server-side logging.
 */
export function normalizeApiError(
  err: unknown,
  ctx?: { route?: string }
): { apiError: ApiError; logPayload: string } {
  // Already normalized
  if (err instanceof ApiError) {
    // 500-class errors must not carry caller-provided raw details
    const safe =
      err.status >= 500
        ? new ApiError(err.code, "Internal error", err.status, undefined, { cause: err })
        : err;
    return {
      apiError: safe,
      logPayload: err.message + (err.details ? ` details=${JSON.stringify(err.details)}` : ""),
    };
  }

  // Auth-layer plain errors: "UNAUTHORIZED: ..." / "FORBIDDEN: ..." / "ACCOUNT_INACTIVE: ..."
  if (err instanceof Error) {
    const m = err.message;
    const prefix = m.match(/^(UNAUTHORIZED|FORBIDDEN|ACCOUNT_INACTIVE):\s*(.*)$/);
    if (prefix) {
      const code = prefix[1].toLowerCase() as ApiErrorCode;
      const status = prefix[1] === "FORBIDDEN" || prefix[1] === "ACCOUNT_INACTIVE" ? 403 : 401;
      // Auth messages are safe (they come from our own layer, not from SQL).
      return {
        apiError: new ApiError(code, prefix[2] || "Authentication failed", status),
        logPayload: m,
      };
    }
  }

  // PostgreSQL driver errors (node-postgres attaches `code` + `severity`).
  // pg errors from node-postgres: `code` is the SQLSTATE string (5 chars),
  // `severity` starts with "ERROR". We key on code alone — severity varies.
  const pg = err as { code?: string; message?: string; severity?: string; detail?: string; hint?: string };
  const isPg = typeof pg.code === "string" && pg.code.length === 5 && /^[0-9A-Z]+$/.test(pg.code);
  if (isPg && pg.code !== undefined) {
    const known = PG_CLIENT_ERRORS[pg.code];
    if (known) {
      // 4xx DB errors: still generic message (detail/hint can contain SQL).
      const safeMsg =
        known.code === "NOT_FOUND"
          ? "Resource not found."
          : known.code === "CONFLICT"
            ? "A conflicting record already exists."
            : "Invalid input data.";
      return {
        apiError: new ApiError(known.code, safeMsg, known.status),
        logPayload: `[pg ${pg.code}] ${pg.message} ${pg.detail ?? ""} ${pg.hint ?? ""} ctx=${ctx?.route ?? ""}`,
      };
    }
    // Unknown pg error → generic 500, details stay server-side.
    return {
      apiError: new ApiError("INTERNAL_ERROR", "Internal error", 500),
      logPayload: `[pg ${pg.code}] ${pg.message} ${pg.detail ?? ""} ${pg.hint ?? ""} ctx=${ctx?.route ?? ""}`,
    };
  }

  // Node fetch / network failures
  if (err instanceof Error) {
    if (err.name === "AbortError") {
      return { apiError: new ApiError("BAD_REQUEST", "Request aborted.", 400), logPayload: err.message };
    }
    if (err.name === "SyntaxError" && err.message.includes("JSON")) {
      return { apiError: new ApiError("BAD_REQUEST", "Malformed JSON body.", 400), logPayload: err.message };
    }
  }

  // Fallback: generic 500. Raw message logged only, never sent.
  const raw = err instanceof Error ? err.stack ?? err.message : JSON.stringify(err);
  return {
    apiError: new ApiError("INTERNAL_ERROR", "Internal error", 500),
    logPayload: `[unhandled ${err?.constructor?.name ?? "unknown"}] ${raw} ctx=${ctx?.route ?? ""}`,
  };
}

/**
 * The one catch-block helper every route should use:
 *
 *   } catch (e) {
 *     return handleApiError(e, { route: "/api/foo" });
 *   }
 *
 * Logs server-side (console.error with context), returns a canonical JSON
 * Response. 500-class bodies never expose the cause.
 */
export function handleApiError(
  err: unknown,
  ctx?: { route?: string }
): NextResponse {
  const { apiError, logPayload } = normalizeApiError(err, ctx);
  if (apiError.status >= 500) {
    // Full context stays server-side only (structured JSON via log.error).
    log.error({
      msg: "api.error",
      route: sanitizeLogString(ctx?.route ?? "unknown", 256),
      error_code: apiError.code,
      detail: sanitizeLogString(logPayload, 1024),
    });
  }
  const body: ApiErrorBody = {
    success: false,
    error: { code: apiError.code, message: apiError.message },
  };
  if (apiError.details !== undefined) body.error.details = apiError.details;
  return NextResponse.json(body, {
    status: apiError.status,
    headers: { "x-error-code": apiError.code },
  });
}

/**
 * Wrap a route handler so its thrown errors become canonical JSON
 * (no HTML 500 pages, no leaked messages). Success responses pass through
 * untouched — this wrapper never modifies a non-error Response.
 *
 * Simplest form at the export boundary:
 *   export const GET = withApiErrorHandler(rawGet, { route: "/api/foo" });
 */
export function withApiErrorHandler(
  handler: (...args: any[]) => Promise<Response>,
  ctx?: { route?: string }
): (...args: any[]) => Promise<Response> {
  return async (...args: any[]): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (e) {
      return handleApiError(e, ctx);
    }
  };
}
