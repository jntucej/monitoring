/**
 * Standardized API error-response factory.
 *
 * Every route handler MUST return errors through this helper so the wire
 * shape is uniform: `{ success: false, error: { code, message } }`.
 * Clients (and the audit linter) can then assert on `error.code` instead of
 * guessing from a free-form `error: "some string"`.
 *
 *   import { ok, err } from "@/lib/api-response";
 *   if (!user) return err("NOT_FOUND", "User not found", 404);
 */

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "RATE_LIMIT_EXCEEDED"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE"
  | (string & {});

export interface ApiErrorBody {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
}

export interface ApiOkBody<T = unknown> {
  success: true;
  data?: T;
  message?: string;
}

/** Build a canonical error response. */
export function err(
  code: ApiErrorCode,
  message: string,
  status: number = 400,
  details?: unknown
): { body: ApiErrorBody; status: number } {
  const error: ApiErrorBody["error"] = { code, message };
  if (details !== undefined) error.details = details;
  return { body: { success: false, error }, status };
}

/** Convenience: JSONResponse shorthand for `err(...)`. */
export function errResponse(
  code: ApiErrorCode,
  message: string,
  status: number = 400,
  details?: unknown
) {
  const { body, status: s } = err(code, message, status, details);
  return { json: body, status: s };
}

/** Build a canonical success response. */
export function ok<T = unknown>(data?: T, message?: string, status: number = 200) {
  const body: ApiOkBody<T> = { success: true };
  if (data !== undefined) body.data = data;
  if (message) body.message = message;
  return { body, status };
}

export default { err, errResponse, ok };