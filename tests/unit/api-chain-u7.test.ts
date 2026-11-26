import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// In-memory rate-limit bucket store for deterministic threshold & isolation tests
const buckets = new Map<string, { count: number; resetAt: number }>();

vi.mock("@/lib/postgres", () => ({
  query: vi.fn().mockResolvedValue({ rows: [] }),
  poolQuery: vi.fn().mockImplementation(async (_sql: string, params: unknown[]) => {
    const key = String(params?.[0] ?? "default");
    const windowMs = Number(params?.[1] ?? 60_000);
    const now = Date.now();
    const cur = buckets.get(key);
    if (!cur || cur.resetAt <= now) {
      const next = { count: 1, resetAt: now + windowMs };
      buckets.set(key, next);
      return { rows: [{ count: next.count, reset_at: new Date(next.resetAt).toISOString() }] };
    }
    cur.count += 1;
    return { rows: [{ count: cur.count, reset_at: new Date(cur.resetAt).toISOString() }] };
  }),
}));

const mockRequireAuthUser = vi.fn();
vi.mock("@/lib/authContext", () => ({
  requireAuthenticatedUser: (...args: unknown[]) => mockRequireAuthUser(...args),
  requirePermission: vi.fn().mockResolvedValue(undefined),
  validateResourceOperation: vi.fn().mockResolvedValue(undefined),
  getGateStudentInfo: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/auth-token", () => ({
  verifyAccessToken: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/device-binding", () => ({
  checkDeviceBinding: vi.fn().mockReturnValue("ok"),
}));

vi.mock("@/middleware/entityAuthorization", () => ({
  resolveEffectiveRole: vi.fn().mockResolvedValue({ delegationId: null }),
}));

import { withApiChain } from "@/lib/api-chain";

const TestSchema = z.object({
  title: z.string().min(1),
});

function makeReq(
  url: string,
  opts: { method?: string; headers?: Record<string, string>; body?: string } = {}
): NextRequest {
  return new NextRequest(url, {
    method: opts.method ?? "POST",
    headers: {
      "content-type": "application/json",
      ...(opts.headers ?? {}),
    },
    body: opts.body,
  });
}

