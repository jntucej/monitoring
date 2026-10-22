// src/lib/apiErrors.ts
// SCAFFOLD:ERRORS — structured API error codes → friendly messages.
//
// Wire envelope in this repo (see src/lib/api-response.ts and every route under
// src/app/api/):  { success: false, error: { code, message } }
//
//   import { friendlyApiError, readApiError } from "@/lib/apiErrors";
//   const { code, message } = await readApiError(res);
//   setError(friendlyApiError(code, message));
/**
 */

/** Stable codes emitted by /api/permissions* and the stage-queue feeds. */
export type ApiErrorCode =
  // envelope
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "RATE_LIMIT_EXCEEDED"
  | "INTERNAL_ERROR"
  | "DB_ERROR"
  | "UPDATE_ERROR"
  // permission workflow domain codes
  | "STAGE_NOT_AUTHORIZED"
  | "TICKET_NOT_FOUND"
  | "TICKET_NOT_PENDING"
  | "TICKET_ALREADY_CLOSED"
  | "DEPARTMENT_MISMATCH"
  | "HOSTEL_SCOPE_MISMATCH"
  | "BRANCH_MISMATCH"
  | "CSRF_FAILED"
  | "TRUSTED_HEADERS_MISSING";

const API_ERROR_MESSAGES: Record<string, string> = {
  // domain
  STAGE_NOT_AUTHORIZED:     "You are not authorized to act at this stage. Items at other stages are shown read-only.",
  TICKET_NOT_FOUND:         "This request no longer exists — it may have been cancelled or already actioned.",
  TICKET_NOT_PENDING:       "This request is no longer pending — it has already been actioned.",
  TICKET_ALREADY_CLOSED:    "This request has already been completed.",
  DEPARTMENT_MISMATCH:      "You can only act on requests from your own department.",
  HOSTEL_SCOPE_MISMATCH:    "You can only act on requests from your own hostel scope.",
  BRANCH_MISMATCH:          "Only the HOD of the requester's branch may act on this request.",
  // transport / envelope
  FORBIDDEN:                "You do not have permission to do this.",
  UNAUTHORIZED:             "Your session expired. Please sign in again.",
  NOT_FOUND:                "This request no longer exists.",
  CSRF_FAILED:              "Your session could not be verified. Refresh the page and retry.",
  TRUSTED_HEADERS_MISSING:  "Request signature missing. Refresh the page and retry.",
  RATE_LIMIT_EXCEEDED:      "Too many requests. Please wait a moment and retry.",
  VALIDATION_ERROR:         "Please check the form and try again.",
  BAD_REQUEST:              "That request could not be understood. Please refresh and retry.",
  DB_ERROR:                 "The server could not complete this action. Please retry.",
  UPDATE_ERROR:             "The change could not be saved. Please retry.",
  INTERNAL_ERROR:           "Something went wrong on our side. Please retry.",
  SERVER_ERROR:             "Something went wrong on our side. Please retry.",
};

/** Map a structured code (or a raw message) to a human sentence. */
export function friendlyApiError(code?: string | null, fallback = "Something went wrong."): string {
  if (code && Object.prototype.hasOwnProperty.call(API_ERROR_MESSAGES, code)) {
    return API_ERROR_MESSAGES[code];
  }
  return fallback;
}

export interface ApiErrorEnvelope {
  success: false;
  error?: { code?: string; message?: string; details?: unknown };
}

/** True when a parsed response body is the repo's error envelope. */
export function isApiErrorEnvelope(body: unknown): body is ApiErrorEnvelope {
  return (
    typeof body === "object" &&
    body !== null &&
    (body as { success?: unknown }).success === false &&
    typeof (body as { error?: unknown }).error === "object" &&
    (body as { error?: unknown }).error !== null
  );
}

export interface ReadApiError {
  code?: string;
  message: string;
  status: number;
}

/**
 * Read the structured error envelope off a failed fetch response.
 * Never throws — a non-JSON body degrades to `HTTP <status>`.
 */
export async function readApiError(res: Response): Promise<ReadApiError> {
  const status = res.status;
  try {
    const body = (await res.json()) as ApiErrorEnvelope | { message?: string; error?: string };
    if (isApiErrorEnvelope(body)) {
      const code = body.error?.code;
      const message = body.error?.message ?? `HTTP ${status}`;
      return { code, message: friendlyApiError(code, message), status };
    }
    const loose = body as { message?: string; error?: string };
    const raw = loose?.message ?? loose?.error ?? `HTTP ${status}`;
    return { code: undefined, message: raw, status };
  } catch {
    return { code: undefined, message: `HTTP ${status}`, status };
  }
}

export const apiErrorHelpers = { friendlyApiError, readApiError, isApiErrorEnvelope };

export default apiErrorHelpers;
