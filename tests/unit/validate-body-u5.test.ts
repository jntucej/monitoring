// tests/unit/validate-body-u5.test.ts
// U5: shared Zod body-validation layer + the five migrated routes.
//
// Coverage required by the U5 completion gate:
//   - malformed JSON        → 400 BAD_REQUEST
//   - missing fields        → 400 VALIDATION_ERROR (with details.fields)
//   - incorrect types       → 400 VALIDATION_ERROR
//   - oversized bodies      → 413 PAYLOAD_TOO_LARGE (streamed size, not just Content-Length)
//   - field-error sanitization (no raw input / passwords echoed)
//   - regression: valid payloads still pass, success contracts preserved
//   - route-level integration for all five routes

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { z } from "zod";

// ── mock the shared deps so routes don't hit the DB / LLM / redis ─────────
// query() must return { rows, rowCount } (node-postgres shape). withTransaction
// passes a client whose .query also returns { rows, rowCount }.
vi.mock("@/lib/postgres", () => {
  const query = vi.fn(async () => ({ rows: [], rowCount: 0 }));
  const client = { query };
  const db = {
    from: () => ({ select: () => ({ eq: () => ({ then: (r: any) => r({ data: [], error: null }) }) }) }),
  };
  return {
    query,
    poolQuery: vi.fn(async () => ({ rows: [] })),
    withTransaction: vi.fn(async (cb: any) => cb(client)),
    db,
    default: db,
  };
});
vi.mock("@/lib/db", () => ({
  addAudit: vi.fn(async () => ({ id: "audit-1" })),
  query: vi.fn(async () => ({ rows: [] })),
}));
vi.mock("@/lib/auth-token", () => ({
  signAccessToken: vi.fn(async () => "jwt-access"),
  signRefreshToken: vi.fn(async () => "jwt-refresh"),
  signPasswordResetToken: vi.fn(async () => "reset-token"),
  verifyPassword: vi.fn(async (_p: string, hash: string) => hash !== "DUMMY"),
  hashPassword: vi.fn(async (p: string) => "hash:" + p),
}));
vi.mock("@/lib/login-lockout", () => ({
  checkLockout: vi.fn(async () => ({ locked: false })),
  recordFailedAttempt: vi.fn(async () => {}),
  clearLockout: vi.fn(async () => {}),
}));
vi.mock("@/lib/csrf", () => ({ assertCsrf: vi.fn(() => null) }));
vi.mock("@/lib/deception", () => ({
  isHoneytokenIdentifier: vi.fn(() => false),
  triggerDeceptionAlert: vi.fn(async () => {}),
}));
vi.mock("@/lib/dpop", () => ({ verifyDPoPProof: vi.fn(async () => ({ valid: false })) }));
vi.mock("@/lib/privileged-alert", () => ({
  isPrivilegedRole: vi.fn(() => false),
  sendPrivilegedLoginAlert: vi.fn(async () => {}),
}));
vi.mock("@/lib/password-policy", () => ({
  passwordIsExpired: vi.fn(() => false),
  passwordAgeDays: vi.fn(() => 0),
  validatePassword: vi.fn(() => ({ valid: true, issues: [] })),
}));
vi.mock("@/lib/ip-allowlist", () => ({ ipAllowed: vi.fn(() => true) }));
vi.mock("@/lib/device-binding", () => ({
  newDeviceId: vi.fn(() => ({ raw: "device-1" })),
  deviceCookieOptions: vi.fn(() => ({ name: "device_id", value: "device-1" })),
}));
vi.mock("@/lib/cookies", () => ({ secureCookieOptions: vi.fn(() => ({})) }));
vi.mock("@/lib/rate-limit", () => ({
  withRateLimit: (h: any) => h,
  checkRateLimit: vi.fn(async () => ({ limited: false, remaining: 99, resetTime: new Date() })),
  extractClientIp: vi.fn(() => "127.0.0.1"),
}));
vi.mock("@/lib/rate-limit-policies", () => ({ Policies: { auth: {}, otp: {} } }));
vi.mock("@/lib/step-up", () => ({ assertFreshStepUp: vi.fn(async () => {}) }));
vi.mock("@/server/http/trusted-headers", () => ({ requireTrustedHeaders: vi.fn(() => null) }));
vi.mock("@/server/policy/roles", () => ({ TIER: { admin: 2, sysadmin: 3 } }));
vi.mock("@/lib/log", () => ({ log: { wrap: (_n: string, h: any) => h, error: vi.fn() }, getRequestId: vi.fn(() => "req-1") }));
vi.mock("@/middleware/authorization", () => ({
  withAuthorization: (h: any) => (req: any, ctx: any) => h(req, { auth: { userId: "u1", role: "admin", email: "a@x.org", userName: "Admin" }, ...ctx }),
  logAuditEvent: vi.fn(async () => {}),
}));
vi.mock("@/lib/rag/retriever", () => ({ retrieve: vi.fn(async () => ({ passages: [] })) }));
vi.mock("@/lib/rag/prompt", () => ({ buildPrompt: vi.fn((m: string) => ({ messages: [{ role: "user", content: m }], citations: [] }) as any) }));
vi.mock("@/lib/rag/guards", () => ({ sanitizeModelOutput: vi.fn((s: string) => s) }));
vi.mock("@/lib/rag/llm", () => ({ streamCompletion: vi.fn(async function* () {}) }));
vi.mock("@/lib/rag/translate", () => ({ translate: vi.fn(async (s: string) => s) }));
vi.mock("@/lib/kill-switch", () => ({ requireEnabled: vi.fn(async () => {}), KillSwitchDisabledError: class extends Error {} }));
vi.mock("@/lib/rag/config", () => ({ LANGS: {} }));
vi.mock("@/lib/sysadmin/permissions", () => ({
  ALLOWLISTED_SYSADMIN_ACTIONS: ["run_backup_now", "list_policies", "list_backups", "list_storage_inventory", "run_maintenance_now", "verify_latest_backup", "retry_failed_notifications", "refresh_infra_snapshot", "usb_discover", "usb_register", "usb_validate_mount", "usb_unmount", "backup_execute", "backup_verify", "restore_preview", "restore_execute"],
  hasSystemPermission: vi.fn(() => true),
  redactSensitiveFields: vi.fn((d: any) => d),
}));