describe("U7 — Unified Middleware/Security Chain (withApiChain)", () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let httpLogs: Array<Record<string, unknown>>;

  beforeEach(() => {
    buckets.clear();
    mockRequireAuthUser.mockReset();
    httpLogs = [];
    const capture = (chunk: unknown) => {
      const str = String(chunk).trim();
      if (str) {
        for (const line of str.split("\n")) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.event === "http.request") httpLogs.push(parsed);
          } catch {
            // ignore
          }
        }
      }
      return true;
    };
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(capture);
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(capture);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  it("rejects unauthenticated request with 401 and emits 1 http.request log", async () => {
    mockRequireAuthUser.mockRejectedValue(new Error("UNAUTHORIZED: Missing token"));
    const route = withApiChain(
      async (_req, { auth }) => NextResponse.json({ userId: auth.userId }),
      { route: "/api/u7/test", auth: "user" }
    );

    const res = await route(makeReq("http://localhost/api/u7/test", { body: "{}" }));
    expect(res.status).toBe(401);
    expect(httpLogs).toHaveLength(1);
    expect(httpLogs[0].status).toBe(401);
  });

  it("enforces RBAC: wrong role -> 403, valid role -> 200", async () => {
    const route = withApiChain(
      async (_req, { auth, body }) => NextResponse.json({ ok: true, role: auth.role, body }),
      { route: "/api/u7/admin", auth: "user", requiredRole: ["admin", "sysadmin"], bodySchema: TestSchema }
    );

    mockRequireAuthUser.mockResolvedValue({ userId: "u-stu", role: "student", isActive: true });
    const forbidden = await route(
      makeReq("http://localhost/api/u7/admin", {
        headers: { authorization: "Bearer tok", "sec-fetch-site": "same-origin" },
        body: JSON.stringify({ title: "hi" }),
      })
    );
    expect(forbidden.status).toBe(403);

    mockRequireAuthUser.mockResolvedValue({ userId: "u-adm", role: "admin", isActive: true });
    const okRes = await route(
      makeReq("http://localhost/api/u7/admin", {
        headers: { authorization: "Bearer tok", "sec-fetch-site": "same-origin" },
        body: JSON.stringify({ title: "hi" }),
      })
    );
    expect(okRes.status).toBe(200);
    const json = await okRes.json();
    expect(json).toEqual({ ok: true, role: "admin", body: { title: "hi" } });
    expect(okRes.headers.get("x-auth-user-id")).toBeNull();
    expect(okRes.headers.get("x-u6-logged")).toBeNull();
    expect(httpLogs).toHaveLength(2);
  });

  it("enforces CSRF on authenticated mutations", async () => {
    mockRequireAuthUser.mockResolvedValue({ userId: "u-1", role: "admin", isActive: true });
    const route = withApiChain(
      async () => NextResponse.json({ ok: true }),
      { route: "/api/u7/csrf", auth: "user", csrf: true }
    );

    const res = await route(
      makeReq("http://localhost/api/u7/csrf", {
        headers: { authorization: "Bearer tok", "sec-fetch-site": "cross-site" },
        body: "{}",
      })
    );
    expect(res.status).toBe(403);
    expect(httpLogs).toHaveLength(1);
  });

  it("isolates authenticated rate-limit buckets per user behind the same IP (fixes 45-route bug class)", async () => {
    const route = withApiChain(
      async (_req, { auth }) => NextResponse.json({ userId: auth.userId }),
      {
        route: "/api/u7/user-rl",
        auth: "user",
        csrf: false,
        rateLimit: { keyPrefix: "u7_user_rl", maxRequests: 2, windowMs: 60_000 },
      }
    );

    const sharedIpHeaders = { authorization: "Bearer tok", "x-client-ip": "203.0.113.10" };

    // User A hits limit (2 allowed, 3rd -> 429)
    mockRequireAuthUser.mockResolvedValue({ userId: "user-A", role: "student", isActive: true });
    expect((await route(makeReq("http://localhost/api/u7/user-rl", { headers: sharedIpHeaders, body: "{}" }))).status).toBe(200);
    expect((await route(makeReq("http://localhost/api/u7/user-rl", { headers: sharedIpHeaders, body: "{}" }))).status).toBe(200);
    expect((await route(makeReq("http://localhost/api/u7/user-rl", { headers: sharedIpHeaders, body: "{}" }))).status).toBe(429);

    // User B behind the EXACT SAME IP still has a fresh bucket -> 200!
    mockRequireAuthUser.mockResolvedValue({ userId: "user-B", role: "student", isActive: true });
    const userBRes = await route(makeReq("http://localhost/api/u7/user-rl", { headers: sharedIpHeaders, body: "{}" }));
    expect(userBRes.status).toBe(200);
    expect(httpLogs).toHaveLength(4);
  });

  it("uses IP-scoped bucket for anonymous/public routes (auth: 'none')", async () => {
    const route = withApiChain(
      async () => NextResponse.json({ ok: true }),
      {
        route: "/api/u7/public-rl",
        auth: "none",
        rateLimit: { keyPrefix: "u7_pub_rl", maxRequests: 1, windowMs: 60_000 },
      }
    );

    const headers = { "x-client-ip": "198.51.100.7" };
    expect((await route(makeReq("http://localhost/api/u7/public-rl", { headers, body: "{}" }))).status).toBe(200);
    expect((await route(makeReq("http://localhost/api/u7/public-rl", { headers, body: "{}" }))).status).toBe(429);
    expect(httpLogs).toHaveLength(2);
    expect(httpLogs[1].error_code).toBe("RATE_LIMIT_EXCEEDED");
  });

  it("handles malformed JSON (400), Zod validation failure (400), 413 oversize, and handler 500 via U3", async () => {
    mockRequireAuthUser.mockResolvedValue({ userId: "u-1", role: "admin", isActive: true });
    const route = withApiChain(
      async (_req, { body }) => {
        if (body.title === "boom") throw new Error("SELECT secret FROM pg_shadow");
        return NextResponse.json({ ok: true });
      },
      {
        route: "/api/u7/val",
        auth: "user",
        csrf: false,
        rateLimit: false,
        bodySchema: TestSchema,
        maxBodyBytes: 64,
      }
    );

    const h = { authorization: "Bearer tok" };

    // Malformed JSON -> 400 BAD_REQUEST
    const badJson = await route(makeReq("http://localhost/api/u7/val", { headers: h, body: "{bad" }));
    expect(badJson.status).toBe(400);
    expect((await badJson.json()).error.code).toBe("BAD_REQUEST");

    // Validation failure -> 400 VALIDATION_ERROR
    const badSchema = await route(makeReq("http://localhost/api/u7/val", { headers: h, body: JSON.stringify({ title: "" }) }));
    expect(badSchema.status).toBe(400);
    expect((await badSchema.json()).error.code).toBe("VALIDATION_ERROR");

    // Oversize -> 413 PAYLOAD_TOO_LARGE
    const oversize = await route(makeReq("http://localhost/api/u7/val", { headers: h, body: JSON.stringify({ title: "x".repeat(100) }) }));
    expect(oversize.status).toBe(413);
    expect((await oversize.json()).error.code).toBe("PAYLOAD_TOO_LARGE");

    // Handler 500 -> canonical U3 INTERNAL_ERROR (no SQL leaked)
    const err500 = await route(makeReq("http://localhost/api/u7/val", { headers: h, body: JSON.stringify({ title: "boom" }) }));
    expect(err500.status).toBe(500);
    const errBody = await err500.json();
    expect(errBody).toEqual({ success: false, error: { code: "INTERNAL_ERROR", message: "Internal error" } });
    expect(httpLogs).toHaveLength(4);
  });
});
