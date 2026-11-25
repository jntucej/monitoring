## U3 Audit Findings

### Existing error layers
1. src/lib/api-response.ts — canonical: err(code, msg, status, details?) → { success:false, error:{code,message,details?} }, ok(data, msg) → { success:true, data? }. 35 routes use it.
2. src/lib/apiErrors.ts — friendlyApiError(code, msg) → friendly sentence. 5 routes.
3. src/middleware/authorization.ts — withAuthorization() catch: AuthError → 401/403 canonical; plain "UNAUTHORIZED:" prefix → 401/403 canonical; final fallback 500 with { code: "INTERNAL_ERROR", message: err.message } — LEAKS raw err.message (SQL/internal) to client.
4. 26 legacy routes return bare { error: "string" } (e.g. passkey verify "challenge expired").
5. 25 catch blocks log + fall through to Next's auto-500 HTML error page (no JSON body) — inconsistent with JSON API contract.
6. 139 routes log console.error in catch — good — but the 500 body varies: some use err("INTERNAL_ERROR"), some build the object by hand, some return err.message directly (leak).

### Frontend consumers
- 8+ consumers read data.error.message (canonical shape) — preserved.
- 1 consumer (faculty/attendance) reads data.error as possibly-string — legacy compat: keep the {error:{code,message}} object; a string reader will see "[object Object]" today already, so no regression from normalization.
- No consumer reads a bare {error: string} body — legacy 26 routes are safe to normalize.

### Design (minimal, no new abstraction)
- src/lib/api-error-handler.ts (NEW):
  - ApiError class (code, message, status, details?, cause?)
  - normalizeApiError(unknown, { route }) → ApiError: classifies DB errors (pg error codes → code+status), maps to canonical body; 500s NEVER include err.message/cause — generic message + server-side console.error with context + cause chain (logged, not sent).
  - safeInternalMessage(err) → "Internal error" (safe generic).
- src/middleware/authorization.ts (EDIT, 1 function): final fallback 500 uses safeInternalMessage instead of raw err.message; log the full error server-side.
- Representative routes (10):
  - 26 legacy bare-error routes → normalize to canonical (mechanical, preserves status codes).
  - 25 swallow-catch routes → add canonical 500 JSON return (no more HTML 500).
  - 3 routes that leak err.message in 500 bodies → safeInternalMessage.
- Status-code mapping: VALIDATION_ERROR/400, BAD_REQUEST/400, UNAUTHORIZED/401, FORBIDDEN/403, NOT_FOUND/404, CONFLICT/409, RATE_LIMIT_EXCEEDED/429, INTERNAL_ERROR/500.