import {
  validateBody,
  assertBodySize,
  DEFAULT_JSON_BODY_LIMIT_BYTES,
} from "@/lib/validate-body";

function jsonReq(obj: unknown, init?: RequestInit): NextRequest {
  const init2: RequestInit = { method: "POST", headers: { "content-type": "application/json" }, ...init };
  if (init?.body === undefined && obj !== undefined) {
    init2.body = JSON.stringify(obj);
  }
  return new NextRequest("http://localhost/api/test", init2 as any);
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. validateBody — utility-level behavior
// ═══════════════════════════════════════════════════════════════════════════
describe("validateBody", () => {
  const S = z.object({ email: z.string().email(), age: z.number() });

  it("passes a valid payload", async () => {
    const r = await validateBody(jsonReq({ email: "a@b.com", age: 30 }), S, { route: "/t" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.email).toBe("a@b.com");
  });

  it("returns 400 BAD_REQUEST for malformed JSON", async () => {
    const req = jsonReq(undefined, { body: "{not json" });
    const r = await validateBody(req, S, { route: "/t" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const body = await r.response.json() as any;
      expect(r.response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("BAD_REQUEST");
    }
  });

  it("returns 400 VALIDATION_ERROR with safe field paths (no raw input echoed)", async () => {
    const secret = "s3cret-password-value";
    const r = await validateBody(jsonReq({ email: "bad", age: "not-a-number", password: secret }), S, { route: "/t" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const body = await r.response.json() as any;
      expect(r.response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      const paths = (body.error.details.fields as any[]).map((f: any) => f.path);
      expect(paths).toContain("email");
      expect(paths).toContain("age");
      // Sanitization: the raw password value must NOT appear anywhere in the body.
      const serialized = JSON.stringify(body);
      expect(serialized).not.toContain(secret);
      // Field messages must be present (our own schema messages).
      expect((body.error.details.fields as any[]).every((f: any) => typeof f.message === "string" && f.message.length > 0)).toBe(true);
    }
  });

  it("reports wrong types (age as string → invalid_type)", async () => {
    const r = await validateBody(jsonReq({ email: "a@b.com", age: "thirty" }), S, { route: "/t" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const body = await r.response.json() as any;
      expect(body.error.details.fields.find((f: any) => f.path === "age")).toBeDefined();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. assertBodySize — actual streamed size, not just Content-Length
// ═══════════════════════════════════════════════════════════════════════════
describe("assertBodySize", () => {
  it("returns null when the streamed body is within the limit", async () => {
    const req = jsonReq({ x: 1 });
    const r = await assertBodySize(req, 1024, { route: "/t" });
    expect(r).toBeNull();
  });

  it("returns 413 when the ACTUAL streamed bytes exceed the cap (no Content-Length)", async () => {
    // Build a request WITHOUT a content-length header so the only signal is
    // the real byte count. Body is 4096 bytes; cap is 1024.
    const payload = new Uint8Array(4096).fill(65); // 4 KB of 'A'
    const req = new NextRequest("http://localhost/api/test", {
      method: "POST",
      body: payload,
    } as any);
    // Strip content-length if the constructor set it.
    req.headers.delete("content-length");
    const r = await assertBodySize(req, 1024, { route: "/t" });
    expect(r).not.toBeNull();
    if (r) {
      const body = await r.json() as any;
      expect(r.status).toBe(413);
      expect(body.error.code).toBe("PAYLOAD_TOO_LARGE");
      expect(body.error.details.limitBytes).toBe(1024);
    }
  });

  it("returns 413 fast-path when Content-Length alone exceeds the cap", async () => {
    const req = new NextRequest("http://localhost/api/test", {
      method: "POST",
      headers: { "content-length": String(DEFAULT_JSON_BODY_LIMIT_BYTES + 10) },
      body: "{}",
    } as any);
    // Explicit cap = default, so the lying Content-Length trips the fast path.
    const r = await assertBodySize(req, DEFAULT_JSON_BODY_LIMIT_BYTES, { route: "/t" });
    expect(r).not.toBeNull();
    if (r) expect(r.status).toBe(413);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. Route-level integration — all five migrated routes
// ═══════════════════════════════════════════════════════════════════════════
describe("route-level integration (5 routes)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- auth/login ---
  describe("POST /api/auth/login", () => {
    let POST: any;
    beforeAll(async () => {
      const mod = await import("@/app/api/auth/login/route");
      POST = mod.POST;
    });

    it("rejects missing password with VALIDATION_ERROR (no DB call)", async () => {
      const mockQuery = vi.mocked(await import("@/lib/postgres")).query;
      const req = jsonReq({ login: "admin", email: "a@x.org" }); // no password
      const res = await POST(req as any, {} as any);
      expect(res.status).toBe(400);
      const body = await res.json() as any;
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(mockQuery).not.toHaveBeenCalled(); // validation short-circuits before auth
    });

    it("rejects malformed JSON with BAD_REQUEST", async () => {
      const req = jsonReq(undefined, { body: "not json at all" });
      const res = await POST(req as any, {} as any);
      expect(res.status).toBe(400);
      expect((await res.json() as any).error.code).toBe("BAD_REQUEST");
    });

    it("accepts a valid login and issues tokens (success contract preserved)", async () => {
      const pg = vi.mocked(await import("@/lib/postgres"));
      pg.query.mockReset();
      // 1: user lookup (rows[0]); 2: mfa/passkey check (empty); 3: roles (empty);
      // 4: session INSERT (rowCount 1).
      pg.query
        .mockResolvedValueOnce({
          rows: [{
            id: "u1", email: "a@x.org", unique_id: "A1", role: "admin", status: "ACTIVE",
            password_hash: "real-hash", locked_until: null, mfa_required: false,
            session_version: 0, name: "A", last_password_change: new Date().toISOString(),
            allowed_cidrs: null, department_id: null, gate_id: null,
          }],
          rowCount: 1,
        } as any)
        .mockResolvedValue({ rows: [], rowCount: 0 } as any);
      const req = jsonReq({ login: "A1", password: "correct" });
      const res = await POST(req as any, {} as any);
      // verifyPassword("correct","real-hash") → true (mock). Expect 200 + tokens.
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.token).toBe("jwt-access");
      expect(body.data.refreshToken).toBe("jwt-refresh");
    });
  });

  // --- auth/change-password ---
  describe("POST /api/auth/change-password", () => {
    let POST: any;
    beforeAll(async () => {
      const mod = await import("@/app/api/auth/change-password/route");
      POST = mod.POST;
    });

    it("rejects missing current password with VALIDATION_ERROR", async () => {
      const req = jsonReq({ newPassword: "newpass123" });
      const res = await POST(req as any, {} as any);
      expect(res.status).toBe(400);
      expect((await res.json() as any).error.code).toBe("VALIDATION_ERROR");
    });

    it("accepts snake_case legacy keys (regression)", async () => {
      const pg = vi.mocked(await import("@/lib/postgres"));
      pg.query.mockReset();
      // change-password query sequence: user lookup (rows[0].password_hash),
      // then the UPDATE + session-invalidate + reset-token-invalidate writes.
      pg.query
        .mockResolvedValueOnce({ rows: [{ password_hash: "hash:cur" }], rowCount: 1 } as any) // lookup
        .mockResolvedValue({ rows: [], rowCount: 1 } as any); // the writes
      const auth = vi.mocked(await import("@/lib/auth-token")).verifyPassword;
      // verifyPassword("cur","hash:cur") — the mock returns hash!=="DUMMY" → true.
      auth.mockResolvedValueOnce(true);
      const req = jsonReq({ current_password: "cur", new_password: "newpass123" });
      const res = await POST(req as any, {} as any);
      expect(res.status).toBe(200);
      expect((await res.json() as any).success).toBe(true);
    });
  });

  // --- admin/announcements ---
  describe("POST /api/admin/announcements", () => {
    let POST: any;
    beforeAll(async () => {
      const mod = await import("@/app/api/admin/announcements/route");
      POST = mod.POST;
    });

    it("rejects missing title/message with VALIDATION_ERROR", async () => {
      const req = jsonReq({});
      const res = await POST(req as any, {} as any);
      expect(res.status).toBe(400);
      expect((await res.json() as any).error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects an over-long title (LIMITS.ANNOUNCEMENT_TITLE=200)", async () => {
      const req = jsonReq({ title: "x".repeat(201), message: "hello" });
      const res = await POST(req as any, {} as any);
      expect(res.status).toBe(400);
      expect((await res.json() as any).error.code).toBe("VALIDATION_ERROR");
    });

    it("accepts a valid announcement (201 success contract preserved)", async () => {
      const pg = vi.mocked(await import("@/lib/postgres"));
      // The INSERT goes through withTransaction's client.query (same mocked fn).
      pg.query.mockReset();
      pg.query.mockResolvedValue({ rows: [{ id: "ann-1", title: "T", message: "M", is_published: true }], rowCount: 1 } as any);
      const req = jsonReq({ title: "Welcome", message: "Hello campus", publishNow: true });
      const res = await POST(req as any, {} as any);
      expect(res.status).toBe(201);
      expect((await res.json() as any).success).toBe(true);
    });
  });

  // --- sysadmin/backup-maintenance-center ---
  describe("POST /api/sysadmin/backup-maintenance-center", () => {
    let POST: any;
    beforeAll(async () => {
      const mod = await import("@/app/api/sysadmin/backup-maintenance-center/route");
      POST = mod.POST;
    });

    it("rejects an unknown action with VALIDATION_ERROR", async () => {
      const req = jsonReq({ action: "drop_database" });
      const res = await POST(req as any, {} as any);
      expect(res.status).toBe(400);
      expect((await res.json() as any).error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects malformed JSON with BAD_REQUEST", async () => {
      const req = jsonReq(undefined, { body: "{bad" });
      const res = await POST(req as any, {} as any);
      expect(res.status).toBe(400);
      expect((await res.json() as any).error.code).toBe("BAD_REQUEST");
    });

    it("accepts a valid action (list_policies) — success contract preserved", async () => {
      const pg = vi.mocked(await import("@/lib/postgres"));
      // getCenterData runs 8 parallel queries; each returns a rows array.
      pg.query.mockReset();
      pg.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);
      const req = jsonReq({ action: "list_policies" });
      const res = await POST(req as any, {} as any);
      expect(res.status).toBe(200);
      expect((await res.json() as any).policies).toBeDefined();
    });
  });

  // --- bot/chat ---
  describe("POST /api/bot/chat", () => {
    let POST: any;
    beforeAll(async () => {
      const mod = await import("@/app/api/bot/chat/route");
      POST = mod.POST;
    });

    it("rejects a missing message with VALIDATION_ERROR", async () => {
      const req = jsonReq({});
      const res = await POST(req as any, {} as any);
      expect(res.status).toBe(400);
      expect((await res.json() as any).error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects an over-4000-char message with VALIDATION_ERROR", async () => {
      const req = jsonReq({ message: "x".repeat(4001) });
      const res = await POST(req as any, {} as any);
      expect(res.status).toBe(400);
      expect((await res.json() as any).error.code).toBe("VALIDATION_ERROR");
    });

    it("accepts a valid message and streams an SSE response (regression)", async () => {
      const pg = vi.mocked(await import("@/lib/postgres"));
      pg.query.mockReset();
      // bot/chat query sequence: bot_lang update (rows ok), conversation INSERT
      // (needs rows[0].id), history (rows), message INSERT, assistant INSERT.
      pg.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // UPDATE bot_lang
        .mockResolvedValueOnce({ rows: [{ id: "conv-1" }], rowCount: 1 } as any) // INSERT conv
        .mockResolvedValue({ rows: [], rowCount: 0 } as any); // history + message inserts
      const req = jsonReq({ message: "Where is gate 1?", lang: "en" });
      const res = await POST(req as any, {} as any);
      // The route returns a ReadableStream SSE Response on success.
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/event-stream");
    });
  });
});
