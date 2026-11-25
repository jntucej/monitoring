# U5 — Request Body Validation: Stage 1 Audit & Implementation Proposal

**Status:** AUDIT COMPLETE · NO CODE WRITTEN · AWAITING IMPLEMENTATION APPROVAL
**Baseline commit:** `2fdab065` (U4 NOSCRIPT recovery)
**Date:** 2026-11-25

---

## Audit findings

### 1. No validation library in the stack
- `package.json` has **no** zod / valibot / superstruct / yup.
- Zod would be a **new dependency** — an architectural decision requiring your approval (per framework rule: new deps = pause).

### 2. Body parsing is ad-hoc across 495 routes
| Pattern | Count | Behavior on malformed JSON |
|---|---|---|
| `req.json().catch(() => null)` | 60 | body=null → route-specific null checks (inconsistent) |
| `req.json().catch(() => ({}))` | 48+6 | body={} → field checks against empty obj (inconsistent) |
| `req.json()` unguarded | 35+13 | **throws → falls to U3 500 handler** (was HTML 500 pre-U3; now canonical 500) |
| `try/catch` → `fail("INVALID_JSON", …, 400)` | ~10 | correct 400 (the best current pattern) |

**Finding:** 48–60% of routes silently swallow malformed JSON into `null`/`{}` and proceed; the remainder throw into a generic 500. Neither is a proper 400 validation response.

### 3. Request-size handling
- Caddy 2.11.7 (no `request_body` directive — requires Caddy 3.x; commented out in Caddyfile).
- No `content-length` guard in middleware or any route (grep clean).
- Next.js App Router API routes: no explicit `maxBodyLength` config → default behavior applies (stream-based; a huge body is not rejected early).
- **No 413 (payload too large) path exists** except one attachment handler (`FILE_TOO_LARGE` in `attachment-storage.ts`).

### 4. Existing error helpers (U3 context)
- `src/server/http/response.ts` → `ok(data)` / `fail(code, msg, status, details?)` — used by **438 routes**. Shape: `{success, error: <code-string>, message, details?}`.
- `src/lib/api-response.ts` → `err(code, msg, status, details)` / `ok(data)` — used by **35 routes**. Shape: `{success, error: {code, message, details?}}` (nested).
- `src/lib/api-error-handler.ts` (U3) → `handleApiError` / `ApiError` — the new canonical 500/4xx normalizer.
- **Two parallel error shapes coexist** (flat vs nested). U5 must pick one and standardize validation errors onto it without breaking the 438-route flat contract.

### 5. High-risk routes (mutation + auth)
- `admin/announcements` — 10 field checks (best current practice).
- `auth/change-password` — 4 checks.
- `sysadmin/backup-maintenance-center` — 4 checks.
- `auth/login` — large body, per-field checks inline.
- **Pattern:** field-by-field `typeof`/`!body.x` checks repeated per route. No shared schema. No consistent 400-with-field-list response.

---

## Design decision: validation library

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Zod** | De-facto standard, `.safeParse()` → field errors, `.max()` for size, TS inference, zero runtime config | New dep (architectural) | **Recommended** — smallest, most compatible |
| Valibot | smaller, faster | less ecosystem, less familiar | viable alt |
| Hand-rolled | no dep | reinvents field-error collection; drifts per route | rejected |
| Superstruct/Yup | OK | heavier/older | rejected |

**This is an architectural decision (new dependency). Per the framework, it requires your explicit approval before implementation.** Default recommendation: **Zod** (single small dep, tree-shakes, no transitive runtime deps beyond itself).

---

## Proposed implementation (smallest compatible change)

### New files (2)
1. **`src/lib/validate-body.ts`** — shared validation layer:
   ```ts
   import { z, ZodError } from "zod";
   import { handleApiError, ApiError } from "@/lib/api-error-handler";

   // Parse a request body against a Zod schema. On failure, returns a
   // canonical U3-shaped 400 Response with the field-error list (no raw
   // schema internals). On success, returns the typed, refined value.
   export async function validateBody<T>(
     req: NextRequest,
     schema: z.ZodType<T>,
     ctx?: { route?: string }
   ): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
     let raw: unknown;
     try {
       raw = await req.json();
     } catch {
       // Malformed JSON → U3 canonical 400 (not a 500)
       return { ok: false, response: handleApiError(
         new ApiError("BAD_REQUEST", "Malformed JSON body.", 400), ctx) };
     }
     const parsed = schema.safeParse(raw);
     if (!parsed.success) {
       // Field errors only — never the schema or raw input
       const fields = parsed.error.issues.map(i => ({
         path: i.path.join("."),
         message: i.message,
       }));
       return { ok: false, response: handleApiError(
         new ApiError("VALIDATION_ERROR", "Validation failed.", 400, { fields }), ctx) };
     }
     return { ok: true, data: parsed.data };
   }

   // Request-size guard (413) — call before validateBody for routes with
   // large payloads (uploads, bulk import). Uses content-length + a hard cap.
   export function assertBodySize(req: NextRequest, maxBytes: number, ctx?: { route?: string })
     : NextResponse | null; // null = OK, else a 413 NextResponse
   ```
2. **`src/lib/schemas/*.ts`** — per-domain Zod schemas (auth, admin-mutation, sysadmin, …). One file per high-risk area, started with the top 5 routes.

### Modified files (5 high-risk routes, mechanical)
- `auth/login`, `auth/change-password`, `admin/announcements`, `sysadmin/backup-maintenance-center`, `bot/chat` — replace inline field checks with `validateBody(req, Schemas.login)`.
- **No change to** auth/RBAC/CSRF logic, success response bodies, or any other route (U7 "unified chain" territory).

### Error contract (U3-compatible)
- 400 malformed JSON → `{success:false, error:{code:"BAD_REQUEST", message:"Malformed JSON body."}}`
- 400 field validation → `{success:false, error:{code:"VALIDATION_ERROR", message:"Validation failed.", details:{fields:[{path,message}]}}}`
- 413 oversized → `{success:false, error:{code:"BAD_REQUEST", message:"Payload too large."}}` + `retry-after` not applicable.
- **All via the U3 `handleApiError` path** — no new response shape, no stack/SQL leakage.

### Request-size strategy
- `assertBodySize` reads `content-length` first (cheap, pre-stream); for chunked/streamed bodies without content-length, falls back to a `Readable` byte-counter that aborts at the cap. Default cap: **1 MB** for JSON APIs; **25 MB** for attachment/upload routes (matches existing `attachment-storage` 25 MB-ish behavior). Configurable per route.

---

## Exact scope (approve = proceed)
- Install **zod** (1 new dep) — *architectural, needs your OK*
- `src/lib/validate-body.ts` (validateBody + assertBodySize)
- `src/lib/schemas/` with 5 high-risk domain schemas
- 5 routes migrated to `validateBody` (mechanical, success bodies untouched)
- Tests: invalid payloads, missing fields, wrong types, oversized (413), malformed JSON (400), regression (valid payload still works + U3 shape preserved)
- Ledger update

**Out of scope:** all 495 routes (that's U7), new dep beyond zod, Caddy upgrade, auth/RBAC/CSRF changes, deployment.

## Open decisions for you
1. **Zod vs Valibot vs hand-rolled** — recommendation: Zod.
2. **Default JSON body cap** — recommendation: 1 MB JSON / 25 MB uploads.
3. **Field-error exposure** — `details.fields` is safe (our own schema messages, no raw input echoed). Confirm you want field paths in the 400 response (helps forms) vs a bare "Validation failed."

**STOP — audit only. No files modified. Awaiting your Stage-2 approval (library choice + caps) before implementing U5.**
