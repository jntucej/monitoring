// tests/unit/api-error-handler.test.ts
// U3: Shared API error normalization — unit tests.
// Tests: 400/401/403/404/409/429/500 classification, no-leak guarantees,
// pg error mapping, auth prefix handling, ApiError passthrough.

import { describe, it, expect } from "vitest";
import {
  ApiError,
  normalizeApiError,
  handleApiError,
  withApiErrorHandler,
} from "@/lib/api-error-handler";

describe("api-error-handler", () => {
  // ── 401 UNAUTHORIZED ──────────────────────────────────────────────────────
  it("maps 'UNAUTHORIZED: session expired' → 401 UNAUTHORIZED", () => {
    const { apiError } = normalizeApiError(new Error("UNAUTHORIZED: session expired"));
    expect(apiError.status).toBe(401);
    expect(apiError.code).toBe("unauthorized");
    expect(apiError.message).toBe("session expired");
  });

  // ── 403 FORBIDDEN ──────────────────────────────────────────────────────────
  it("maps 'FORBIDDEN: role mismatch' → 403 forbidden", () => {
    const { apiError } = normalizeApiError(new Error("FORBIDDEN: role mismatch"));
    expect(apiError.status).toBe(403);
    expect(apiError.code).toBe("forbidden");
  });

  it("maps 'ACCOUNT_INACTIVE: user disabled' → 403 account_inactive", () => {
    const { apiError } = normalizeApiError(new Error("ACCOUNT_INACTIVE: user disabled"));
    expect(apiError.status).toBe(403);
    expect(apiError.code).toBe("account_inactive");
  });

  // ── 404 NOT_FOUND (pg FK violation) ──────────────────────────────────────
  it("maps pg 23503 (FK violation) → 404 NOT_FOUND with safe message", () => {
    const pgErr = {
      code: "23503",
      severity: "ERROR",
      message: "insert or update on table \"x\" violates FK",
      detail: "Key (id)=(123) is not present in table \"y\"",
      hint: "Check the foreign key",
    };
    const { apiError, logPayload } = normalizeApiError(pgErr);
    expect(apiError.status).toBe(404);
    expect(apiError.code).toBe("NOT_FOUND");
    expect(apiError.message).toBe("Resource not found.");
    // Log payload must contain the detail (server-side only)
    expect(logPayload).toContain("Key (id)=(123)");
    // But apiError must NOT carry it
    expect(JSON.stringify(apiError)).not.toContain("123");
  });

  // ── 409 CONFLICT (pg unique violation) ───────────────────────────────────
  it("maps pg 23505 (unique violation) → 409 CONFLICT with safe message", () => {
    const pgErr = {
      code: "23505",
      severity: "ERROR",
      message: "duplicate key value violates unique constraint \"uq_x\"",
      detail: "Key (roll)=(ABC123) already exists",
    };
    const { apiError, logPayload } = normalizeApiError(pgErr);
    expect(apiError.status).toBe(409);
    expect(apiError.code).toBe("CONFLICT");
    expect(apiError.message).toBe("A conflicting record already exists.");
    expect(logPayload).toContain("ABC123");
  });

  // ── 400 VALIDATION_ERROR (pg check violation) ─────────────────────────────
  it("maps pg 23514 (check violation) → 400 VALIDATION_ERROR", () => {
    const pgErr = {
      code: "23514",
      severity: "ERROR",
      message: "new row violates check constraint \"ck_age_positive\"",
    };
    const { apiError } = normalizeApiError(pgErr);
    expect(apiError.status).toBe(400);
    expect(apiError.code).toBe("VALIDATION_ERROR");
  });

  // ── 429 RATE_LIMIT_EXCEEDED ──────────────────────────────────────────────
  it("passes through ApiError(429) unchanged", () => {
    const e = new ApiError("RATE_LIMIT_EXCEEDED", "Too many requests", 429);
    const { apiError } = normalizeApiError(e);
    expect(apiError.status).toBe(429);
    expect(apiError.code).toBe("RATE_LIMIT_EXCEEDED");
    expect(apiError.message).toBe("Too many requests");
  });

  // ── 500 INTERNAL_ERROR: no leak of pg detail ────────────────────────────
  it("unknown pg error → 500 INTERNAL_ERROR with generic message", () => {
    const pgErr = {
      code: "XX000",
      severity: "ERROR",
      message: "internal error: table \"secret_table\" does not exist",
      detail: "SQL: SELECT * FROM secret_table WHERE x='y' -- hint: check schema",
    };
    const { apiError, logPayload } = normalizeApiError(pgErr);
    expect(apiError.status).toBe(500);
    expect(apiError.code).toBe("INTERNAL_ERROR");
    expect(apiError.message).toBe("Internal error");
    // No leak in the client-facing ApiError
    const serialized = JSON.stringify(apiError);
    expect(serialized).not.toContain("secret_table");
    expect(serialized).not.toContain("SELECT * FROM");
    // But log payload (server-side) must have it
    expect(logPayload).toContain("secret_table");
  });

  // ── 500 INTERNAL_ERROR: no leak of generic Error ────────────────────────
  it("generic Error → 500 INTERNAL_ERROR, raw message stays in logPayload", () => {
    const { apiError, logPayload } = normalizeApiError(
      new Error("FATAL: password for user 'postgres' rejected at /var/lib/postgresql/data"),
      { route: "/api/test" }
    );
    expect(apiError.status).toBe(500);
    expect(apiError.message).toBe("Internal error");
    expect(JSON.stringify(apiError)).not.toContain("postgres");
    expect(logPayload).toContain("postgres");
    expect(logPayload).toContain("/api/test");
  });

  // ── 500 ApiError with details → details stripped ────────────────────────
  it("500-class ApiError with details → details removed, cause preserved in log", () => {
    const e = new ApiError("DB_ERROR", "raw sql detail here", 500, { sql: "SELECT 1" });
    const { apiError, logPayload } = normalizeApiError(e);
    expect(apiError.status).toBe(500);
    expect(apiError.message).toBe("Internal error");
    expect(apiError.details).toBeUndefined();
    expect(logPayload).toContain("raw sql detail here");
  });

  // ── JSON parse error → 400 ──────────────────────────────────────────────
  it("JSON parse error → 400 BAD_REQUEST", () => {
    const { apiError } = normalizeApiError(new SyntaxError("Unexpected token < in JSON at position 0"));
    expect(apiError.status).toBe(400);
    expect(apiError.code).toBe("BAD_REQUEST");
  });

  // ── handleApiError returns correct Response ──────────────────────────────
  it("handleApiError returns 404 NextResponse for pg FK violation", async () => {
    const pgErr = { code: "23503", severity: "ERROR", message: "fk violation" };
    const res = handleApiError(pgErr, { route: "/api/items/999" });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toBe("Resource not found.");
    expect(body.error.details).toBeUndefined();
  });

  it("handleApiError returns 500 with generic body for unknown error", async () => {
    const res = handleApiError(new Error("SECRET: api_key=abc123"), { route: "/api/x" });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toBe("Internal error");
    expect(JSON.stringify(body)).not.toContain("abc123");
  });

  // ── withApiErrorHandler wrapper ──────────────────────────────────────────
  it("withApiErrorHandler catches thrown error and returns canonical 500", async () => {
    const handler = async () => {
      throw new Error("boom: db password leaked");
    };
    const wrapped = withApiErrorHandler(handler, { route: "/api/test" });
    const res = await wrapped();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toBe("Internal error");
    expect(JSON.stringify(body)).not.toContain("db password leaked");
  });

  it("withApiErrorHandler passes success responses through untouched", async () => {
    const { NextResponse } = await import("next/server");
    const handler = async () => NextResponse.json({ success: true, data: { ok: 1 } });
    const wrapped = withApiErrorHandler(handler);
    const res = await wrapped();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ ok: 1 });
  });

  // ── 401 status preserved (not demoted to 500) ──────────────────────────
  it("auth 401 is never converted to 500", () => {
    const { apiError } = normalizeApiError(new Error("UNAUTHORIZED: invalid token"));
    expect(apiError.status).toBe(401);
    expect(apiError.status).not.toBe(500);
  });
});
